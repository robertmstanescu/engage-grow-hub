import { memo } from "react";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import EditableText from "@/features/admin/EditableText";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { useAutoFitText } from "@/hooks/useAutoFitText";
import { resolveImageAlt } from "@/services/imageAlt";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody, RowSection } from "./typography";
// EPIC 1 / US 1.1 — atomic-node selection.
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

/**
 * ProfileRow — image + bio layout (founder, author, expert).
 *
 * Refactored to use the shared typography wrappers + RowSection so the
 * eyebrow / title / subtitle / body all match every other row on the site.
 * Per-row color overrides (color_eyebrow, color_title, etc.) still work.
 */
const ProfileRow = memo(({ row, rowIndex, align = "center", vAlign = "middle" }: { row: PageRow; rowIndex?: number; align?: Alignment; vAlign?: VAlign }) => {
  const c = row.content;
  const prefix = rowIndex !== undefined ? `rows.${rowIndex}.content` : "";
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1100px]";
  const { ref, isVisible } = useScrollReveal();
  const autoFitRef = useAutoFitText(0.75);

  const nameColor = c.color_name || "#FFFFFF";
  const roleColor = c.color_role || "hsl(var(--accent))";
  const credBg = c.color_credential_bg || "hsl(280 55% 24% / 0.6)";
  const credText = c.color_credential_text || "#FFFFFF";
  const noteColor = c.color_note || "hsl(var(--foreground) / 0.5)";
  const eyebrowColor = c.color_eyebrow || "hsl(var(--primary))";

  const credentials: string[] = c.credentials || [];

  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "ml-auto mr-6"
    : "mr-auto ml-6";

  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`
  );

  // Use column_widths to control the image/text split ratio
  const colWidths = l.column_widths || [35, 65];
  const gridCols = `${colWidths[0]}fr ${colWidths[1]}fr`;

  // EPIC 1 / US 1.1 — base path for atomic-node selection.
  const basePath: string[] = ["row", row.id, "widget", row.id, "field"];

  return (
    <RowSection
      row={row}
      vAlign={vAlign}
      defaultBg="hsl(260 20% 6%)"
      innerRef={(el) => { (ref as React.MutableRefObject<HTMLElement | null>).current = el; autoFitRef.current = el; }}
    >
      <div className={`relative z-10 ${maxW} w-full px-6 lg:pl-24 ${containerPos}`}>
        <div className="grid grid-cols-1 gap-rhythm-loose items-start" style={{ gridTemplateColumns: window.innerWidth > 768 ? gridCols : undefined }}>
          {/* Left column: Image + Name + Credentials */}
          <div className="flex flex-col items-center" style={revealStyle(isVisible, 1)}>
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                width: "100%",
                maxWidth: 340,
                aspectRatio: "3/4",
                padding: 4,
                background: "linear-gradient(135deg, hsl(280 55% 35% / 0.4), hsl(46 75% 60% / 0.15))",
                boxShadow:
                  "0 0 40px -10px hsl(280 55% 30% / 0.4), 0 0 80px -20px hsl(280 55% 40% / 0.15), inset 0 1px 0 hsl(0 0% 100% / 0.1)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                backfaceVisibility: "hidden",
                transform: "translateZ(0)",
              }}
            >
              <div className="w-full h-full rounded-lg overflow-hidden">
                {c.image_url ? (
                  // Profile photos sit below the fold on most pages —
                  // lazy-load + async decode keeps initial paint snappy.
                  <img
                    src={c.image_url}
                    alt={resolveImageAlt(c.image_alt, c.name || row.strip_title, "profile photo")}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: "hsl(var(--muted))" }} />
                )}
              </div>
            </div>

            {(c.name || c.role) && (
              <div className="mt-rhythm-base text-center" style={revealStyle(isVisible, 2)}>
                {c.name && (
                  <SelectableWrapper path={[...basePath, "name"]} label="Name" variant="atom">
                    <p className="font-display font-bold text-lg leading-[1.6]" style={{ color: nameColor }}>
                      <EditableText sectionKey="page_rows" fieldPath={`${prefix}.name`} as="span">
                        {c.name}
                      </EditableText>
                    </p>
                  </SelectableWrapper>
                )}
                {c.role && (
                  <SelectableWrapper path={[...basePath, "role"]} label="Role" variant="atom">
                    <p className="font-body text-xs tracking-wider uppercase mt-1" style={{ color: roleColor }}>
                      <EditableText sectionKey="page_rows" fieldPath={`${prefix}.role`} as="span">
                        {c.role}
                      </EditableText>
                    </p>
                  </SelectableWrapper>
                )}
              </div>
            )}

            {credentials.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-rhythm-tight justify-center" style={revealStyle(isVisible, 3)}>
                {credentials.map((cred, i) => (
                  <span
                    key={i}
                    className="font-body text-[10px] tracking-wider px-3 py-1 rounded-full"
                    style={{ backgroundColor: credBg, color: credText, backdropFilter: "blur(8px)" }}
                  >
                    {cred}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right column: Header + RTE body */}
          <div className="flex flex-col justify-start" style={revealStyle(isVisible, 0)}>
            {c.eyebrow && (
              <SelectableWrapper path={[...basePath, "eyebrow"]} label="Eyebrow" variant="atom" inline>
                <RowEyebrow color={eyebrowColor}>
                  <EditableText sectionKey="page_rows" fieldPath={`${prefix}.eyebrow`} as="span">
                    {c.eyebrow}
                  </EditableText>
                </RowEyebrow>
              </SelectableWrapper>
            )}

            {titleLines.length > 0 && (
              <SelectableWrapper path={[...basePath, "title"]} label="Title" variant="atom" inline>
                <RowTitle color={c.color_title}>
                  {titleLines.map((line, i) => (
                    <span key={i} className="block mb-1 last:mb-0">
                      <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
                    </span>
                  ))}
                </RowTitle>
              </SelectableWrapper>
            )}

            {c.subtitle && (
              <SelectableWrapper path={[...basePath, "subtitle"]} label="Subtitle" variant="atom" inline>
                <RowSubtitle color={c.subtitle_color}>
                  <EditableText sectionKey="page_rows" fieldPath={`${prefix}.subtitle`} as="span">{c.subtitle}</EditableText>
                </RowSubtitle>
              </SelectableWrapper>
            )}

            {c.body && (
              <SelectableWrapper path={[...basePath, "body"]} label="Body" variant="atom">
                <EditableText
                  sectionKey="page_rows"
                  fieldPath={`${prefix}.body`}
                  html
                  as="div"
                  data-rte-fit=""
                  className="font-body-heading leading-[1.6] [&_p]:mb-[5px] [&_p]:mt-[5px]"
                  style={{
                    fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)",
                    color: c.color_body || "hsl(var(--foreground) / 0.75)",
                    height: "auto",
                    overflow: "visible",
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }}
                />
              </SelectableWrapper>
            )}

            {c.note && (
              <div className="mt-rhythm-base pt-3" style={{ borderTop: `1px solid ${eyebrowColor}30` }}>
                <p className="font-body text-xs italic leading-[1.6]" style={{ color: noteColor }}>{c.note}</p>
              </div>
            )}

            {c.cta_url && c.cta_label && (
              <div className="mt-rhythm-base">
                <a href={c.cta_url} target={c.cta_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  className="btn-glass interactive font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full inline-block"
                  style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>
                  {c.cta_label}
                </a>
              </div>
            )}
          </div>
        </div>

        {c.show_subscribe && (
          <div className="mt-rhythm-loose" style={revealStyle(isVisible, 5)}>
            <SubscribeWidget align={align} />
          </div>
        )}
      </div>
    </RowSection>
  );
});

export default ProfileRow;
