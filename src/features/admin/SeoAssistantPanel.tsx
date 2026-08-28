/**
 * ─────────────────────────────────────────────────────────────────────
 * SeoAssistantPanel — "Generate all SEO" button + review panel
 * ─────────────────────────────────────────────────────────────────────
 *
 * One button that asks the AI for every SEO/AEO field at once
 * (meta title, meta description, AI search summary, tags, image alt
 * text) and then shows the results as SUGGESTIONS.
 *
 * NOTHING is saved until the admin clicks "Apply selected" — each
 * suggestion has its own checkbox so you can take the description and
 * ignore the tags, for example. That's deliberate: auto-writing AI text
 * into published metadata without a human read is how sites end up with
 * confidently wrong descriptions.
 *
 * The parent passes `onApply`, receiving only the accepted fields.
 */

import { useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  generateSeoSuggestions,
  type SeoImageInput,
  type SeoSuggestions,
} from "@/services/seoAssistant";

export interface SeoApplyPayload {
  meta_title?: string;
  meta_description?: string;
  ai_summary?: string;
  tags?: string[];
  image_alts?: Array<{ key: string; alt: string }>;
}

interface Props {
  /** Title of the page / post being optimised. */
  sourceTitle: string;
  /** Plain-text body used as the AI's source material. */
  sourceContent: string;
  /** "page" | "blog post" — shapes the AI's tone. */
  kind?: string;
  /** Images that need alt text (omit to skip alt-text suggestions). */
  images?: SeoImageInput[];
  /** Existing tag vocabulary so the AI reuses your taxonomy. */
  knownTags?: string[];
  /** Which fields the caller can actually persist. */
  supports?: { tags?: boolean; images?: boolean };
  onApply: (payload: SeoApplyPayload) => void;
}

type FieldKey = "meta_title" | "meta_description" | "ai_summary" | "tags";

const SeoAssistantPanel = ({
  sourceTitle,
  sourceContent,
  kind = "page",
  images = [],
  knownTags = [],
  supports = {},
  onApply,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SeoSuggestions | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  const run = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await generateSeoSuggestions({
        title: sourceTitle,
        content: sourceContent,
        kind,
        images: supports.images ? images : [],
        knownTags,
      });
      setSuggestions(result);
      // Everything starts accepted — reviewing means UNchecking what you dislike.
      const initial: Record<string, boolean> = {
        meta_title: true,
        meta_description: true,
        ai_summary: true,
        tags: !!supports.tags,
      };
      result.image_alts.forEach((i) => { initial[`alt:${i.key}`] = !!supports.images; });
      setAccepted(initial);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate SEO suggestions");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key: string) => setAccepted((prev) => ({ ...prev, [key]: !prev[key] }));

  const apply = () => {
    if (!suggestions) return;
    const payload: SeoApplyPayload = {};
    if (accepted.meta_title && suggestions.meta_title) payload.meta_title = suggestions.meta_title;
    if (accepted.meta_description && suggestions.meta_description) payload.meta_description = suggestions.meta_description;
    if (accepted.ai_summary && suggestions.ai_summary) payload.ai_summary = suggestions.ai_summary;
    if (accepted.tags && suggestions.tags.length) payload.tags = suggestions.tags;
    const alts = suggestions.image_alts.filter((i) => accepted[`alt:${i.key}`]);
    if (alts.length) payload.image_alts = alts;
    if (Object.keys(payload).length === 0) {
      toast.info("Nothing selected to apply.");
      return;
    }
    onApply(payload);
    setSuggestions(null);
    toast.success("SEO suggestions applied");
  };

  const row = (key: FieldKey | string, label: string, body: React.ReactNode) => (
    <li
      key={key}
      className="flex items-start gap-2 p-2 rounded-md border"
      style={{ borderColor: "hsl(var(--border) / 0.6)", backgroundColor: "hsl(var(--background))" }}
    >
      <input
        type="checkbox"
        checked={!!accepted[key]}
        onChange={() => toggle(key)}
        className="mt-0.5"
        aria-label={`Accept ${label}`}
      />
      <div className="min-w-0 flex-1">
        <div className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          {label}
        </div>
        <div className="font-body text-xs mt-0.5 break-words" style={{ color: "hsl(var(--foreground))" }}>{body}</div>
      </div>
    </li>
  );

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full disabled:opacity-50"
        style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {loading ? "Analysing…" : "Generate all SEO with AI"}
      </button>

      {suggestions && (
        <div
          className="space-y-2 p-3 rounded-lg border"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.3)" }}
        >
          <p className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
            Review suggestions — untick anything you don't want
          </p>
          <ul className="space-y-1.5 max-h-[340px] overflow-y-auto">
            {suggestions.meta_title && row("meta_title", `Meta title · ${suggestions.meta_title.length} chars`, suggestions.meta_title)}
            {suggestions.meta_description && row("meta_description", `Meta description · ${suggestions.meta_description.length} chars`, suggestions.meta_description)}
            {suggestions.ai_summary && row("ai_summary", `AI search summary · ${suggestions.ai_summary.length} chars`, suggestions.ai_summary)}
            {supports.tags && suggestions.tags.length > 0 &&
              row("tags", "Tags", suggestions.tags.join(", "))}
            {supports.images && suggestions.image_alts.map((i) =>
              row(`alt:${i.key}`, `Alt text · ${i.key}`, i.alt),
            )}
          </ul>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={apply}
              className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              <Check size={12} /> Apply selected
            </button>
            <button
              type="button"
              onClick={() => setSuggestions(null)}
              className="font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full border"
              style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeoAssistantPanel;
