/**
 * Alpha-mask recipes for CoverFadeImage. Kept out of the component file
 * so it exports only a component (react-refresh) and tests can import
 * the gradients directly.
 */
export type CoverFade = "hold" | "linear";

export const FADE_GRADIENTS: Record<CoverFade, string> = {
  /** Opaque through the top ~45%, then out to transparent. Blog banner and FAQ card. */
  hold: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0.6) 68%, rgba(0,0,0,0.2) 85%, rgba(0,0,0,0) 100%)",
  /** 100% at the first pixel down to 0% at the last. Row covers and flush cover cards. */
  linear: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
};
