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
  // Normalise title_lines: older entries may be plain strings.
  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`,
  );
  const hasHeader = !!c.eyebrow || titleLines.length > 0 || !!c.subtitle || !!c.body;
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const justify =
    align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
  const textAlign =
    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  const { ref, isVisible } = useScrollReveal();

  if (logos.length === 0 && !hasHeader) return null;

  return (
    <RowSection row={row}>
      <div
        ref={ref as any}
        className={`${maxW} mx-auto px-4 md:px-8 ${textAlign}`}
      >
        {/* ── Standard Brand Header block — see NewRowEditors.tsx for the
         *  matching admin fields. Renders any combination of eyebrow,
         *  title lines, subtitle, and rich-text body that the admin
         *  filled in. Each typography component is shared with every
         *  other row type for visual consistency. */}
        {c.eyebrow && (
          <RowEyebrow color={c.color_eyebrow || "hsl(var(--secondary))"} style={revealStyle(isVisible, -0.5)}>
            {c.eyebrow}
          </RowEyebrow>
        )}
        {titleLines.length > 0 && (
          <RowTitle style={revealStyle(isVisible, 0)}>
            {titleLines.map((line, i) => (
              <span
                key={i}
                className="block"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(line) }}
              />
            ))}
          </RowTitle>
        )}
        {c.subtitle && (
          <RowSubtitle color={c.subtitle_color || ""} style={revealStyle(isVisible, 0.3)}>
            {c.subtitle}
          </RowSubtitle>
        )}
        {c.body && (
          <RowBody html={sanitizeHtml(c.body)} style={revealStyle(isVisible, 0.35)} />
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
