/**
 * generate-ai-summary — AEO helper.
 *
 * Takes a page/post title + body text and returns a 60-320 character
 * summary written for AI assistants (ChatGPT, Claude, Perplexity).
 * Uses the Lovable AI Gateway (no user API key required).
 *
 * Auth: verify_jwt defaults to true, so only signed-in admins can call it.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured on this project." }, 500);

  try {
    const { title = "", content = "", kind = "page" } = await req.json();
    const body = String(content || "").slice(0, 12000);
    if (!title && !body) return json({ error: "Nothing to summarise yet — add a title or content first." }, 400);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You write AEO summaries that are fed to AI assistants (ChatGPT, Claude, Perplexity) through an llms.txt manifest. " +
              "Write ONE plain-language summary of the given content, between 60 and 320 characters (hard limits), 1-3 sentences. " +
              "Be concrete and specific: who it is for, what it covers, what outcome it delivers. No marketing fluff, no quotes, " +
              "no markdown, no prefix like 'Summary:'. Output only the summary text.",
          },
          {
            role: "user",
            content: `Content type: ${kind}\nTitle: ${title}\n\nBody:\n${body}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) return json({ error: "AI is rate limited right now — try again in a moment." }, 429);
      if (res.status === 402) return json({ error: "AI credits are exhausted. Add credits to continue." }, 402);
      return json({ error: `AI request failed (${res.status}): ${text.slice(0, 300)}` }, res.status);
    }

    const data = await res.json();
    let summary: string = data?.choices?.[0]?.message?.content ?? "";
    summary = summary.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\s+/g, " ").trim();
    if (summary.length > 320) {
      const cut = summary.slice(0, 320);
      const lastStop = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
      summary = lastStop > 60 ? cut.slice(0, lastStop + 1) : cut.trimEnd();
    }
    if (!summary) return json({ error: "The AI returned an empty summary — try again." }, 502);

    return json({ summary });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
