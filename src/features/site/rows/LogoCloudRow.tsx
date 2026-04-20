/**
 * ─────────────────────────────────────────────────────────────────────────
 * LogoCloudRow.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Public renderer for `type: "logo_cloud"` rows — the classic
 * "Trusted by" logo strip you see on most SaaS landing pages.
 *
 * DATA CONTRACT (junior-engineer guide)
 * ─────────────────────────────────────
 * `row.content` shape:
 * {
 *   "eyebrow": "Trusted by",
 *   "logos": [
 *     { "url": "https://…/acme.svg", "alt": "Acme Corp logo" },
 *     ...
 *   ]
 * }
 *
 * VISUAL NOTES
 * ────────────
 * - Logos default to muted greyscale (`opacity-60 grayscale`) so they
 *   don't fight the page palette; on hover they pop to full colour.
 * - The container is `flex flex-wrap` so logos reflow neatly on mobile.
 * - All sizes/colours are Tailwind utilities — no raw hex.
 * ───────────────────────────────────────────────────────────────────────── */

import type { PageRow, LogoCloudLogo } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { resolveImageAlt } from "@/services/imageAlt";
import { sanitizeHtml } from "@/services/sanitize";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody, RowSection } from "./typography";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";

const LogoCloudRow = ({
  row,
  align = "center",
}: {
  row: PageRow;
  rowIndex?: number;
  align?: Alignment;
  vAlign?: VAlign;
}) => {
  const c = row.content || {};
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const logos: LogoCloudLogo[] = Array.isArray(c.logos) ? c.logos : [];
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const justify =
    align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
  const textAlign =
    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  const { ref, isVisible } = useScrollReveal();

  if (logos.length === 0 && !c.eyebrow) return null;

  return (
    <RowSection row={row}>
      <div
        ref={ref as any}
        className={`${maxW} mx-auto px-4 md:px-8 ${textAlign}`}
      >
        {c.eyebrow && (
          <p
            className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-6"
            style={revealStyle(isVisible, 0)}
          >
            {c.eyebrow}
          </p>
        )}
        <div
          className={`flex flex-wrap items-center gap-x-10 gap-y-6 ${justify}`}
          style={revealStyle(isVisible, 0.2)}
        >
          {logos.map((logo, i) => (
            <img
              key={i}
              src={logo.url}
              alt={resolveImageAlt(logo.alt, "Client logo")}
              loading="lazy"
              /*
               * Greyscale & dim by default → full colour on hover. The
               * `transition` smooths the colour swap.
               */
              className="h-8 md:h-10 w-auto object-contain opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300"
            />
          ))}
        </div>

        {/* Universal subscribe widget — see SubscribeToggle.tsx. */}
        {c.show_subscribe && (
          <div className="mt-rhythm-loose" style={revealStyle(isVisible, 0.4)}>
            <SubscribeWidget align={align} />
          </div>
        )}
      </div>
    </RowSection>
  );
};

export default LogoCloudRow;
