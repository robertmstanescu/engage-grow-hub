import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ServiceCard from "@/features/site/ServiceCard";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import EditableText from "@/features/admin/EditableText";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSection } from "./typography";
// EPIC 1 / US 1.1 — atomic-node selection. SelectableWrapper renders
// as a passthrough fragment on the public site (no BuilderProvider).
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";
// EPIC 1 / US 1.4 — direct-on-canvas text editing.
import CanvasEditable from "@/features/admin/builder/CanvasEditable";

const hexToHslChannels = (hex: string): string | null => {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const li = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(li * 100)}%`;
  const d = max - min;
  const s = li > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(li * 100)}%`;
};

const COLOR_MAP: Record<string, string> = {
  color_section_bg: "--pillar-section-bg",
  color_primary: "--pillar-primary",
  color_card_bg: "--pillar-card-bg",
  color_card_title: "--pillar-card-title",
  color_subtitle: "--pillar-subtitle",
  color_card_description: "--pillar-card-description",
  color_deliverables_bg: "--pillar-deliverables-bg",
  color_deliverables_label: "--pillar-deliverables-label",
  color_meta_bg: "--pillar-meta-bg",
  color_meta_fg: "--pillar-meta-fg",
  color_cta_text: "--pillar-cta-text",
  color_cta_time: "--pillar-cta-time",
  color_carousel_btn_bg: "--pillar-carousel-btn-bg",
  color_carousel_btn_fg: "--pillar-carousel-btn-fg",
  color_dot_active: "--pillar-dot-active",
  color_dot_inactive: "--pillar-dot-inactive",
  color_note_border: "--pillar-note-border",
  color_divider_from: "--pillar-divider-from",
  color_divider_to: "--pillar-divider-to",
};

const buildColorOverrides = (content: Record<string, any>): Record<string, string> => {
  const overrides: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(COLOR_MAP)) {
    const hex = content[key];
    if (hex) {
      const hsl = hexToHslChannels(hex);
      if (hsl) overrides[cssVar] = hsl;
    }
  }
  return overrides;
};

// Note: `vAlign` is intentionally accepted but ignored — see the
// LAYOUT LOCK comment on <RowSection> below. Keeping it in the prop
// signature preserves API parity with the other row components so the
// PageRows dispatcher can pass props uniformly.
const ServiceRow = ({ row, rowIndex, align = "center", vAlign: _vAlign = "middle" }: { row: PageRow; rowIndex?: number; align?: Alignment; vAlign?: VAlign }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const services = c.services || [];
  const [current, setCurrent] = useState(0);
  // Warm the service row much earlier while it is still off-screen so the
  // card's glass buffer is ready by the time the user actually reaches it.
  const { ref, isVisible } = useScrollReveal({ rootMargin: "420px 0px", threshold: 0.01 });
  const prev = useCallback(() => {
    setCurrent((v) => v === 0 ? services.length - 1 : v - 1);
  }, [services.length]);
  const next = useCallback(() => {
    setCurrent((v) => v === services.length - 1 ? 0 : v + 1);
  }, [services.length]);

  if (!services.length) return null;
  const safeCurrent = Math.min(current, services.length - 1);

  const colorOverrides = buildColorOverrides(c);
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };

  const carouselTheme = l.carouselTheme || "auto";
  const isDarkBg = !row.bg_color || row.bg_color.includes("#2") || row.bg_color.includes("#1") || row.bg_color.includes("#0") || row.bg_color.includes("#3") || row.bg_color.includes("#4") || row.bg_color.includes("#5");
  const isLightCarousel = carouselTheme === "light" || (carouselTheme === "auto" && isDarkBg);
  const carouselBtnBg = c.color_carousel_btn_bg || (isLightCarousel ? "hsl(0 0% 100% / 0.15)" : "hsl(0 0% 0% / 0.1)");
  const carouselBtnColor = c.color_carousel_btn_fg || (isLightCarousel ? "hsl(0 0% 100% / 0.9)" : "hsl(0 0% 0% / 0.7)");
  const carouselBtnBorder = isLightCarousel ? "hsl(0 0% 100% / 0.2)" : "hsl(0 0% 0% / 0.15)";
  const dotActive = c.color_dot_active || (isLightCarousel ? "hsl(var(--accent))" : "hsl(var(--primary))");
  const dotInactive = c.color_dot_inactive || (isLightCarousel ? "hsl(0 0% 100% / 0.2)" : "hsl(0 0% 0% / 0.15)");

  const rowTextAlign = align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center";
  // Use only `auto` margins for horizontal placement. The parent
  // `<RowSection>` already supplies symmetric `px-6` gutters, so adding
  // an extra `ml-6`/`mr-6` here would push the content 24px further from
  // one edge than the other — visible on mobile as an uneven side gap
  // between alternating service pillars (left-aligned vs right-aligned).
  const rowContentAlign = align === "center" ? "mx-auto"
    : align === "right" ? "ml-auto"
    : "mr-auto";
  const carouselJustify = align === "right" ? "justify-end" : align === "left" ? "justify-start" : "justify-center";
  const cardTextAlign = (c.card_text_align as "left" | "center" | "right") || "left";

  const pillarLabelColor = c.color_label || "hsl(var(--pillar-label))";
  const pillarTitleColor = c.color_heading || "hsl(var(--pillar-heading))";
  const pillarDescriptionColor = c.color_heading_sub || "hsl(var(--pillar-heading-sub) / 0.7)";

  return (
    <RowSection
      row={row}
      // LAYOUT LOCK: Force `top` alignment regardless of the inherited
      // `vAlign` prop. Service rows host a carousel with cards of
      // different heights — if the row centred itself vertically, the
      // eyebrow/title/description above the cards would visibly jump up
      // and down each time the user clicked Next/Prev. Anchoring to the
      // top pins the header text in place; only the card content swaps.
      vAlign="top"
      // Only fall back to the pillar section CSS variable when the admin
      // has NOT picked a custom bg_color in the Style tab. Otherwise the
      // chosen colour would be overridden by the default token.
      defaultBg={row.bg_color ? row.bg_color : "hsl(var(--pillar-section-bg))"}
      style={colorOverrides as React.CSSProperties}
      className="service-row"
    >
      <div ref={ref} className={`relative z-10 w-full max-w-[900px] ${rowContentAlign} px-6 ${rowTextAlign}`}>
        {/*
          ATOMIC-NODE WRAPPERS (EPIC 1 / US 1.1)
          --------------------------------------
          Each visible text/image element is its OWN selectable node so
          editors can click straight onto a subtitle and see a tight
          blue ring just around that text. The path extends the row's
          path with a `field` segment.
        */}
        <SelectableWrapper
          path={["row", row.id, "widget", row.id, "field", "eyebrow"]}
          label="Eyebrow"
          variant="atom"
          inline
        >
          <RowEyebrow color={pillarLabelColor} style={revealStyle(isVisible, 0)}>
            <CanvasEditable
              path={["row", row.id, "widget", row.id, "field", "eyebrow"]}
              value={c.eyebrow || c.pillar_number || ""}
              as="span"
            >
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">
                {c.eyebrow || c.pillar_number}
              </EditableText>
            </CanvasEditable>
          </RowEyebrow>
        </SelectableWrapper>

        <SelectableWrapper
          path={["row", row.id, "widget", row.id, "field", "title"]}
          label="Title"
          variant="atom"
          inline
        >
          <RowTitle color={pillarTitleColor} style={revealStyle(isVisible, 1)}>
            <CanvasEditable
              path={["row", row.id, "widget", row.id, "field", "title"]}
              value={c.title || ""}
              as="span"
            >
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.title`} as="span">
                {c.title}
              </EditableText>
            </CanvasEditable>
          </RowTitle>
        </SelectableWrapper>

        {/*
          VERTICAL AXIS LAW:
          Description must share the SAME edge as eyebrow + title above it.
          Do NOT use `mx-auto / ml-auto / mr-auto` here — those would create
          a second horizontal axis independent of the parent container's
          alignment, producing the "staircase" look. Instead inherit the
          parent's text-align and use margin to align the max-width box to
          the same edge.

          SPACING NOTE:
          `mb-rhythm-base` (24px) — the standard gap between the row's title
          block and the body/description. Pulled from tailwind.config.ts so
          this row stays in sync with every other row's vertical rhythm.
        */}
        <SelectableWrapper
          path={["row", row.id, "widget", row.id, "field", "description"]}
          label="Description"
          variant="atom"
        >
          <div className="mb-rhythm-base" style={revealStyle(isVisible, 2)}>
            <CanvasEditable
              path={["row", row.id, "widget", row.id, "field", "description"]}
              value={c.description || ""}
              html
              as="div"
              className="font-body-heading leading-[1.6] [&_p]:mb-[5px] [&_p]:mt-[5px]"
              style={{
                color: pillarDescriptionColor,
                fontSize: "clamp(0.78rem, 0.85vh + 0.55vw, 1.05rem)",
                overflow: "visible",
                height: "auto",
                maxWidth: 600,
                marginLeft: align === "right" ? "auto" : align === "center" ? "auto" : 0,
                marginRight: align === "left" ? "auto" : align === "center" ? "auto" : 0,
              }}
            >
              <EditableText sectionKey="page_rows" fieldPath={`${prefix}.description`} html as="div"
                data-rte-fit=""
                className="font-body-heading leading-[1.6] [&_p]:mb-[5px] [&_p]:mt-[5px]"
                style={{
                  color: pillarDescriptionColor,
                  fontSize: "clamp(0.78rem, 0.85vh + 0.55vw, 1.05rem)",
                  overflow: "visible",
                  height: "auto",
                  maxWidth: 600,
                  marginLeft: align === "right" ? "auto" : align === "center" ? "auto" : 0,
                  marginRight: align === "left" ? "auto" : align === "center" ? "auto" : 0,
                }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.description || "") }} />
            </CanvasEditable>
          </div>
        </SelectableWrapper>

        {/* Carousel controls — `mb-rhythm-base` keeps the gap to the card below in sync with the rest of the site. */}
        <div className={`flex items-center ${carouselJustify} gap-3 mb-rhythm-base`} style={revealStyle(isVisible, 3)}>
          <button onClick={prev} className="w-9 h-9 rounded-full flex items-center justify-center interactive backdrop-blur-sm" style={{ backgroundColor: carouselBtnBg, color: carouselBtnColor, border: `1px solid ${carouselBtnBorder}` }}><ChevronLeft className="w-4 h-4" /></button>
          <div className="flex gap-2.5">
            {services.map((_: any, i: number) => (
              <button key={i} onClick={() => setCurrent(i)}
                className="w-2 h-2 rounded-full interactive"
                style={{ backgroundColor: i === safeCurrent ? dotActive : dotInactive, transform: i === safeCurrent ? "scale(1.5)" : "scale(1)", boxShadow: i === safeCurrent ? `0 0 12px ${dotActive}` : "none" }} />
            ))}
          </div>
          <button onClick={next} className="w-9 h-9 rounded-full flex items-center justify-center interactive backdrop-blur-sm" style={{ backgroundColor: carouselBtnBg, color: carouselBtnColor, border: `1px solid ${carouselBtnBorder}` }}><ChevronRight className="w-4 h-4" /></button>
        </div>

        {/*
          RESERVED CAROUSEL HEIGHT — pairs with `vAlign="top"` above to
          eliminate layout jitter. Without a min-height, the wrapper
          collapses to whatever the currently-visible card needs, so a
          short card (few deliverables) leaves blank space below and a
          tall one pushes the whole row downward. Reserving enough room
          for the tallest card keeps the carousel footprint stable as
          users click through. `min-h-[60vh]` scales with the viewport
          so it stays in proportion on every device.
        */}
        <div className="relative min-h-[520px] md:min-h-[60vh]" style={revealStyle(isVisible, 4)}>
          <ServiceCard key={safeCurrent} {...services[safeCurrent]} compact cardTextAlign={cardTextAlign} />
        </div>

        {/* Subscribe widget — `mt-rhythm-loose` (48px) marks a major content break between the carousel and the secondary CTA. */}
        {c.show_subscribe && <div className="mt-rhythm-loose" style={revealStyle(isVisible, 5)}><SubscribeWidget align={align} /></div>}
      </div>
    </RowSection>
  );
};

export default ServiceRow;
