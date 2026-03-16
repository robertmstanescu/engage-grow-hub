import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ease = [0.16, 1, 0.3, 1] as const;

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, create a mailto link. Cloud integration will enable actual email sending.
    const subject = encodeURIComponent(`Consultation request from ${formData.name} — ${formData.company}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nCompany: ${formData.company}\n\nMessage:\n${formData.message}`
    );
    window.location.href = `mailto:hello@themagiccoffin.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
    toast.success("Opening your email client…");
  };

  if (submitted) {
    return (
      <section id="contact" className="bg-accent py-20 text-center">
        <div className="max-w-[520px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease }}
          >
            <h3 className="font-display text-2xl md:text-3xl font-black text-accent-foreground leading-tight mb-4">
              Message received.
            </h3>
            <p className="font-body-heading text-base text-accent-foreground/70 mb-6">
              We respond within 24 hours. In the meantime, check your email client to send the message.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="font-display text-[11px] uppercase tracking-[0.08em] font-bold bg-secondary text-accent px-8 py-3.5 rounded-full hover:opacity-85 transition-opacity"
            >
              Send another message
            </button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="bg-accent py-20">
      <div className="max-w-[520px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-10"
        >
          <h3 className="font-display text-2xl md:text-3xl font-black text-accent-foreground leading-tight mb-4">
            Not sure where to start?
            <br />
            Lift the lid first.
          </h3>
          <p className="font-body-heading text-base text-accent-foreground/70">
            Book a free 30-minute consultation. We'll identify your biggest vampire moment
            and tell you honestly whether we're the right fit to bury it.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {[
            { label: "Your name", key: "name", type: "text" },
            { label: "Email address", key: "email", type: "email" },
            { label: "Company", key: "company", type: "text" },
          ].map((field) => (
            <div key={field.key} className="relative group">
              <label className="block font-body text-[10px] uppercase tracking-[0.15em] text-accent-foreground/60 mb-1.5">
                {field.label}
              </label>
              <input
                type={field.type}
                required
                value={formData[field.key as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                className="w-full bg-transparent border-b-2 border-accent-foreground/20 focus:border-primary pb-2 font-body text-sm text-accent-foreground outline-none transition-colors duration-200"
              />
            </div>
          ))}
          <div className="relative">
            <label className="block font-body text-[10px] uppercase tracking-[0.15em] text-accent-foreground/60 mb-1.5">
              Tell us about your vampire moment
            </label>
            <textarea
              required
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full bg-transparent border-b-2 border-accent-foreground/20 focus:border-primary pb-2 font-body text-sm text-accent-foreground outline-none transition-colors duration-200 resize-none"
            />
          </div>
          <div className="pt-4 text-center">
            <button
              type="submit"
              className="font-display text-[11px] uppercase tracking-[0.08em] font-bold bg-secondary text-accent px-8 py-3.5 rounded-full hover:opacity-85 transition-opacity"
            >
              Request a discovery call
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  );
};

export default ContactSection;
