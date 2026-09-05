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
 * VISION: image_alts is grounded in the actual image, not just its
 * placement label. Each image with a public `url` is attached to the
 * model's user message as an `image_url` content part (the Lovable AI
 * Gateway is OpenAI-Chat-Completions-compatible, so this is the
 * standard multimodal format) alongside the page's title/body, so the
 * model can describe what it actually sees AND relate it to the
 * page/article's subject — e.g. "A candidate reading a rejection
 * letter at a laptop, illustrating the hiring-bias study below" rather
 * than a generic "person at a desk". Images without a usable public
 * URL fall back to context-only guessing, same as before.
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
      ? payload.images.slice(0, 12).map((i: ImageInput) => {
          const rawUrl = String(i?.url ?? "").slice(0, 2000);
          return {
            key: String(i?.key ?? "").slice(0, 80),
            context: String(i?.context ?? "").slice(0, 120),
            current: String(i?.current ?? "").slice(0, 200),
            // Only pass through URLs the model gateway can actually fetch —
            // public http(s) URLs. Data URIs / blob URLs / relative paths
            // are dropped rather than sent, since the gateway can't reach
            // them and a broken image_url would fail the whole request.
            url: /^https?:\/\//i.test(rawUrl) ? rawUrl : undefined,
          };
        })
      : [];
    const knownTags: string[] = Array.isArray(payload?.knownTags)
      ? payload.knownTags.slice(0, 60).map((t: unknown) => String(t).slice(0, 40))
      : [];

    if (!title && !content) {
      return json({ error: "Nothing to analyse yet — add a title or content first." }, 400);
    }

    const imagesWithPhoto = images.filter((i) => i.url);
    const imagesTextOnly = images.filter((i) => !i.url);

    const userParts = [
      `Content type: ${kind}`,
      siteName ? `Site: ${siteName}` : "",
      `Title: ${title}`,
      knownTags.length ? `Existing tag vocabulary (prefer reusing these when they fit): ${knownTags.join(", ")}` : "",
      imagesTextOnly.length
        ? `Images needing alt text (no photo attached — infer from placement/context only):\n${imagesTextOnly
            .map((i) => `- key=${i.key} | placement=${i.context || "unknown"} | current alt=${i.current || "(none)"}`)
            .join("\n")}`
        : "",
      imagesWithPhoto.length
        ? "The images below are also attached as photos, each preceded by its key/placement/current-alt line — look at each one."
        : "",
      `\nBody:\n${content}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Multimodal content: the text context first, then each photographed
    // image as its own "label line" + `image_url` part pair so the model
    // can tie what it sees back to the right `key` in its response.
    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: userParts }];
    for (const img of imagesWithPhoto) {
      userContent.push({
        type: "text",
        text: `Image key=${img.key} | placement=${img.context || "unknown"} | current alt=${img.current || "(none)"}`,
      });
      userContent.push({ type: "image_url", image_url: { url: img.url } });
    }

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
              "For any image attached as an actual photo, look at what is genuinely depicted and write alt text " +
              "that describes it AND connects it to the page/article's topic where there's a real, honest " +
              "connection to make (e.g. 'A candidate reading a rejection letter, illustrating the hiring-bias " +
              "study below' rather than a generic 'person at a desk') — never invent a connection that isn't " +
              "actually visible in the image. For images with no photo attached, infer alt text from the " +
              "placement label and surrounding content only. Alt text max 100 characters, never starting with " +
              "'image of'. Always call the emit_seo_suggestions function.",
          },
          { role: "user", content: userContent },
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
