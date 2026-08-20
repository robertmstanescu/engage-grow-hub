/**
 * aiSummary — client helper for the `generate-ai-summary` edge function.
 *
 * Sends a title + plain-text body and returns a 60-320 character AEO
 * summary aimed at AI assistants (ChatGPT, Claude, Perplexity).
 */
import { supabase } from "@/integrations/supabase/client";

/** Strip HTML tags / entities down to readable plain text. */
export const htmlToPlainText = (html: string): string =>
  (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Pull every human-readable string out of a page-rows JSON tree. */
export const rowsToPlainText = (rows: unknown): string => {
  const out: string[] = [];
  const skipKeys = /(^id$|color|url|image|icon|_id$|align|width|height|size|slug|type$)/i;
  const walk = (node: unknown, key = "") => {
    if (typeof node === "string") {
      if (skipKeys.test(key)) return;
      const text = htmlToPlainText(node);
      if (text.length > 2 && !/^(#|https?:|\/)/.test(text)) out.push(text);
      return;
    }
    if (Array.isArray(node)) return node.forEach((n) => walk(n, key));
    if (node && typeof node === "object") {
      Object.entries(node as Record<string, unknown>).forEach(([k, v]) => walk(v, k));
    }
  };
  walk(rows);
  return out.join(". ").slice(0, 12000);
};

export const generateAiSummary = async (input: {
  title: string;
  content: string;
  kind?: "page" | "blog post";
}): Promise<string> => {
  const { data, error } = await supabase.functions.invoke("generate-ai-summary", {
    body: { title: input.title, content: input.content, kind: input.kind || "page" },
  });
  if (error) {
    // Edge function errors carry the JSON body in the response context.
    let message = error.message || "Failed to generate summary";
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      }
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  const summary = (data as any)?.summary as string | undefined;
  if (!summary) throw new Error("The AI returned an empty summary — try again.");
  return summary;
};
