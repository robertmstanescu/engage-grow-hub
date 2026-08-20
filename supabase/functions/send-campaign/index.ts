import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { blocksToHtml } from "../_shared/emailBlocks.ts";

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
