import { supabase } from "@/integrations/supabase/client";
import { imagePreviewDataUrl } from "./imageShrink";

/**
 * describeImage — alt text and a one-line description for a picture,
 * written by the same Gemini model that summarises posts (edge function
 * `describe-image`). Pass a public address for a picture already in the
 * library, or the File about to upload (a 1024px preview is sent).
 */
export interface ImageDescription { alt: string; description: string }

export async function describeImage(input: { imageUrl?: string; file?: File; context?: string }): Promise<ImageDescription> {
  let imageUrl = input.imageUrl || "";
  if (!imageUrl && input.file) {
    const preview = await imagePreviewDataUrl(input.file);
    if (!preview) throw new Error("This picture cannot be previewed in the browser.");
    imageUrl = preview;
  }
  if (!imageUrl) throw new Error("No picture to describe.");
  const { data, error } = await supabase.functions.invoke("describe-image", { body: { imageUrl, context: input.context || "" } });
  if (error) {
    let message = error.message || "Could not describe the picture";
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (ctx && typeof ctx.json === "function") { const body = await ctx.json(); if (body?.error) message = body.error; }
    } catch { /* keep the generic message */ }
    throw new Error(message);
  }
  const alt = String((data as { alt?: string })?.alt || "").trim();
  if (!alt) throw new Error("The AI returned nothing — try again.");
  return { alt, description: String((data as { description?: string })?.description || "").trim() };
}
