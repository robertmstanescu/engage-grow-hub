/**
 * seoAssistant — client helper for the `generate-seo-suggestions`
 * edge function.
 *
 * Returns SUGGESTIONS only. The caller is responsible for showing a
 * review panel and persisting whatever the admin accepts — nothing here
 * writes to the database.
 */
import { supabase } from "@/integrations/supabase/client";

export interface SeoImageInput {
  /** Stable key the caller uses to map an accepted alt back to its field. */
  key: string;
  /** Human-readable placement, e.g. "cover image" or "row 2 image". */
  context?: string;
  /** Existing alt text, if any. */
  current?: string;
}

export interface SeoSuggestions {
  meta_title: string;
  meta_description: string;
  ai_summary: string;
  tags: string[];
  image_alts: Array<{ key: string; alt: string }>;
}

export const generateSeoSuggestions = async (input: {
  title: string;
  content: string;
  kind?: string;
  siteName?: string;
  images?: SeoImageInput[];
  knownTags?: string[];
}): Promise<SeoSuggestions> => {
  const { data, error } = await supabase.functions.invoke("generate-seo-suggestions", {
    body: {
      title: input.title,
      content: input.content,
      kind: input.kind || "page",
      siteName: input.siteName || "",
      images: input.images || [],
      knownTags: input.knownTags || [],
    },
  });

  if (error) {
    let message = error.message || "Failed to generate SEO suggestions";
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      }
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  const payload = data as { error?: string; suggestions?: SeoSuggestions };
  if (payload?.error) throw new Error(payload.error);
  if (!payload?.suggestions) throw new Error("The AI returned no suggestions — try again.");
  return {
    meta_title: payload.suggestions.meta_title || "",
    meta_description: payload.suggestions.meta_description || "",
    ai_summary: payload.suggestions.ai_summary || "",
    tags: payload.suggestions.tags || [],
    image_alts: payload.suggestions.image_alts || [],
  };
};
