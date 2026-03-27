import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent } from "@/hooks/useSiteContent";
import { sanitizeHtml } from "@/lib/sanitize";
import type { PageRow, ContactField } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";

const ease = [0.16, 1, 0.3, 1] as const;
const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

const defaultFields: ContactField[] = [
  { key: "name", label: "Your name", type: "text", required: true, visible: true },
  { key: "email", label: "Email address", type: "email", required: true, visible: true },
  { key: "company", label: "Company", type: "text", required: false, visible: true },
  { key: "message", label: "Tell us about your vampire moment", type: "textarea", required: true, visible: true },
  { key: "marketing", label: "Keep me updated with insights and articles", type: "checkbox", required: false, visible: true },
];

const ContactRow = ({ row }: { row: PageRow }) => {
  const c = row.content;
  const titleLines: string[] = (c.title_lines || []).map((l: any) =>
    typeof l === "string" ? l.startsWith("<") ? l : `<p>${l}</p>` : `<p>${l}</p>`
  );
  const fields: ContactField[] = c.fields || defaultFields;
  const visibleFields = fields.filter((f) => f.visible);
  const buttonText = c.button_text || "Request a discovery call";
  const successHeading = c.success_heading || "Message received.";
  const successBody = c.success_body || "We respond within 24 hours. Thank you for reaching out.";
  const successButton = c.success_button || "Send another message";

  const socialLinks = useSiteContent<Record<string, string>>("social_links", {});

  const [formData, setFormData] = useState<Record<string, any>>({
    name: "", email: "", company: "", message: "", subscribed_to_marketing: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("submit-contact", {
      body: {
        name: formData.name,
        email: formData.email,
        company: formData.company || null,
        message: formData.message || null,
        subscribed_to_marketing: formData.subscribed_to_marketing || false,
      },
    });

    if (error) {
      toast.error("Something went wrong.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
    toast.success("Message sent!");
  };

  if (submitted) {
    return (
      <section className="bg-white">
        <div className="max-w-[520px] mx-auto px-8 md:px-12 py-20 md:py-28 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease }}>
            <h3 className="font-display text-2xl md:text-4xl font-black leading-tight mb-5" style={{ color: "hsl(var(--contact-success-fg))" }}>{successHeading}</h3>
            <p className="font-body-heading text-base md:text-lg mb-8" style={{ color: "hsl(var(--contact-success-fg) / 0.7)" }}>{successBody}</p>
            <button
              onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", company: "", message: "", subscribed_to_marketing: false }); }}
              className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-8 py-4 rounded-full hover:opacity-85 transition-all duration-500 bg-secondary text-primary-foreground">
              {successButton}
            </button>
          </motion.div>
        </div>
      </section>
    );
  }

  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };

  return (
    <section style={{
      backgroundColor: row.bg_color || "hsl(var(--contact-bg))",
      paddingTop: `${l.paddingTop}px`,
      paddingBottom: `${l.paddingBottom}px`,
      marginTop: l.marginTop ? `${l.marginTop}px` : undefined,
      marginBottom: l.marginBottom ? `${l.marginBottom}px` : undefined,
    }}>
      <div className="max-w-[520px] mx-auto px-8 md:px-12">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }} className="text-center mb-12">
          {titleLines.length > 0 && (
            <h3 className="font-display text-2xl md:text-4xl font-black leading-tight mb-5" style={{ color: "hsl(var(--contact-title))" }}>
              {titleLines.map((line, i) => (
                <span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>
              ))}
            </h3>
          )}
          {c.body && <div className="font-body-heading text-base md:text-lg leading-relaxed" style={{ color: "hsl(var(--contact-body))" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }} />}
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15, ease }} onSubmit={handleSubmit} className="space-y-6">
          {visibleFields.filter((f) => f.type !== "checkbox").map((field) => (
            <div key={field.key} className="relative">
              <label className="block font-body text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "hsl(var(--contact-label) / 0.5)" }}>{field.label}</label>
              {field.type === "textarea" ? (
                <textarea
                  required={field.required}
                  rows={4}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className="w-full bg-transparent pb-3 font-body text-sm outline-none transition-all duration-500 resize-none"
                  style={{ borderBottom: "1px solid hsl(var(--contact-input-border) / 0.15)", color: "hsl(var(--contact-input-text))" }}
                  onFocus={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--contact-input-focus))"}
                  onBlur={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--contact-input-border) / 0.15)"}
                />
              ) : (
                <input
                  type={field.type}
                  required={field.required}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className="w-full bg-transparent pb-3 font-body text-sm outline-none transition-all duration-500"
                  style={{ borderBottom: "1px solid hsl(var(--contact-input-border) / 0.15)", color: "hsl(var(--contact-input-text))" }}
                  onFocus={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--contact-input-focus))"}
                  onBlur={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--contact-input-border) / 0.15)"}
                />
              )}
            </div>
          ))}

          {visibleFields.filter((f) => f.type === "checkbox").map((field) => (
            <label key={field.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.subscribed_to_marketing || false}
                onChange={(e) => setFormData({ ...formData, subscribed_to_marketing: e.target.checked })}
                className="rounded"
                style={{ accentColor: "hsl(var(--primary))" }}
              />
              <span className="font-body text-xs" style={{ color: "hsl(var(--contact-label) / 0.5)" }}>{field.label}</span>
            </label>
          ))}

          <div className="pt-6 text-center">
            <button type="submit" disabled={submitting} className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-10 py-4 rounded-full hover:opacity-85 transition-all duration-500 disabled:opacity-50" style={{ backgroundColor: "hsl(var(--contact-btn-bg))", color: "hsl(var(--contact-btn-text))" }}>
              {submitting ? "Sending…" : buttonText}
            </button>
          </div>
        </motion.form>

        {c.show_social && Object.values(socialLinks).some((v: any) => v?.trim()) && (
          <div className="mt-10 text-center">
            <p className="font-body text-[10px] uppercase tracking-wider mb-3" style={{ color: "hsl(var(--contact-label) / 0.3)" }}>Find us on</p>
            <div className="flex items-center justify-center gap-3">
              {Object.entries(socialLinks).filter(([, url]) => url?.trim()).map(([key, url]) => (
                <a key={key} href={url as string} target="_blank" rel="noopener noreferrer" className="font-body text-xs underline hover:opacity-70 transition-all duration-500" style={{ color: "hsl(var(--contact-title))" }}>
                  {key}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ContactRow;
