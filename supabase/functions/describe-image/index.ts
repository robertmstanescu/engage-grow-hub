/**
 * Edge Function: describe-image
 * ──────────────────────────────────────────────────────────────────────────
 * Looks at a picture and writes its alt text, so no picture reaches a
 * page without a description. Same Gemini model and Lovable AI gateway
 * as generate-ai-summary; the picture arrives either as a public URL
 * (an asset already in the Media library) or as a small data URL (a file
 * that is about to upload, downscaled in the browser first).
 *
 * Returns { alt, description }: `alt` is what a screen reader says
 * (≤ 100 characters, no "image of"), `description` is one fuller
 * sentence for the Media details panel.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_DATA_URL = 1_600_000; // ~1.2 MB of picture as base64: plenty for a 1024px preview

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured on this project." }, 500);
  try {
    const { imageUrl = "", context = "" } = await req.json();
    const url = String(imageUrl || "");
    if (!url) return json({ error: "No picture given." }, 400);
    if (url.startsWith("data:")) {
      if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(url)) return json({ error: "Unsupported picture format." }, 400);
      if (url.length > MAX_DATA_URL) return json({ error: "Picture preview too large." }, 413);
    } else if (!/^https:\/\//i.test(url)) {
      return json({ error: "Picture must be an https address." }, 400);
    }
    const hint = String(context || "").slice(0, 300);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You write alt text for pictures on a consultancy website (people, communications, workplaces). " +
              "Reply with exactly two lines. Line 1: ALT: a description a screen reader would say, at most 100 characters, " +
              "plain and concrete, no 'image of' or 'photo of', no quotes, no trailing full stop if it saves space. " +
              "Line 2: DESCRIPTION: one fuller sentence (max 200 characters) describing the scene, mood and any text in the picture. " +
              "If the picture is decorative or abstract, still describe what is visible. No markdown.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: hint ? `Context: ${hint}` : "Describe this picture." },
              { type: "image_url", image_url: { url } },
            ],
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
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const altMatch = raw.match(/ALT:\s*(.+)/i);
    const descMatch = raw.match(/DESCRIPTION:\s*(.+)/i);
    let alt = (altMatch?.[1] ?? raw.split("\n")[0] ?? "").replace(/^["'\s]+|["'\s]+$/g, "").replace(/\s+/g, " ").trim();
    alt = alt.replace(/^(an?\s+)?(image|photo|picture|photograph)\s+of\s+/i, "");
    if (alt.length > 100) alt = alt.slice(0, 97).replace(/\s+\S*$/, "") + "…";
    const description = (descMatch?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
    if (!alt) return json({ error: "The AI returned nothing — try again." }, 502);
    return json({ alt, description });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
