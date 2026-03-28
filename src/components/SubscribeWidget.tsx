import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ease = [0.16, 1, 0.3, 1] as const;

interface SubscribeWidgetProps {
  className?: string;
}

const SubscribeWidget = ({ className = "" }: SubscribeWidgetProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in both fields");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-contact", {
        body: {
          name: name.trim(),
          email: email.trim(),
          company: null,
          message: null,
          subscribed_to_marketing: true,
        },
      });
      if (error) throw error;
      setDone(true);
      toast.success("You're subscribed!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className={`font-body text-sm font-medium ${className}`}
        style={{ color: "hsl(var(--primary))" }}
      >
        ✓ You're on the list. We'll keep you posted.
      </motion.p>
    );
  }

  return (
    <div className={`inline-flex flex-col items-stretch ${className}`}>
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="trigger"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease }}
            onClick={() => setOpen(true)}
            className="font-body text-xs uppercase tracking-[0.14em] font-medium px-6 py-3 rounded-full transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            Keep me updated with insights &amp; articles
          </motion.button>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease }}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full max-w-md"
          >
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
              className="flex-1 px-4 py-2.5 rounded-full font-body text-sm border-0 outline-none"
              style={{
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                boxShadow: "0 1px 4px hsl(var(--foreground) / 0.08)",
              }}
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={320}
              className="flex-1 px-4 py-2.5 rounded-full font-body text-sm border-0 outline-none"
              style={{
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                boxShadow: "0 1px 4px hsl(var(--foreground) / 0.08)",
              }}
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-full font-body text-xs uppercase tracking-[0.14em] font-medium transition-opacity hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
              style={{
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {submitting ? "…" : "Subscribe"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubscribeWidget;
