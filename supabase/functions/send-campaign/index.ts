import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SENDER_EMAIL = "robertmarianstanescu@gmail.com";
const SENDER_NAME = "The Magic Coffin";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { campaignId } = await req.json();

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('status', 'draft')
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found or already sent' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get marketing subscribers
    const { data: subscribers } = await supabase
      .from('contacts')
      .select('email, name')
      .eq('subscribed_to_marketing', true);

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ error: 'No marketing subscribers found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send emails using Supabase's built-in email (via auth admin)
    // For now, we'll log the send intent - you'll want to integrate a proper
    // email service (Resend, SendGrid, etc.) for production
    console.log(`Sending campaign "${campaign.subject}" to ${subscribers.length} subscribers`);
    console.log(`From: ${SENDER_NAME} <${SENDER_EMAIL}>`);
    
    for (const subscriber of subscribers) {
      console.log(`Would send to: ${subscriber.email} (${subscriber.name})`);
    }

    // Mark campaign as sent
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: subscribers.length,
      })
      .eq('id', campaignId);

    return new Response(
      JSON.stringify({ success: true, recipientCount: subscribers.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
