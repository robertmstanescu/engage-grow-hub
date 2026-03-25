import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  try {
    const body = await req.json()
    name = typeof body.name === 'string' ? body.name.trim() : ''
    email = typeof body.email === 'string' ? body.email.trim() : ''
    company = typeof body.company === 'string' && body.company.trim() ? body.company.trim() : null
    message = typeof body.message === 'string' && body.message.trim() ? body.message.trim() : null
    subscribed_to_marketing = body.subscribed_to_marketing === true
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

  return new Response(
    JSON.stringify({ success: true, id }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
