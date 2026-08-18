/**
 * SlugField — the anchor/slug editor shared by every item in the admin.
 *
 * A slug turns an item into a linkable target: rows and widgets render
 * it as the DOM `id`, so `/#our-services` scrolls straight to it. The
 * copy button hands the editor a ready-made anchor link to paste into a
 * nav item, a button URL or an email.
 *
 * Input is normalised to a URL-safe slug on change (lowercase, dashes),
 * so editors can type freely.
 */
import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

interface Props {
  label?: string;
  value: string;
  onChange: (slug: string) => void;
  /** Shown as the placeholder — usually the auto-derived fallback slug. */
  placeholder?: string;
  hint?: string;
}

const SlugField = ({
  label = "Slug / anchor",
  value,
  onChange,
  placeholder = "auto",
  hint,
}: Props) => {
  const [copied, setCopied] = useState(false);
  const effective = value || placeholder;

  const copy = async () => {
    if (!effective || effective === "auto") return;
    try {
      await navigator.clipboard.writeText(`#${effective}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard can be blocked (permissions, insecure context). The
         value stays visible in the input, so the editor can copy it
         manually — no need to surface an error. */
    }
  };

  return (
    <div>
      <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-1.5">
        <span className="inline-flex items-center px-2 rounded-lg border border-border bg-muted/30 font-mono text-[11px] text-muted-foreground">
          #
        </span>
        <input
          value={value}
          onChange={(e) => onChange(slugify(e.target.value))}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg font-body text-sm border border-border bg-background text-foreground"
        />
        <button
          type="button"
          onClick={copy}
          title="Copy anchor link"
          aria-label="Copy anchor link"
          className="px-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 text-muted-foreground transition-colors"
        >
          {copied ? <Check size={13} /> : <Link2 size={13} />}
        </button>
      </div>
      <p className="font-body text-[10px] text-muted-foreground mt-1 leading-snug">
        {hint ?? `Links to this item as #${effective || "…"} on its page.`}
      </p>
    </div>
  );
};

export default SlugField;
