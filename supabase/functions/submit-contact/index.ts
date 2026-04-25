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

/**
 * Epic 4 / US 4.4 — Zero-Party Data progressive profiling.
 * See submit-lead/index.ts for the full rationale; rules duplicated
 * here intentionally because edge functions cannot share modules.
 *   • Top-level: max 50 keys
 *   • Key:       string, 1–64 chars, alphanumeric / `_-.` only
 *   • Value:     string | number | boolean | null | string[]
 *                  - string capped at 1000 chars
 *                  - array capped at 50 entries, each entry capped at 200 chars
 */
const ZPD_KEY_REGEX = /^[A-Za-z0-9_.-]{1,64}$/
function sanitizeZeroPartyData(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, unknown> = {}
  let kept = 0
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (kept >= 50) break
    if (!ZPD_KEY_REGEX.test(k)) continue
    if (v === null) { out[k] = null; kept++; continue }
    if (typeof v === 'boolean' || typeof v === 'number') {
      if (typeof v === 'number' && !Number.isFinite(v)) continue
      out[k] = v; kept++; continue
    }
    if (typeof v === 'string') {
      out[k] = v.length > 1000 ? v.slice(0, 1000) : v
      kept++; continue
    }
    if (Array.isArray(v)) {
      const arr: string[] = []
      for (const item of v) {
        if (arr.length >= 50) break
        if (typeof item !== 'string') continue
        arr.push(item.length > 200 ? item.slice(0, 200) : item)
      }
      out[k] = arr; kept++; continue
    }
  }
  return Object.keys(out).length > 0 ? out : null
}

/**
 * Deep-merge two plain objects. `incoming` wins on conflicts so the
 * latest answer overwrites a stale one. Arrays are replaced wholesale.
 */
function deepMergeJson(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const base: Record<string, unknown> = existing && typeof existing === 'object' && !Array.isArray(existing)
    ? { ...existing } : {}
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return base
  for (const [k, v] of Object.entries(incoming)) {
    const prev = base[k]
    if (
      v && typeof v === 'object' && !Array.isArray(v) &&
      prev && typeof prev === 'object' && !Array.isArray(prev)
    ) {
      base[k] = deepMergeJson(prev as Record<string, unknown>, v as Record<string, unknown>)
    } else {
      base[k] = v
    }
  }
  return base
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
  // Epic 4 / US 4.4 — Zero-Party Data from quizzes / ROI calculators.
  let customProps: Record<string, unknown> | null = null
  try {
    const body = await req.json()
    name = typeof body.name === 'string' ? body.name.trim() : ''
    email = typeof body.email === 'string' ? body.email.trim() : ''
    company = typeof body.company === 'string' && body.company.trim() ? body.company.trim() : null
    message = typeof body.message === 'string' && body.message.trim() ? body.message.trim() : null
    subscribed_to_marketing = body.subscribed_to_marketing === true
    // Epic 4 / US 4.1 — first-touch marketing attribution from localStorage.
    attribution = sanitizeAttribution(body.attribution)
    customProps = sanitizeZeroPartyData(body.custom_properties)
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

  // Epic 4 / US 4.4 — Look up the most-recent prior contact row for this
  // email so we can carry forward the accumulated zero-party profile.
  // Unlike `leads` (which upserts by email), `contacts` is append-only,
  // so each new submission needs to read-then-merge to avoid losing
  // answers gathered on previous visits.
  let priorZeroParty: Record<string, unknown> | null = null
  if (customProps) {
    const { data: prior } = await supabase
      .from('contacts')
      .select('zero_party_data')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    priorZeroParty = (prior?.zero_party_data as Record<string, unknown> | null | undefined) ?? null
  }
  const mergedZeroParty = deepMergeJson(priorZeroParty, customProps)

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
    // Default to {} (matches the column default) when nothing was sent
    // and there's no prior profile to carry forward.
    zero_party_data: Object.keys(mergedZeroParty).length > 0 ? mergedZeroParty : {},
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
