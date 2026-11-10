import { sanitizeHtml } from "@/services/sanitize";
import type { PageRow } from "@/types/rows";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody, RowSection } from "./typography";
import RowCoverCard from "@/features/site/RowCoverCard";
import { trackConversion } from "@/services/conversions";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

export const DEFAULT_BOOKING_URL = "https://calendar.app.google/rCZX6w2RUWKpsKfRA";
export const DEFAULT_CALENDAR_EMBED_URL =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0wK351aXmB3bMjJ8upin66l0GI2RHg45H4F_nxaiP5PTRPulrUrYYKwV-bOdpQ8oT2v2egoz9L?gv=true";

/** Only Google Calendar pages may be embedded. */
const safeEmbed = (url?: string) => {
  const u = (url || "").trim();
  return u.startsWith("https://calendar.google.com/") ? u : DEFAULT_CALENDAR_EMBED_URL;
};
const safeLink = (url?: string) => {
  const u = (url || "").trim();
  return /^https:\/\//.test(u) ? u : DEFAULT_BOOKING_URL;
};

const ContactRow = ({ row, align = "left", vAlign = "middle" }: { row: PageRow; align?: Alignment; vAlign?: VAlign }) => {
  const c = row.content;
  const titleLines: string[] = (c.title_lines || []).map((l: unknown) =>
    typeof l === "string" ? l.startsWith("<") ? l : `<p>${l}</p>` : `<p>${l}</p>`
  );
  const buttonText = c.booking_button_text || "Book a discovery call";
  const bookingUrl = safeLink(c.booking_url);
  const embedUrl = safeEmbed(c.calendar_embed_url);
  const showCalendar = c.show_calendar !== false;

  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "mx-auto"
    : "mx-auto";
  const contentAlign = align === "center" ? "text-center"
    : align === "right" ? "text-right"
    : "text-left";

  const { ref, isVisible } = useScrollReveal();
  const coverImage = c.cover_image?.trim() || undefined;

  // Two layouts (Content ▸ More ▸ "Calendar position"):
  //  - "stacked" (default; owner, 10 Nov 2026): the copy, then the
  //    booking card across the full column underneath. The row is much
  //    shorter because the wide calendar shows its times beside the month.
  //  - "side" (the artboard): copy on the left, the card on the right;
  //    the two wrap to a stack on narrow screens (flex-basis, no
  //    breakpoint), so the calendar never gets narrower than it can use.
  const stacked = c.layout !== "side";
  const innerContent = (
    <div className={stacked ? "flex flex-col" : "flex flex-wrap items-start"} style={{ gap: stacked ? 36 : 56 }}>
      <div className={`min-w-0 ${contentAlign}`} style={{ ...(stacked ? { maxWidth: 820, ...(align === "center" ? { marginInline: "auto" } : align === "right" ? { marginLeft: "auto" } : {}) } : { flex: "1 1 440px" }), ...revealStyle(isVisible, 0) }}>
        {c.eyebrow && (
          <RowEyebrow color={c.color_eyebrow || ""}>{c.eyebrow}</RowEyebrow>
        )}
        {titleLines.length > 0 && (
          <RowTitle icon={c.icon} className="contact-title">
            {titleLines.map((line, i) => (
              <span key={i} style={{ display: "block" }}>
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
              </span>
            ))}
          </RowTitle>
        )}
        {c.subtitle && (
          <RowSubtitle handwritten={!!c.subtitle_handwritten} color={c.subtitle_color || ""}>{c.subtitle}</RowSubtitle>
        )}
        {c.body && <RowBody html={sanitizeHtml(c.body)} />}
        {c.note && (
          <p className="mt-rhythm-base text-card-body italic row-fg-muted measure">{c.note}</p>
        )}
        {/* The tilted stamp under the copy (artboard Main: "LID OFF"). */}
        {typeof c.stamp === "string" && c.stamp.trim() && <span className="contact-stamp">{c.stamp}</span>}
      </div>

      <div
        className="surface-card min-w-0 p-3 md:p-6"
        style={{ ...(stacked ? { width: "100%" } : { flex: "1 1 420px" }), ...revealStyle(isVisible, 1) }}>
        {showCalendar && (
          <div className="overflow-hidden rounded-2xl bg-card">
            <iframe
              src={embedUrl}
              title="Book a time with The Magic Coffin"
              loading="lazy"
              scrolling="no"
              className="block w-full h-[1180px] md:h-[680px]"
              style={{ border: 0, background: "hsl(var(--card))" }}
            />
          </div>
        )}
        <div className={`flex ${showCalendar ? "mt-5" : ""} justify-start`}>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackConversion("cta_click", "booking")}
            className="btn-ink"
          >
            {buttonText}
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <RowSection row={row} vAlign={vAlign} className="section-light" grain={false}>
      {coverImage ? (
        <div className="relative z-10 w-full max-w-[1280px] mx-auto">
          <RowCoverCard row={row}>
            <div ref={ref} className={contentAlign}>{innerContent}</div>
          </RowCoverCard>
        </div>
      ) : (
        <div ref={ref} className={`relative z-10 max-w-[1280px] row-container contact-room ${containerPos} ${contentAlign}`}>
          {innerContent}
        </div>
      )}
    </RowSection>
  );
};

export default ContactRow;
