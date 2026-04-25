import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

/** Epic 4 / US 4.1 — sanitise client-supplied marketing attribution. */
const ALLOWED_ATTR_KEYS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'landing_path', 'referrer', 'first_seen_at',
])
function sanitizeAttribution(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object') return null
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALLOWED_ATTR_KEYS.has(k)) continue
    if (typeof v !== 'string' || v.trim() === '') continue
    out[k] = v.length > 500 ? v.slice(0, 500) : v
  }
  return Object.keys(out).length > 0 ? out : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Parse and validate input
  let name: string, email: string, company: string | null, message: string | null, subscribed_to_marketing: boolean
  let attribution: Record<string, string> | null = null
  try {
    const body = await req.json()
    name = typeof body.name === 'string' ? body.name.trim() : ''
    email = typeof body.email === 'string' ? body.email.trim() : ''
    company = typeof body.company === 'string' && body.company.trim() ? body.company.trim() : null
    message = typeof body.message === 'string' && body.message.trim() ? body.message.trim() : null
    subscribed_to_marketing = body.subscribed_to_marketing === true
    // Epic 4 / US 4.1 — first-touch marketing attribution from localStorage.
    attribution = sanitizeAttribution(body.attribution)
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate required fields
  if (!name || name.length > 200) {
    return new Response(
      JSON.stringify({ error: 'Name is required and must be under 200 characters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email) || email.length > 320) {
    return new Response(
      JSON.stringify({ error: 'A valid email address is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (company && company.length > 200) {
    return new Response(
      JSON.stringify({ error: 'Company must be under 200 characters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (message && message.length > 5000) {
    return new Response(
      JSON.stringify({ error: 'Message must be under 5000 characters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Rate limit: max 5 submissions from the same email in the last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', tenMinutesAgo)

  if (countError) {
    console.error('Rate limit check failed', countError)
  } else if (count !== null && count >= 5) {
    return new Response(
      JSON.stringify({ error: 'Too many submissions. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Insert contact
  const id = crypto.randomUUID()
  const { error } = await supabase.from('contacts').insert({
    id,
    name,
    email,
    company,
    message,
    subscribed_to_marketing,
    attribution,
  })

  if (error) {
    console.error('Contact insert failed', error)
    return new Response(
      JSON.stringify({ error: 'Failed to save contact' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Send notification email (best-effort, don't fail the request)
  try {
    const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'contact-notification',
        recipientEmail: email,
        idempotencyKey: `contact-notify-${id}`,
        templateData: { name, email, company: company || undefined, message: message || undefined },
      },
    })
    if (emailError) {
      console.error('Email notification failed:', emailError)
    }
  } catch (e) {
    console.error('Email notification error:', e)
  }

  // Epic 4 / US 4.2 — Fire-and-forget AI enrichment webhook (LinkedIn /
  // company enrichment). Must NOT block the user response. We use
  // EdgeRuntime.waitUntil so Deno keeps the request alive after the
  // 200 has been flushed to the client.
  const enrichmentUrl = Deno.env.get('LEAD_ENRICHMENT_WEBHOOK_URL')
  if (enrichmentUrl) {
    const enrichmentPayload = {
      source: 'submit-contact',
      lead_id: id,
      email,
      name,
      company,
      message,
      attribution,
      submitted_at: new Date().toISOString(),
    }
    const enrichmentTask = fetch(enrichmentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichmentPayload),
      // 8s safety cap so a hung webhook can never leak workers forever.
      signal: AbortSignal.timeout(8000),
    })
      .then(async (r) => {
        if (!r.ok) {
          const txt = await r.text().catch(() => '')
          console.error(`Enrichment webhook non-OK [${r.status}]:`, txt.slice(0, 500))
        }
      })
      .catch((err) => {
        console.error('Enrichment webhook failed (non-fatal):', err)
      })
    try {
      // @ts-ignore - EdgeRuntime is provided by the Supabase Edge runtime.
      EdgeRuntime.waitUntil(enrichmentTask)
    } catch {
      // EdgeRuntime not available (e.g. local dev); the promise still runs,
      // we just don't get the lifecycle guarantee. Intentionally not awaited.
    }
  }

  return new Response(
    JSON.stringify({ success: true, id }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
