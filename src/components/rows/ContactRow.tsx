import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import type { PageRow, ContactField } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import type { Alignment } from "./PageRows";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";

const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const defaultFields: ContactField[] = [
  { key: "name", label: "Your name", type: "text", required: true, visible: true },
  { key: "email", label: "Email address", type: "email", required: true, visible: true },
  { key: "company", label: "Company", type: "text", required: false, visible: true },
  { key: "message", label: "Tell us about your vampire moment", type: "textarea", required: true, visible: true },
  { key: "marketing", label: "Keep me updated with insights and articles", type: "checkbox", required: false, visible: true },
];

const CREAM = "#F4F0EC";

const ContactRow = ({ row, align = "left" }: { row: PageRow; align?: Alignment }) => {
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

  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const alignClass = align === "center" ? "mx-auto text-center"
    : align === "right" ? "ml-auto mr-0 text-right"
    : "mr-auto ml-0 text-left";

  const leftFields = visibleFields.filter((f) => f.type !== "textarea" && f.type !== "checkbox");
  const textareaField = visibleFields.find((f) => f.type === "textarea");
  const checkboxFields = visibleFields.filter((f) => f.type === "checkbox");

  const gradStart = l.gradientStart || "hsl(280 55% 24% / 0.3)";
  const gradEnd = l.gradientEnd || "transparent";

  const { ref, isVisible } = useScrollReveal();

  if (submitted) {
    return (
      <section className="snap-section section-light relative min-h-screen flex flex-col justify-center py-16" style={{ isolation: "isolate" }}>
        <div className="absolute inset-0 opacity-30 blur-[100px]" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${gradStart}, ${gradEnd})` }} />
        <div className={`relative z-10 max-w-[520px] px-6 ${alignClass}`}>
          <div style={revealStyle(true, 0)}>
            <h3 className="font-display font-black leading-tight mb-4" style={{ color: "hsl(var(--primary))", fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)" }}>{successHeading}</h3>
            <p className="font-body-heading text-sm mb-6" style={{ color: "hsl(var(--light-fg) / 0.7)" }}>{successBody}</p>
            <button onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", company: "", message: "", subscribed_to_marketing: false }); }}
              className="btn-glass font-display text-[10px] uppercase tracking-[0.1em] font-bold px-6 py-3 rounded-full transition-all duration-500 hover:opacity-85"
              style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>{successButton}</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="snap-section section-light relative min-h-screen flex flex-col justify-center" style={{ paddingTop: "clamp(24px, 4vh, 48px)", paddingBottom: "clamp(24px, 4vh, 48px)", isolation: "isolate" }}>
      <div className="absolute inset-0 opacity-30 blur-[100px]" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${gradStart}, ${gradEnd})` }} />

      <div ref={ref} className={`relative z-10 max-w-[900px] px-6 ${alignClass}`}>
        <div className="mb-6" style={revealStyle(isVisible, 0)}>
          {titleLines.length > 0 && (
            <h3 className="font-display font-black leading-tight mb-3" style={{ color: "hsl(var(--primary))", fontSize: "clamp(1.3rem, 3vw, 2rem)" }}>
              {titleLines.map((line, i) => (<span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>))}
            </h3>
          )}
          {c.body && <div className="font-body-heading leading-relaxed" style={{ color: "hsl(var(--light-fg) / 0.7)", fontSize: "clamp(0.8rem, 1.5vw, 1rem)" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }} />}
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
                {leftFields.map((field) => (
                  <div key={field.key}>
                    <label className="block font-body text-[9px] uppercase tracking-[0.25em] mb-1.5 text-left text-white">{field.label}</label>
                    <input type={field.type} required={field.required} value={formData[field.key] || ""}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className="w-full bg-transparent pb-2 font-body text-xs outline-none transition-all duration-500 text-left"
                      style={{ borderBottom: `1px solid ${CREAM}30`, color: CREAM }}
                      onFocus={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--accent))"}
                      onBlur={(e) => e.currentTarget.style.borderBottomColor = `${CREAM}30`} />
                  </div>
                ))}
              </div>

              {textareaField && (
                <div className="flex flex-col">
                  <label className="block font-body text-[9px] uppercase tracking-[0.25em] mb-1.5 text-white">{textareaField.label}</label>
                  <textarea required={textareaField.required} rows={5} value={formData[textareaField.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [textareaField.key]: e.target.value })}
                    className="w-full bg-transparent pb-2 font-body text-xs outline-none transition-all duration-500 resize-none flex-1 text-left"
                    style={{ borderBottom: `1px solid ${CREAM}30`, color: CREAM }}
                    onFocus={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--accent))"}
                    onBlur={(e) => e.currentTarget.style.borderBottomColor = `${CREAM}30`} />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4" style={{ borderTop: `1px solid ${CREAM}15` }}>
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
                className="btn-glass font-display text-[10px] uppercase tracking-[0.1em] font-bold px-8 py-3 rounded-full transition-all duration-500 hover:scale-105 disabled:opacity-50">
                {submitting ? "Sending…" : buttonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactRow;
