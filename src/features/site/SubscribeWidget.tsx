import { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAttributionForPayload } from "@/services/attribution";

const ease = [0.16, 1, 0.3, 1] as const;
type SubscribeWidgetAlignment = "left" | "center" | "right";

interface SubscribeWidgetProps {
  className?: string;
  align?: SubscribeWidgetAlignment;
  /** Optional override for the collapsed-state CTA copy. */
  triggerLabel?: string;
}

/**
 * <SubscribeWidget/> — newsletter opt-in pill that expands into a name+email form.
 *
 * Wrapped in `forwardRef` because parent components (and framer-motion's
 * `AnimatePresence`) sometimes pass a ref through. Without forwardRef, React
 * logs a noisy "Function components cannot be given refs" warning at runtime.
 *
 * The ref is attached to the outermost wrapper so callers can measure or
 * scroll to the widget if needed.
 */
const SubscribeWidget = forwardRef<HTMLDivElement, SubscribeWidgetProps>(
  ({ className = "", align = "center", triggerLabel }, ref) => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const containerAlignClass =
      align === "center" ? "items-center text-center"
      : align === "right" ? "items-end text-right"
      : "items-start text-left";

    const contentAlignClass =
      align === "center" ? "mx-auto"
      : align === "right" ? "ml-auto"
      : "mr-auto";

    const textAlignClass =
      align === "center" ? "text-center"
      : align === "right" ? "text-right"
      : "text-left";

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
            // Epic 4 / US 4.1 — first-touch marketing attribution.
            attribution: getAttributionForPayload(),
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
          ref={ref as React.Ref<HTMLParagraphElement>}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className={`w-full font-body text-sm font-medium ${contentAlignClass} ${textAlignClass} ${className}`}
          style={{ color: "hsl(var(--primary))" }}
        >
          ✓ You're on the list. We'll keep you posted.
        </motion.p>
      );
    }

    return (
      <div ref={ref} className={`flex w-full flex-col ${containerAlignClass} ${className}`}>
        <AnimatePresence mode="wait">
          {!open ? (
            <motion.button
              key="trigger"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease }}
              onClick={() => setOpen(true)}
              className="max-w-full w-fit font-body text-xs uppercase tracking-[0.14em] font-medium px-6 py-3 rounded-full transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {triggerLabel && triggerLabel.trim().length > 0
                ? triggerLabel
                : "Keep me updated with insights & articles"}
            </motion.button>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease }}
              onSubmit={handleSubmit}
              className={`flex w-full max-w-[42rem] ${contentAlignClass} flex-col sm:flex-row items-stretch sm:items-center gap-2`}
            >
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                className="w-full min-w-0 px-4 py-2.5 rounded-full font-body text-sm border-0 outline-none sm:flex-1"
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
                className="w-full min-w-0 px-4 py-2.5 rounded-full font-body text-sm border-0 outline-none sm:flex-1"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                  boxShadow: "0 1px 4px hsl(var(--foreground) / 0.08)",
                }}
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full font-body text-xs uppercase tracking-[0.14em] font-medium transition-opacity hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
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
  },
);

SubscribeWidget.displayName = "SubscribeWidget";

export default SubscribeWidget;
