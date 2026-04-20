/**
 * pickForeground — returns a readable text color for a given background.
 *
 * WHY THIS EXISTS (junior-dev orientation)
 * ─────────────────────────────────────────
 * Several admin editors (RichTextEditor, TitleLineEditor, SubtitleEditor,
 * SectionBox) render the user's typed text on top of the LIVE row's
 * background colour so the admin can see exactly how the copy will look
 * on the public site without leaving the dashboard.
 *
 * If the row background is dark, we need light text. If it's light, we
 * need dark text. Doing this by hand in every editor was duplicative and
 * caused subtle drift (different luminance thresholds per file). One
 * helper, one source of truth.
 *
 * SUPPORTED INPUT FORMATS
 * ───────────────────────
 *   • #RGB / #RRGGBB
 *   • rgb(r,g,b) / rgba(r,g,b,a)
 *   • hsl(h s% l% / a) / hsl(h, s%, l%) (parses lightness component only —
 *     close enough for foreground readability decisions)
 *
 * If the input is empty or unparsable we assume a dark surface (the live
 * site default) and return the project's light foreground token.
 */

const LIGHT_FG = "#F4F0EC";
const DARK_FG = "#1A1A1A";

const expandHex = (hex: string) => (hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex);

export const pickForeground = (bg?: string | null): string => {
  if (!bg) return LIGHT_FG;
  const trimmed = bg.trim();
  if (!trimmed) return LIGHT_FG;

  // ── CSS variable guard ──────────────────────────────────────────────
  // Our design system's --background token always represents the light
  // admin surface, so text rendered on top of it must be dark to remain
  // readable. The regex parsers below cannot evaluate `var(...)` refs,
  // and would otherwise default to LIGHT_FG → invisible white-on-white.
  if (trimmed.includes("var(--background)")) {
    return DARK_FG;
  }

  // ── Hex ─────────────────────────────────────────────────────────────
  const hexMatch = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = expandHex(hexMatch[1]);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? DARK_FG : LIGHT_FG;
  }

  // ── rgb()/rgba() ────────────────────────────────────────────────────
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i);
  if (rgbMatch) {
    const r = +rgbMatch[1], g = +rgbMatch[2], b = +rgbMatch[3];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? DARK_FG : LIGHT_FG;
  }

  // ── hsl() — use lightness as a proxy for luminance ─────────────────
  const hslMatch = trimmed.match(/hsla?\(\s*[\d.]+\s*[, ]\s*[\d.]+%\s*[, ]\s*([\d.]+)%/i);
  if (hslMatch) {
    const l = parseFloat(hslMatch[1]) / 100;
    return l > 0.6 ? DARK_FG : LIGHT_FG;
  }

  return LIGHT_FG;
};

export { LIGHT_FG, DARK_FG };
