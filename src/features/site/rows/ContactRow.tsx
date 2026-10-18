import { sanitizeHtml } from "@/services/sanitize";
import type { PageRow } from "@/types/rows";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody, RowSection } from "./typography";
import RowCoverCard from "@/features/site/RowCoverCard";
import { trackConversion } from "@/services/conversions";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

export const DEFAULT_BOOKING_URL = "https://calendar.app.google/6MhwyESSZTtSbUrX8";
export const DEFAULT_CALENDAR_EMBED_URL =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ2k8Gb0pNJCCqc-53e7WnczGGsTatLak9uSbunJcsuRxC7MzNzL_Ns7gjcYy1ooA_V4wy9d-rMI?gv=true";

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
  const titleLines: string[] = (c.title_lines || []).map((l: any) =>
    typeof l === "string" ? l.startsWith("<") ? l : `<p>${l}</p>` : `<p>${l}</p>`
  );
  const buttonText = c.booking_button_text || "Book a discovery call";
  const bookingUrl = safeLink(c.booking_url);
  const embedUrl = safeEmbed(c.calendar_embed_url);
  const showCalendar = c.show_calendar !== false;

  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "ml-auto mr-6"
    : "mr-auto ml-6";
  const contentAlign = align === "center" ? "text-center"
    : align === "right" ? "text-right"
    : "text-left";

  const { ref, isVisible } = useScrollReveal();
  const coverImage = c.cover_image?.trim() || undefined;

  const innerContent = (
    <>
        <div className={`mb-rhythm-base ${contentAlign}`} style={revealStyle(isVisible, 0)}>
          {c.eyebrow && (
            <RowEyebrow color={c.color_eyebrow || ""}>{c.eyebrow}</RowEyebrow>
          )}
          {titleLines.length > 0 && (
            <RowTitle icon={c.icon}>
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
        </div>

        <div
          className="surface-card p-4 md:p-8"
          style={{ ...revealStyle(isVisible, 1), border: "var(--outline-ink-border)" }}>
          {showCalendar && (
            <div className="overflow-hidden rounded-lg bg-card">
              <iframe
                src={embedUrl}
                title="Book a time with The Magic Coffin"
                loading="lazy"
                scrolling="no"
                className="block w-full h-[1250px] md:h-[820px]"
                style={{ border: 0, background: "hsl(var(--card))" }}
              />
            </div>
          )}
          <div className={`flex ${showCalendar ? "mt-6 pt-6 border-t row-border" : ""} ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`}>
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

        {c.note && (
          <div className={`mt-rhythm-base pt-3 border-t row-border ${contentAlign}`}>
            <p className="text-card-body italic row-fg-muted measure">{c.note}</p>
          </div>
        )}
    </>
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
        <div ref={ref} className={`relative z-10 max-w-[1280px] row-container ${containerPos} ${contentAlign}`}>
          {innerContent}
        </div>
      )}
    </RowSection>
  );
};

export default ContactRow;
