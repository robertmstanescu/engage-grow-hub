/**
 * ResourceWidget — gated lead-magnet download card.
 *
 * Layout
 * ──────
 *   • Single rounded container with `overflow: hidden` so child rounding
 *     cannot bleed past the card's edge.
 *   • Desktop (md+) : 2-column grid, image on the left fills the full
 *     height of the form, gradient overlay carries the title + description.
 *   • Mobile        : columns stack; image is on top with a fixed aspect
 *     ratio so the card never explodes vertically on tall phones.
 *
 * Behaviour
 * ─────────
 *   • The 4-field form is the gate. We trim every input, lowercase the
 *     email, run a regex check, and submit through the `submit-lead`
 *     edge function (server-side validation + lead upsert).
 *   • The download trigger only runs when the edge function returns
 *     `download_url` — i.e. the upsert succeeded. We open the file in a
 *     new tab so the user does not lose the page they were reading.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fetchAssetById, getAssetPublicUrl, type MediaAsset } from "@/services/mediaLibrary";
import { submitLeadAndGetDownload } from "@/services/leads";

const CREAM = "#F4F0EC";
const ease = [0.16, 1, 0.3, 1] as const;
const EMAIL_REGEX = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

interface Props {
  /** Required: id of the gated resource asset. */
  resourceAssetId: string;
  /** Optional: id of a cover image asset. Falls back to the resource itself if it's an image. */
  coverAssetId?: string | null;
  /** Heading shown on the image overlay. Defaults to the asset's title. */
  title?: string;
  /** Sub-line under the title. Defaults to the asset's description. */
  description?: string;
}

interface FormState {
  fullName: string;
  companyUniversity: string;
  title: string;
  email: string;
}

const ResourceWidget = ({ resourceAssetId, coverAssetId, title, description }: Props) => {
  const [resource, setResource] = useState<MediaAsset | null>(null);
  const [cover, setCover] = useState<MediaAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    fullName: "",
    companyUniversity: "",
    title: "",
    email: "",
  });

  // Fetch resource + cover metadata. We allow the resource to double as
  // its own cover when no separate cover is set (common case for image
  // lead magnets).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [resourceRes, coverRes] = await Promise.all([
        fetchAssetById(resourceAssetId),
        coverAssetId ? fetchAssetById(coverAssetId) : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      const resourceData = (resourceRes.data as MediaAsset | null) ?? null;
      const coverData = (coverRes.data as MediaAsset | null) ?? null;
      setResource(resourceData);
      setCover(coverData ?? resourceData);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [resourceAssetId, coverAssetId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resource) return;

    const payload = {
      fullName: form.fullName.trim(),
      companyUniversity: form.companyUniversity.trim(),
      title: form.title.trim(),
      email: form.email.trim().toLowerCase(),
    };

    if (!payload.fullName || !payload.companyUniversity || !payload.title) {
      toast.error("Please fill in every field.");
      return;
    }
    if (!EMAIL_REGEX.test(payload.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    const { downloadUrl, error } = await submitLeadAndGetDownload({
      ...payload,
      resourceAssetId: resource.id,
      marketingConsent: true,
    });
    setSubmitting(false);

    if (error || !downloadUrl) {
      toast.error(error || "Something went wrong. Please try again.");
      return;
    }

    // Gate cleared — open the download. We use window.open so the user
    // keeps the article in their current tab.
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
    toast.success("Thanks! Your download is opening in a new tab.");
    setForm({ fullName: "", companyUniversity: "", title: "", email: "" });
  };

  if (loading) {
    return (
      <div
        className="rounded-2xl h-64 animate-pulse"
        style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}
        aria-busy="true"
      />
    );
  }

  if (!resource) {
    return (
      <div
        className="rounded-2xl p-6 font-body text-sm"
        style={{ backgroundColor: "hsl(var(--muted) / 0.3)", color: "hsl(var(--muted-foreground))" }}
      >
        Lead magnet not found.
      </div>
    );
  }

  const heading = title || resource.title || "Download the resource";
  const subhead = description || resource.description || "Enter your details to get instant access.";
  const coverUrl = cover ? getAssetPublicUrl(cover.storage_path) : null;
  const coverAlt = cover?.alt_text || heading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease }}
      className="overflow-hidden rounded-2xl"
      style={{
        backgroundColor: "hsl(280 55% 24%)",
        border: "1px solid hsl(280 55% 35% / 0.4)",
        boxShadow: "0 20px 60px -15px hsl(280 55% 15% / 0.5)",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* ── Image column ── */}
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[360px]">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={coverAlt}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-purple-700" />
          )}

          {/* Shadow overlay — keeps text legible regardless of source image. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
            }}
          />

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <h3
              className="font-display text-xl md:text-2xl font-bold leading-tight"
              style={{ color: CREAM, fontFamily: "'Bricolage Grotesque', 'Unbounded', sans-serif" }}
            >
              {heading}
            </h3>
            <p
              className="mt-2 font-body text-sm md:text-base"
              style={{ color: `${CREAM}cc` }}
            >
              {subhead}
            </p>
          </div>
        </div>

        {/* ── Form column ── styling cloned from ContactSection ── */}
        <div className="p-6 md:p-8 relative">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, hsl(280 55% 40% / 0.4) 0%, transparent 50%, hsl(280 55% 30% / 0.2) 100%)",
            }}
          />
          <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
            {[
              { label: "Full name", key: "fullName", type: "text" },
              { label: "Company / university", key: "companyUniversity", type: "text" },
              { label: "Title", key: "title", type: "text" },
              { label: "Email address", key: "email", type: "email" },
            ].map((field) => (
              <div key={field.key}>
                <label
                  className="block font-body text-[10px] uppercase tracking-[0.25em] mb-2"
                  style={{ color: `${CREAM}99` }}
                >
                  {field.label}
                </label>
                <input
                  type={field.type}
                  required
                  value={form[field.key as keyof FormState]}
                  onChange={(e) =>
                    setForm({ ...form, [field.key]: e.target.value })
                  }
                  className="w-full bg-transparent pb-2 font-body text-sm outline-none transition-all duration-300"
                  style={{ borderBottom: `1px solid ${CREAM}30`, color: CREAM }}
                  onFocus={(e) => (e.currentTarget.style.borderBottomColor = "hsl(var(--accent))")}
                  onBlur={(e) => (e.currentTarget.style.borderBottomColor = `${CREAM}30`)}
                />
              </div>
            ))}

            <p className="font-body text-[11px] leading-relaxed" style={{ color: `${CREAM}99` }}>
              By clicking download, you agree to our Privacy Policy and consent to be contacted for
              consulting insights and marketing updates. You can unsubscribe at any time.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="btn-glass font-display text-[11px] uppercase tracking-[0.1em] font-bold px-8 py-3 rounded-full transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {submitting ? "Sending…" : "Download now"}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default ResourceWidget;
