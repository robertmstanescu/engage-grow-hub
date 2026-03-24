import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent } from "@/hooks/useSiteContent";
import { sanitizeHtml } from "@/lib/sanitize";

const ease = [0.16, 1, 0.3, 1] as const;
const stripP = (html: string) => html.replace(/^<p>/, "").replace(/<\/p>$/, "");

interface ContactContent {
  title_line1?: string;
  title_line2?: string;
  title_lines?: any[];
  body: string;
}

const fallback: ContactContent = {
  title_lines: ["<p>Not sure where to start?</p>", "<p>Lift the lid first.</p>"],
  body: "Book a free 30-minute consultation. We'll identify your biggest vampire moment and tell you honestly whether we're the right fit to bury it.",
};

const ContactSection = () => {
  const c = useSiteContent<ContactContent>("contact", fallback);

  const titleLines: string[] = (c.title_lines || [c.title_line1 || "", c.title_line2 || ""]).map(
    (l: any) => (typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`)
  );

  const [formData, setFormData] = useState({
    name: "", email: "", company: "", message: "", subscribed_to_marketing: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const id = crypto.randomUUID();
    const { error } = await supabase.from("contacts").insert({
      id,
      name: formData.name, email: formData.email,
      company: formData.company || null, message: formData.message || null,
      subscribed_to_marketing: formData.subscribed_to_marketing,
    });
    if (error) { toast.error("Something went wrong. Please try again."); setSubmitting(false); return; }

    // Send notification email to hello@themagiccoffin.com
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "contact-notification",
        recipientEmail: formData.email,
        idempotencyKey: `contact-notify-${id}`,
        templateData: {
          name: formData.name,
          email: formData.email,
          company: formData.company || undefined,
          message: formData.message || undefined,
        },
      },
    });

    setSubmitted(true); setSubmitting(false); toast.success("Message sent successfully!");
  };

  if (submitted) {
    return (
      <section id="contact" className="scope-contact py-20 text-center" style={{ backgroundColor: "hsl(var(--contact-success-bg))" }}>
        <div className="max-w-[520px] mx-auto px-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease }}>
            <h3 className="font-display text-2xl md:text-3xl font-black leading-tight mb-4" style={{ color: "hsl(var(--contact-success-fg))" }}>Message received.</h3>
            <p className="font-body-heading text-base mb-6" style={{ color: "hsl(var(--contact-success-fg) / 0.7)" }}>We respond within 24 hours. Thank you for reaching out.</p>
            <button
              onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", company: "", message: "", subscribed_to_marketing: false }); }}
              className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-8 py-3.5 rounded-full hover:opacity-85 transition-opacity"
              style={{ backgroundColor: "hsl(var(--contact-success-btn-bg))", color: "hsl(var(--contact-success-btn-text))" }}>
              Send another message
            </button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="scope-contact py-20" style={{ backgroundColor: "hsl(var(--contact-bg))" }}>
      <div className="max-w-[520px] mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease }} className="text-center mb-10">
          <h3 className="font-display text-2xl md:text-3xl font-black leading-tight mb-4" style={{ color: "hsl(var(--contact-title))" }}>
            {titleLines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} />
              </span>
            ))}
          </h3>
          <div className="font-body-heading text-base" style={{ color: "hsl(var(--contact-body))" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }} />
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15, ease }} onSubmit={handleSubmit} className="space-y-5">
          {[
            { label: "Your name", key: "name", type: "text" },
            { label: "Email address", key: "email", type: "email" },
            { label: "Company", key: "company", type: "text" },
          ].map((field) => (
            <div key={field.key} className="relative group">
              <label className="block font-body text-[10px] uppercase tracking-[0.15em] mb-1.5" style={{ color: "hsl(var(--contact-label) / 0.6)" }}>{field.label}</label>
              <input
                type={field.type}
                required={field.key !== "company"}
                value={formData[field.key as keyof typeof formData] as string}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full bg-transparent pb-2 font-body text-sm outline-none transition-colors duration-200"
                style={{ borderBottom: "2px solid hsl(var(--contact-input-border) / 0.2)", color: "hsl(var(--contact-input-text))" }}
                onFocus={(e) => e.currentTarget.style.borderBottomColor = `hsl(var(--contact-input-focus))`}
                onBlur={(e) => e.currentTarget.style.borderBottomColor = `hsl(var(--contact-input-border) / 0.2)`}
              />
            </div>
          ))}
          <div className="relative">
            <label className="block font-body text-[10px] uppercase tracking-[0.15em] mb-1.5" style={{ color: "hsl(var(--contact-label) / 0.6)" }}>Tell us about your vampire moment</label>
            <textarea
              required rows={4} value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full bg-transparent pb-2 font-body text-sm outline-none transition-colors duration-200 resize-none"
              style={{ borderBottom: "2px solid hsl(var(--contact-input-border) / 0.2)", color: "hsl(var(--contact-input-text))" }}
              onFocus={(e) => e.currentTarget.style.borderBottomColor = `hsl(var(--contact-input-focus))`}
              onBlur={(e) => e.currentTarget.style.borderBottomColor = `hsl(var(--contact-input-border) / 0.2)`}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.subscribed_to_marketing} onChange={(e) => setFormData({ ...formData, subscribed_to_marketing: e.target.checked })} className="rounded" style={{ accentColor: "hsl(var(--primary))" }} />
            <span className="font-body text-xs" style={{ color: "hsl(var(--contact-label) / 0.6)" }}>Keep me updated with insights and articles</span>
          </label>
          <div className="pt-4 text-center">
            <button type="submit" disabled={submitting} className="font-display text-[11px] uppercase tracking-[0.08em] font-bold px-8 py-3.5 rounded-full hover:opacity-85 transition-opacity disabled:opacity-50" style={{ backgroundColor: "hsl(var(--contact-btn-bg))", color: "hsl(var(--contact-btn-text))" }}>
              {submitting ? "Sending…" : "Request a discovery call"}
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  );
};

export default ContactSection;
