import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/services/sanitize";
import type { PageRow, ContactField } from "@/types/rows";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import RowBackground from "./RowBackground";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody } from "./typography";
import { getAttributionForPayload } from "@/services/attribution";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const defaultFields: ContactField[] = [
  { key: "name", label: "Your name", type: "text", required: true, visible: true },
  { key: "email", label: "Email address", type: "email", required: true, visible: true },
  { key: "company", label: "Company", type: "text", required: false, visible: true },
  { key: "message", label: "How can we help?", type: "textarea", required: true, visible: true },
  { key: "marketing", label: "Keep me updated with news and articles", type: "checkbox", required: false, visible: true },
];

const CREAM = "hsl(var(--foreground))";

/* Form typography matches the rest of the site: labels use the same
 * eyebrow scale as <RowEyebrow/> and inputs the same body scale as
 * <RowBody/>, instead of the old 9px/12px one-off sizes. */
const LABEL_CLASS =
  "block font-body text-[11px] uppercase tracking-[0.18em] mb-2 text-left";
const INPUT_CLASS =
  "w-full bg-transparent border border-border rounded-lg px-4 py-3 font-body text-sm outline-none interactive text-left transition-colors";

const ContactRow = ({ row, align = "left", vAlign = "middle" }: { row: PageRow; align?: Alignment; vAlign?: VAlign }) => {
  const c = row.content;
  const titleLines: string[] = (c.title_lines || []).map((l: any) =>
    typeof l === "string" ? l.startsWith("<") ? l : `<p>${l}</p>` : `<p>${l}</p>`
  );
  const fields: ContactField[] = c.fields || defaultFields;
  const visibleFields = fields.filter((f) => f.visible);
  const buttonText = c.button_text || "Request a discovery call";
  const successHeading = c.success_heading || "Message received.";
  const successBody = c.success_body || "We respond within 24 hours.";
  const successButton = c.success_button || "Send another message";

  const [formData, setFormData] = useState<Record<string, any>>({ name: "", email: "", company: "", message: "", subscribed_to_marketing: false });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("submit-contact", {
      body: {
        name: formData.name,
        email: formData.email,
        company: formData.company || null,
        message: formData.message || null,
        subscribed_to_marketing: formData.subscribed_to_marketing || false,
        // Epic 4 / US 4.1 — first-touch marketing attribution.
        attribution: getAttributionForPayload(),
      },
    });
    if (error) { toast.error("Something went wrong."); setSubmitting(false); return; }
    setSubmitted(true); setSubmitting(false); toast.success("Message sent!");
  };

  const containerPos = align === "center" ? "mx-auto"
    : align === "right" ? "ml-auto mr-6"
    : "mr-auto ml-6";
  const contentAlign = align === "center" ? "text-center"
    : align === "right" ? "text-right"
    : "text-left";

  const leftFields = visibleFields.filter((f) => f.type !== "textarea" && f.type !== "checkbox");
  const textareaField = visibleFields.find((f) => f.type === "textarea");
  const checkboxFields = visibleFields.filter((f) => f.type === "checkbox");

  const { ref, isVisible } = useScrollReveal();

  // ContactRow uses a custom <section> wrapper (not RowSection) because it
  // needs the .section-light class which inverts the foreground variable.
  const vAlignJustify = vAlign === "top" ? "justify-start" : vAlign === "bottom" ? "justify-end" : "justify-center";
  // Snap behaviour is opt-in per row. When the admin enables it in the
  // Style tab the section also takes the full viewport height; otherwise
  // it free-scrolls inside the standard 18px row-fluid breathing strip.
  const snapEnabled = row.layout?.snapEnabled === true;
  const snapAttrs = snapEnabled ? { "data-snap-enabled": "true" as const } : {};
  const heightClass = snapEnabled ? "min-h-screen" : "";

  if (submitted) {
    return (
      <section {...snapAttrs} className={`snap-section section-light relative ${heightClass} flex flex-col ${vAlignJustify} py-row-fluid`} style={{ isolation: "isolate" }}>
        <RowBackground row={row} />
        <div className={`relative z-10 max-w-[520px] row-container ${containerPos} ${contentAlign}`}>
          <div style={revealStyle(true, 0)}>
            <RowTitle color="hsl(var(--primary))">{successHeading}</RowTitle>
            <RowBody className="mb-rhythm-base">{successBody}</RowBody>
            <button onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", company: "", message: "", subscribed_to_marketing: false }); }}
              className="btn-ink"
>{successButton}</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section {...snapAttrs} className={`snap-section section-light relative ${heightClass} flex flex-col ${vAlignJustify} py-row-fluid`} style={{ isolation: "isolate" }}>
      <RowBackground row={row} />

      <div ref={ref} className={`relative z-10 max-w-[1280px] row-container ${containerPos} ${contentAlign}`}>
        <div className="mb-rhythm-loose text-left" style={revealStyle(isVisible, 0)}>
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
            <RowSubtitle color={c.subtitle_color || ""}>{c.subtitle}</RowSubtitle>
          )}
          {c.body && <RowBody html={sanitizeHtml(c.body)} data-rte-fit="" />}
        </div>

        <div
          className="surface-card p-6 md:p-8"
          style={revealStyle(isVisible, 1)}>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {leftFields.map((field, fi) => (
                  <div key={field.key} style={revealStyle(isVisible, fi + 2)}>
                    <label className={LABEL_CLASS} style={{ color: CREAM }}>{field.label}</label>
                    <input type={field.type} required={field.required} value={formData[field.key] || ""}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className={INPUT_CLASS}
                      style={{ color: CREAM }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "hsl(var(--accent))"}
                      onBlur={(e) => e.currentTarget.style.borderColor = ""} />
                  </div>
                ))}
              </div>

              {textareaField && (
                <div className="flex flex-col" style={revealStyle(isVisible, leftFields.length + 2)}>
                  <label className={LABEL_CLASS} style={{ color: CREAM }}>{textareaField.label}</label>
                  <textarea required={textareaField.required} rows={5} value={formData[textareaField.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [textareaField.key]: e.target.value })}
                    className={`${INPUT_CLASS} resize-none flex-1`}
                    style={{ color: CREAM }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "hsl(var(--accent))"}
                    onBlur={(e) => e.currentTarget.style.borderColor = ""} />
                </div>
              )}
            </div>


            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 pt-6 border-t border-border" style={revealStyle(isVisible, leftFields.length + 3)}>
              <div className="space-y-1.5">
                {checkboxFields.map((field) => (
                  <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.subscribed_to_marketing || false}
                      onChange={(e) => setFormData({ ...formData, subscribed_to_marketing: e.target.checked })}
                      className="rounded" style={{ accentColor: "hsl(var(--accent))" }} />
                    <span className="font-body text-xs text-muted-foreground">{field.label}</span>
                  </label>
                ))}
              </div>
              <button type="submit" disabled={submitting}
                className="btn-ink disabled:opacity-50 sm:ml-auto">
                {submitting ? "Sending…" : buttonText}
              </button>
            </div>
          </form>
        </div>

        {c.note && (
          <div className="mt-rhythm-base pt-3 text-left border-t border-border">
            <p className="font-body text-sm italic leading-[1.6] text-muted-foreground measure">{c.note}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ContactRow;
