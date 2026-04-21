import { useState, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SubscribeWidgetAlignment = "left" | "center" | "right";

interface SubscribeWidgetProps {
  className?: string;
  align?: SubscribeWidgetAlignment;
}

/**
 * <SubscribeWidget/> — newsletter opt-in pill that expands into a name+email form.
 * Animations removed per design decision; trigger ↔ form swap is now an instant render.
 */
const SubscribeWidget = forwardRef<HTMLDivElement, SubscribeWidgetProps>(
  ({ className = "", align = "center" }, ref) => {
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
        <p
          ref={ref as React.Ref<HTMLParagraphElement>}
          className={`w-full font-body text-sm font-medium ${contentAlignClass} ${textAlignClass} ${className}`}
          style={{ color: "hsl(var(--primary))" }}
        >
          ✓ You're on the list. We'll keep you posted.
        </p>
      );
    }

    return (
      <div ref={ref} className={`flex w-full flex-col ${containerAlignClass} ${className}`}>
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="max-w-full w-fit font-body text-xs uppercase tracking-[0.14em] font-medium px-6 py-3 rounded-full hover:opacity-80"
            style={{
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            Keep me updated with insights &amp; articles
          </button>
        ) : (
          <form
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
              className="w-full sm:w-auto px-5 py-2.5 rounded-full font-body text-xs uppercase tracking-[0.14em] font-medium hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
              style={{
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {submitting ? "…" : "Subscribe"}
            </button>
          </form>
        )}
      </div>
    );
  },
);

SubscribeWidget.displayName = "SubscribeWidget";

export default SubscribeWidget;
