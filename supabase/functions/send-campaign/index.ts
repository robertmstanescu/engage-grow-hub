import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_NAME = "The Magic Coffin";
const SENDER_DOMAIN = "notify.themagiccoffin.com";
const FROM_DOMAIN = "themagiccoffin.com";

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

    // Verify caller is an admin
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
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

    // Parse blocks to generate HTML
    let htmlContent = campaign.html_content;
    try {
      const blocks = JSON.parse(campaign.html_content);
      if (Array.isArray(blocks)) {
        // Generate HTML from blocks (same logic as client-side blocksToHtml)
        htmlContent = blocksToHtml(blocks);
      }
    } catch {
      // Already HTML, use as-is
    }

    console.log(`Sending campaign to ${subscribers.length} subscribers`);

    // Check suppressed emails
    const { data: suppressedEmails } = await supabase
      .from('suppressed_emails')
      .select('email');
    const suppressedSet = new Set((suppressedEmails || []).map(s => s.email.toLowerCase()));

    let sentCount = 0;
    for (const subscriber of subscribers) {
      if (suppressedSet.has(subscriber.email.toLowerCase())) continue;

      const messageId = crypto.randomUUID();
      const idempotencyKey = `campaign-${campaignId}-${subscriber.email}`;

      // Log pending
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: `campaign-${campaignId}`,
        recipient_email: subscriber.email,
        status: 'pending',
      });

      // Enqueue via transactional queue
      await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: messageId,
          to: subscriber.email,
          from: `${SITE_NAME} <hello@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: campaign.subject,
          html: htmlContent,
          text: campaign.subject,
          purpose: 'transactional',
          label: `campaign-${campaignId}`,
          idempotency_key: idempotencyKey,
          queued_at: new Date().toISOString(),
        },
      });

      sentCount++;
    }

    // Mark campaign as sent
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: sentCount,
      })
      .eq('id', campaignId);

    return new Response(
      JSON.stringify({ success: true, recipientCount: sentCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Minimal block-to-HTML converter (mirrors client-side email-blocks.ts)
function blocksToHtml(blocks: any[]): string {
  const rows = blocks.map((b: any) => {
    const s = b.settings || {};
    switch (b.type) {
      case "hero": {
        const bgImage = s.backgroundImage
          ? `background-image:linear-gradient(rgba(0,0,0,${s.gradientOpacity ?? 0.65}),rgba(0,0,0,${s.gradientOpacity ?? 0.65})),url(${s.backgroundImage});background-size:cover;background-position:center;`
          : "";
        return `<tr><td style="background-color:${s.backgroundColor || '#2A0E33'};${bgImage}color:${s.textColor || '#F4F0EC'};padding:${s.padding || '60px 40px'};text-align:${s.alignment || 'center'};font-family:'Unbounded',Arial,sans-serif;font-size:28px;font-weight:900;">${b.content}</td></tr>`;
      }
      case "text":
        return `<tr><td style="background-color:${s.backgroundColor || '#ffffff'};color:${s.textColor || '#1B1F24'};padding:${s.padding || '30px 40px'};font-family:'Bricolage Grotesque',Arial,sans-serif;font-size:15px;line-height:1.6;text-align:${s.alignment || 'left'};">${b.content}</td></tr>`;
      case "button":
        return `<tr><td style="background-color:${s.backgroundColor || '#ffffff'};padding:${s.padding || '20px 40px'};text-align:${s.alignment || 'center'};"><a href="${s.buttonUrl || '#'}" style="display:inline-block;background-color:${s.buttonBg || '#4D1B5E'};color:${s.buttonColor || '#F9F0C1'};padding:14px 32px;text-decoration:none;border-radius:50px;font-family:'Unbounded',Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${s.buttonText || 'Click Here'}</a></td></tr>`;
      case "image":
        return `<tr><td style="background-color:${s.backgroundColor || '#ffffff'};padding:${s.padding || '20px 40px'};text-align:${s.alignment || 'center'};"><img src="${b.content}" style="max-width:100%;height:auto;" /></td></tr>`;
      case "divider":
        return `<tr><td style="background-color:${s.backgroundColor || '#ffffff'};padding:${s.padding || '10px 40px'};"><hr style="border:none;border-top:1px solid ${s.textColor || '#E5C54F'};margin:0;" /></td></tr>`;
      default:
        return "";
    }
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#F4F0EC;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">${rows}</table></body></html>`;
}
