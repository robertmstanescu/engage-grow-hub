/**
 * generate-seo-suggestions — one-shot SEO/AEO assistant.
 *
 * Takes a title + plain-text body (plus optional image list and known
 * tag vocabulary) and returns SUGGESTIONS the admin reviews before they
 * are saved:
 *
 *   { meta_title, meta_description, ai_summary, tags[], image_alts[] }
 *
 * Nothing is written to the database here — the client shows an
 * accept/reject panel and only persists what the admin keeps.
 *
 * Model: google/gemini-2.5-flash-lite via the Lovable AI Gateway.
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

interface ImageInput {
  /** Stable key so the client can map the suggestion back to the field. */
  key: string;
  url?: string;
  /** Where the image sits (e.g. "cover image", "row 3 image"). */
  context?: string;
  /** Existing alt text, if any. */
  current?: string;
}

const SUGGESTION_TOOL = {
  type: "function",
  function: {
    name: "emit_seo_suggestions",
    description: "Return SEO and AEO suggestions for the supplied content.",
    parameters: {
      type: "object",
      properties: {
        meta_title: { type: "string", description: "Search result title, max 60 characters, includes the main keyword." },
        meta_description: { type: "string", description: "SERP snippet, 120-158 characters, concrete and benefit-led." },
        ai_summary: { type: "string", description: "Plain-language summary for AI assistants, 60-320 characters." },
        tags: {
          type: "array",
          description: "3-6 short topical tags (1-3 words each, Title Case).",
          items: { type: "string" },
        },
        image_alts: {
          type: "array",
          description: "Alt text for each supplied image, max 100 characters each.",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              alt: { type: "string" },
            },
            required: ["key", "alt"],
          },
        },
      },
      required: ["meta_title", "meta_description", "ai_summary", "tags"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured on this project." }, 500);

  try {
    const payload = await req.json();
    const title = String(payload?.title ?? "").slice(0, 300);
    const content = String(payload?.content ?? "").slice(0, 12000);
    const kind = String(payload?.kind ?? "page").slice(0, 40);
    const siteName = String(payload?.siteName ?? "").slice(0, 120);
    const images: ImageInput[] = Array.isArray(payload?.images)
      ? payload.images.slice(0, 12).map((i: ImageInput) => ({
          key: String(i?.key ?? "").slice(0, 80),
          context: String(i?.context ?? "").slice(0, 120),
          current: String(i?.current ?? "").slice(0, 200),
        }))
      : [];
    const knownTags: string[] = Array.isArray(payload?.knownTags)
      ? payload.knownTags.slice(0, 60).map((t: unknown) => String(t).slice(0, 40))
      : [];

    if (!title && !content) {
      return json({ error: "Nothing to analyse yet — add a title or content first." }, 400);
    }

    const userParts = [
      `Content type: ${kind}`,
      siteName ? `Site: ${siteName}` : "",
      `Title: ${title}`,
      knownTags.length ? `Existing tag vocabulary (prefer reusing these when they fit): ${knownTags.join(", ")}` : "",
      images.length
        ? `Images needing alt text:\n${images
            .map((i) => `- key=${i.key} | placement=${i.context || "unknown"} | current alt=${i.current || "(none)"}`)
            .join("\n")}`
        : "",
      `\nBody:\n${content}`,
    ]
      .filter(Boolean)
      .join("\n");

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
              "You are an SEO and AEO (AI-engine optimisation) assistant for a consultancy website. " +
              "Read the supplied content and produce accurate, specific metadata grounded ONLY in that content. " +
              "No marketing fluff, no invented facts, no quotes, no markdown. " +
              "Meta title max 60 characters. Meta description 120-158 characters. AI summary 60-320 characters. " +
              "Alt text describes what is visibly in / meant by the image in max 100 characters, never starting with 'image of'. " +
              "Always call the emit_seo_suggestions function.",
          },
          { role: "user", content: userParts },
        ],
        tools: [SUGGESTION_TOOL],
        tool_choice: { type: "function", function: { name: "emit_seo_suggestions" } },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) return json({ error: "AI is rate limited right now — try again in a moment." }, 429);
      if (res.status === 402) return json({ error: "AI credits are exhausted. Add credits to continue." }, 402);
      return json({ error: `AI request failed (${res.status}): ${text.slice(0, 300)}` }, res.status);
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return json({ error: "The AI returned no suggestions — try again." }, 502);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      return json({ error: "The AI returned malformed suggestions — try again." }, 502);
    }

    const clip = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
    const suggestions = {
      meta_title: clip(parsed.meta_title, 70),
      meta_description: clip(parsed.meta_description, 170),
      ai_summary: clip(parsed.ai_summary, 320),
      tags: Array.isArray(parsed.tags)
        ? (parsed.tags as unknown[]).slice(0, 8).map((t) => clip(t, 40)).filter(Boolean)
        : [],
      image_alts: Array.isArray(parsed.image_alts)
        ? (parsed.image_alts as Array<Record<string, unknown>>)
            .slice(0, 12)
            .map((i) => ({ key: clip(i.key, 80), alt: clip(i.alt, 100) }))
            .filter((i) => i.key && i.alt)
        : [],
    };

    return json({ suggestions });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
