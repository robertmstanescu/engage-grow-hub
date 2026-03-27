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

  const [formData, setFormData] = useState({ name: "", email: "", company: "", message: "", subscribed_to_marketing: false });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("submit-contact", {
      body: { name: formData.name, email: formData.email, company: formData.company || null, message: formData.message || null, subscribed_to_marketing: formData.subscribed_to_marketing },
    });
    if (error) { toast.error("Something went wrong."); setSubmitting(false); return; }
    setSubmitted(true); setSubmitting(false); toast.success("Message sent!");
  };

  if (submitted) {
    return (
      <section id="contact" className="snap-section section-light py-32 md:py-40 text-center">
        <div className="max-w-[520px] mx-auto px-8 lg:pl-24">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease }}>
            <h3 className="font-display text-3xl md:text-4xl font-black leading-tight mb-5" style={{ color: "hsl(var(--primary))" }}>Message received.</h3>
            <p className="font-body-heading text-base md:text-lg mb-8" style={{ color: "hsl(var(--light-fg) / 0.6)" }}>We respond within 24 hours.</p>
            <button onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", company: "", message: "", subscribed_to_marketing: false }); }}
              className="font-display text-[11px] uppercase tracking-[0.1em] font-bold px-8 py-4 rounded-full transition-all duration-500 hover:opacity-85"
              style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>
              Send another message
            </button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="snap-section section-light py-32 md:py-40">
      <div className="max-w-[520px] mx-auto px-8 lg:pl-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease }} className="text-center mb-14">
          <h3 className="font-display text-3xl md:text-4xl font-black leading-tight mb-5" style={{ color: "hsl(var(--primary))" }}>
            {titleLines.map((line, i) => (<span key={i}>{i > 0 && <br />}<span dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripP(line)) }} /></span>))}
          </h3>
          <div className="font-body-heading text-base md:text-lg leading-relaxed" style={{ color: "hsl(var(--light-fg) / 0.6)" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }} />
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15, ease }} onSubmit={handleSubmit} className="space-y-7">
          {[
            { label: "Your name", key: "name", type: "text" },
            { label: "Email address", key: "email", type: "email" },
            { label: "Company", key: "company", type: "text" },
          ].map((field) => (
            <div key={field.key}>
              <label className="block font-body text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: "hsl(var(--light-fg) / 0.35)" }}>{field.label}</label>
              <input
                type={field.type} required={field.key !== "company"}
                value={formData[field.key as keyof typeof formData] as string}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full bg-transparent pb-3 font-body text-sm outline-none transition-all duration-500"
                style={{ borderBottom: "1px solid hsl(var(--light-fg) / 0.12)", color: "hsl(var(--light-fg))" }}
                onFocus={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--primary))"}
                onBlur={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--light-fg) / 0.12)"}
              />
            </div>
          ))}
          <div>
            <label className="block font-body text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: "hsl(var(--light-fg) / 0.35)" }}>Tell us about your vampire moment</label>
            <textarea required rows={4} value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full bg-transparent pb-3 font-body text-sm outline-none transition-all duration-500 resize-none"
              style={{ borderBottom: "1px solid hsl(var(--light-fg) / 0.12)", color: "hsl(var(--light-fg))" }}
              onFocus={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--primary))"}
              onBlur={(e) => e.currentTarget.style.borderBottomColor = "hsl(var(--light-fg) / 0.12)"}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.subscribed_to_marketing} onChange={(e) => setFormData({ ...formData, subscribed_to_marketing: e.target.checked })} className="rounded" style={{ accentColor: "hsl(var(--primary))" }} />
            <span className="font-body text-xs" style={{ color: "hsl(var(--light-fg) / 0.4)" }}>Keep me updated with insights and articles</span>
          </label>
          <div className="pt-4 text-center">
            <button type="submit" disabled={submitting}
              className="font-display text-[11px] uppercase tracking-[0.1em] font-bold px-10 py-4 rounded-full transition-all duration-500 hover:opacity-85 disabled:opacity-50"
              style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary-foreground))" }}>
              {submitting ? "Sending…" : "Request a discovery call"}
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  );
};

export default ContactSection;
