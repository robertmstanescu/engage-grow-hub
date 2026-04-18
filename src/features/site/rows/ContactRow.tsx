import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/services/sanitize";
import type { PageRow, ContactField } from "@/types/rows";
import type { Alignment, VAlign } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import RowBackground from "./RowBackground";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody } from "./typography";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const defaultFields: ContactField[] = [
  { key: "name", label: "Your name", type: "text", required: true, visible: true },
  { key: "email", label: "Email address", type: "email", required: true, visible: true },
  { key: "company", label: "Company", type: "text", required: false, visible: true },
  { key: "message", label: "Tell us about your vampire moment", type: "textarea", required: true, visible: true },
  { key: "marketing", label: "Keep me updated with insights and articles", type: "checkbox", required: false, visible: true },
];

const CREAM = "#F4F0EC";

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
      body: { name: formData.name, email: formData.email, company: formData.company || null, message: formData.message || null, subscribed_to_marketing: formData.subscribed_to_marketing || false },
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

  if (submitted) {
    return (
      <section className={`snap-section section-light relative min-h-screen flex flex-col ${vAlignJustify} py-row md:py-row-md`} style={{ isolation: "isolate" }}>
        <RowBackground row={row} />
        <div className={`relative z-10 max-w-[520px] px-6 ${containerPos} ${contentAlign}`}>
          <div style={revealStyle(true, 0)}>
            <RowTitle color="hsl(var(--primary))">{successHeading}</RowTitle>
            <RowBody color="hsl(var(--light-fg) / 0.7)" className="mb-rhythm-base">{successBody}</RowBody>
            <button onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", company: "", message: "", subscribed_to_marketing: false }); }}
              className="btn-glass interactive font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full"
              style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>{successButton}</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`snap-section section-light relative min-h-screen flex flex-col ${vAlignJustify} py-row md:py-row-md`} style={{ isolation: "isolate" }}>
      <RowBackground row={row} />

      <div ref={ref} className={`relative z-10 max-w-[900px] px-6 ${containerPos} ${contentAlign}`}>
        <div className="mb-rhythm-loose text-left" style={revealStyle(isVisible, 0)}>
          {c.eyebrow && (
            <RowEyebrow color={c.color_eyebrow || "hsl(var(--primary) / 0.6)"}>{c.eyebrow}</RowEyebrow>
          )}
          {titleLines.length > 0 && (
            <RowTitle>
              {titleLines.map((line, i) => (
                <span key={i} style={{ display: "block", color: "hsl(var(--primary))" }}>
                  <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
                </span>
              ))}
            </RowTitle>
          )}
          {c.subtitle && (
            <RowSubtitle color={c.subtitle_color || "hsl(var(--primary) / 0.7)"}>{c.subtitle}</RowSubtitle>
          )}
          {c.body && <RowBody html={sanitizeHtml(c.body)} color="hsl(var(--light-fg) / 0.7)" data-rte-fit="" />}
        </div>

        <div
          className="rounded-2xl p-5 md:p-7 relative overflow-hidden"
          style={{
            ...revealStyle(isVisible, 1),
            backgroundColor: "hsl(280 55% 24% / 0.9)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid hsl(280 55% 35% / 0.4)",
            boxShadow: "0 16px 48px -12px hsl(280 55% 15% / 0.5), 0 0 60px -20px hsl(280 55% 30% / 0.2)",
          }}>
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
            background: "linear-gradient(135deg, hsl(280 55% 40% / 0.4) 0%, transparent 50%, hsl(280 55% 30% / 0.2) 100%)",
          }} />
          <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{ background: "linear-gradient(to right, transparent, hsl(280 55% 60% / 0.3), transparent)" }} />

          <form onSubmit={handleSubmit} className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                {leftFields.map((field, fi) => (
                  <div key={field.key} style={revealStyle(isVisible, fi + 2)}>
                    <label className="block font-body text-[9px] uppercase tracking-[0.25em] mb-1.5 text-left text-white">{field.label}</label>
                    <input type={field.type} required={field.required} value={formData[field.key] || ""}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className="w-full bg-transparent pb-2 font-body text-xs outline-none interactive text-left"
                      style={{ borderBottom: `1px solid ${CREAM}30`, color: CREAM }}
                      onFocus={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--accent))"}
                      onBlur={(e) => e.currentTarget.style.borderBottomColor = `${CREAM}30`} />
                  </div>
                ))}
              </div>

              {textareaField && (
                <div className="flex flex-col" style={revealStyle(isVisible, leftFields.length + 2)}>
                  <label className="block font-body text-[9px] uppercase tracking-[0.25em] mb-1.5 text-white text-left">{textareaField.label}</label>
                  <textarea required={textareaField.required} rows={5} value={formData[textareaField.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [textareaField.key]: e.target.value })}
                    className="w-full bg-transparent pb-2 font-body text-xs outline-none interactive resize-none flex-1 text-left"
                    style={{ borderBottom: `1px solid ${CREAM}30`, color: CREAM }}
                    onFocus={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--accent))"}
                    onBlur={(e) => e.currentTarget.style.borderBottomColor = `${CREAM}30`} />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-rhythm-base pt-4" style={{ ...revealStyle(isVisible, leftFields.length + 3), borderTop: `1px solid ${CREAM}15` }}>
              <div className="space-y-1.5">
                {checkboxFields.map((field) => (
                  <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.subscribed_to_marketing || false}
                      onChange={(e) => setFormData({ ...formData, subscribed_to_marketing: e.target.checked })}
                      className="rounded" style={{ accentColor: "hsl(var(--accent))" }} />
                    <span className="font-body text-[10px]" style={{ color: `${CREAM}99` }}>{field.label}</span>
                  </label>
                ))}
              </div>
              <button type="submit" disabled={submitting}
                className="btn-glass interactive-strong font-display text-[10px] uppercase tracking-[0.1em] font-bold px-8 py-3 rounded-full disabled:opacity-50">
                {submitting ? "Sending…" : buttonText}
              </button>
            </div>
          </form>
        </div>

        {c.note && (
          <div className="mt-rhythm-base pt-3 text-left" style={{ borderTop: "1px solid hsl(var(--foreground) / 0.1)" }}>
            <p className="font-body text-xs italic leading-[1.6]" style={{ color: "hsl(var(--light-fg) / 0.5)" }}>{c.note}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ContactRow;
