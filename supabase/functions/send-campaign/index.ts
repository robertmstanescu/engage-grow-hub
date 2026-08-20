import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_NAME = "The Magic Coffin";
const SENDER_DOMAIN = "notify.themagiccoffin.com";
const FROM_DOMAIN = "themagiccoffin.com";

const CONTACTS_PAGE_SIZE = 500;
const SEND_BATCH_SIZE = 50;

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Looks up/creates unsubscribe tokens for a whole batch of emails in a
// constant number of queries, instead of 2-3 sequential queries per email.
async function getOrCreateUnsubscribeTokensBatch(
  supabase: ReturnType<typeof createClient>,
  emails: string[],
): Promise<Map<string, string>> {
  const normalizedEmails = Array.from(new Set(emails.map((email) => email.toLowerCase())));
  const tokenMap = new Map<string, string>();
  if (normalizedEmails.length === 0) return tokenMap;

  const { data: existingTokens, error: lookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('email, token, used_at')
    .in('email', normalizedEmails);

  if (lookupError) {
    throw new Error(`Failed to look up unsubscribe tokens: ${lookupError.message}`);
  }

  const haveValidToken = new Set<string>();
  for (const row of existingTokens || []) {
    if (row.token && !row.used_at) {
      tokenMap.set(row.email, row.token);
      haveValidToken.add(row.email);
    }
  }

  const missingEmails = normalizedEmails.filter((email) => !haveValidToken.has(email));
  if (missingEmails.length === 0) return tokenMap;

  const newRows = missingEmails.map((email) => ({ email, token: generateToken() }));
  const { data: upserted, error: upsertError } = await supabase
    .from('email_unsubscribe_tokens')
    .upsert(newRows, { onConflict: 'email' })
    .select('email, token');

  if (upsertError) {
    throw new Error(`Failed to store unsubscribe tokens: ${upsertError.message}`);
  }

  for (const row of upserted || []) {
    tokenMap.set(row.email, row.token);
  }

  return tokenMap;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const subscribers: { email: string; name: string | null }[] = [];
    for (let from = 0; ; from += CONTACTS_PAGE_SIZE) {
      const { data: page, error: pageError } = await supabase
        .from('contacts')
        .select('email, name')
        .eq('subscribed_to_marketing', true)
        .range(from, from + CONTACTS_PAGE_SIZE - 1);

      if (pageError) {
        throw new Error(`Failed to fetch contacts: ${pageError.message}`);
      }
      if (!page || page.length === 0) break;

      subscribers.push(...page);
      if (page.length < CONTACTS_PAGE_SIZE) break;
    }

    const uniqueSubscribers = Array.from(
      new Map(subscribers.map((subscriber) => [subscriber.email.toLowerCase(), subscriber])).values()
    );

    if (uniqueSubscribers.length === 0) {
      return new Response(JSON.stringify({ error: 'No marketing subscribers found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let htmlContent = campaign.html_content;
    try {
      const blocks = JSON.parse(campaign.html_content);
      if (Array.isArray(blocks)) {
        htmlContent = blocksToHtml(blocks);
      }
    } catch {
    }

    console.log(`Sending campaign to ${uniqueSubscribers.length} subscribers`);

    const { data: suppressedEmails } = await supabase
      .from('suppressed_emails')
      .select('email');
    const suppressedSet = new Set((suppressedEmails || []).map((s) => s.email.toLowerCase()));

    let sentCount = 0;
    const sendableSubscribers = uniqueSubscribers.filter(
      (subscriber) => !suppressedSet.has(subscriber.email.toLowerCase())
    );

    for (let i = 0; i < sendableSubscribers.length; i += SEND_BATCH_SIZE) {
      const batch = sendableSubscribers.slice(i, i + SEND_BATCH_SIZE);
      const emails = batch.map((s) => s.email.toLowerCase());

      const tokenMap = await getOrCreateUnsubscribeTokensBatch(supabase, emails);
      const messageIds = batch.map(() => crypto.randomUUID());
      const queuedAt = new Date().toISOString();

      const logRows = batch.map((subscriber, idx) => ({
        message_id: messageIds[idx],
        template_name: `campaign-${campaignId}`,
        recipient_email: subscriber.email,
        status: 'pending',
      }));

      const { error: logInsertError } = await supabase.from('email_send_log').insert(logRows);
      if (logInsertError) {
        console.error('Failed to insert send log batch:', logInsertError.message);
      }

      const results = await Promise.all(
        batch.map((subscriber, idx) => {
          const normalizedEmail = subscriber.email.toLowerCase();
          const idempotencyKey = `campaign-${campaignId}-${normalizedEmail}`;

          return supabase.rpc('enqueue_email', {
            queue_name: 'transactional_emails',
            payload: {
              message_id: messageIds[idx],
              to: subscriber.email,
              from: `${SITE_NAME} <hello@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject: campaign.subject,
              html: htmlContent,
              text: campaign.subject,
              purpose: 'transactional',
              label: `campaign-${campaignId}`,
              idempotency_key: idempotencyKey,
              unsubscribe_token: tokenMap.get(normalizedEmail),
              queued_at: queuedAt,
            },
          });
        })
      );

      sentCount += results.filter((r) => !r.error).length;
    }

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
