/**
 * ─────────────────────────────────────────────────────────────────────────
 * SeoFields.tsx — Per-page SEO + AEO control panel
 * ─────────────────────────────────────────────────────────────────────────
 *
 * One reusable block that surfaces every per-page SEO field an admin can
 * touch:
 *
 *   • Meta Title         → search-engine result title (≤60 chars best)
 *   • Meta Description   → SERP snippet (≤160 chars)
 *   • AI Search Summary  → fed to /llms.txt for ChatGPT / Claude / Perplexity
 *
 * AEO (AI Engine Optimization) — junior-engineer guide
 * ────────────────────────────────────────────────────
 * Modern AI assistants ingest /llms.txt manifests instead of (or alongside)
 * the page HTML. The `ai_summary` field on `cms_pages` and `blog_posts`
 * — and the `main_page_seo.ai_summary` JSON value for the homepage — is
 * what our `llms-txt` edge function reads when generating that manifest.
 *
 * The 60–320 character window matches the heuristic in
 * `AdminInsights.tsx` (`isAiSummaryOptimized`). Anything inside that
 * window scores green; outside scores red. We deliberately allow saving
 * out-of-range text — the counter is guidance, not a hard block.
 *
 * BACKWARD COMPATIBILITY
 * ──────────────────────
 * The AEO field is OPTIONAL. Callers that haven't been wired up yet
 * simply don't pass `aiSummary` / `onAiSummaryChange`, and the AEO
 * block is hidden. This keeps the migration to per-caller AEO support
 * incremental and risk-free.
 * ───────────────────────────────────────────────────────────────────── */

import { useState, useEffect, useRef } from "react";
import { Field } from "./FieldComponents";

/**
 * Debug Story 3.2 — useDeferredText
 * ----------------------------------
 * Local mirror of `useDeferredValue` from FieldComponents but inlined
 * here so we can keep the live character counters reactive while still
 * deferring the upstream commit until blur / Enter. Without this the
 * Meta Description and AI Summary textareas would push a draft mutation
 * (and a full canvas re-render) on EVERY keystroke — the exact failure
 * mode QA reproduces by holding "A" inside a sidebar text field.
 */
const useDeferredText = (externalValue: string, onCommit: (v: string) => void) => {
  const [local, setLocal] = useState(externalValue || "");
  const committedRef = useRef(externalValue || "");

  useEffect(() => {
    if (externalValue !== committedRef.current) {
      setLocal(externalValue || "");
      committedRef.current = externalValue || "";
    }
  }, [externalValue]);

  const commit = () => {
    if (local !== committedRef.current) {
      committedRef.current = local;
      onCommit(local);
    }
  };

  return { local, setLocal, commit };
};

interface Props {
  metaTitle: string;
  metaDescription: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  /** Optional: enables the AI Search Summary block when both are provided. */
  aiSummary?: string;
  onAiSummaryChange?: (v: string) => void;
}

const AEO_MIN = 60;
const AEO_MAX = 320;

const SeoFields = ({
  metaTitle,
  metaDescription,
  onTitleChange,
  onDescriptionChange,
  aiSummary,
  onAiSummaryChange,
}: Props) => {
  const aeoEnabled = typeof onAiSummaryChange === "function";

  // Local mirrors so per-keystroke typing only re-renders THIS component
  // — the upstream draft state (and therefore the canvas) only updates
  // on blur / Enter. The character counters still live-update because
  // they read `local`, not the deferred external value.
  const desc = useDeferredText(metaDescription || "", onDescriptionChange);
  const aeo = useDeferredText(aiSummary || "", onAiSummaryChange || (() => {}));
  const aeoLen = aeo.local.length;
  // Counter is green ONLY inside the 60-320 window — matches AdminInsights.tsx.
  const aeoInRange = aeoLen >= AEO_MIN && aeoLen <= AEO_MAX;

  return (
    <div
      className="space-y-3 p-3 rounded-lg border"
      style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--background))" }}
    >
      <label
        className="font-body text-[10px] uppercase tracking-wider font-medium"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        SEO & Metadata
      </label>

      <Field label="Meta Title (for search engines)" value={metaTitle} onChange={onTitleChange} />

      <div>
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
          Meta Description (for search engines)
        </label>
        <textarea
          value={desc.local}
          onChange={(e) => desc.setLocal(e.target.value)}
          onBlur={desc.commit}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); desc.commit(); } }}
          rows={2}
          maxLength={160}
          placeholder="Brief description for search engines (max 160 chars)"
          className="w-full px-3 py-2 rounded-lg font-body text-sm border resize-none text-black"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
        />
        <span className="font-body text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          {desc.local.length}/160
        </span>
      </div>

      {/* ── AEO BLOCK ─────────────────────────────────────────────────
          Only renders when the parent passes onAiSummaryChange. This is
          the single source of truth for `ai_summary` on every entity:
          the parent decides where the value lives (cms_pages column,
          blog_posts column, or main_page_seo JSON blob) and just hands
          us the value + setter. ───────────────────────────────────── */}
      {aeoEnabled && (
        <div
          className="rounded-md border p-3 space-y-1.5"
          // Soft gold tint mirrors the brand's "AEO" accent used elsewhere.
          style={{
            borderColor: "hsl(46 75% 40% / 0.4)",
            backgroundColor: "hsl(46 75% 60% / 0.06)",
          }}
        >
          <label
            className="font-body text-[10px] uppercase tracking-wider font-medium block flex items-center gap-1.5"
            style={{ color: "hsl(var(--foreground))" }}
            // Tooltip via native title — keeps the field lightweight (no portal).
            title="This summary is fed directly to AI assistants like ChatGPT and Claude via your /llms.txt manifest. Be descriptive and use brand keywords."
          >
            AI Search Summary (AEO)
            <span className="font-body text-[9px] normal-case tracking-normal opacity-70">ⓘ</span>
          </label>
          <p className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            Fed to AI assistants (ChatGPT, Claude, Perplexity) via <code>/llms.txt</code>. Aim for {AEO_MIN}–{AEO_MAX} characters.
          </p>
          <textarea
            value={aeoValue}
            onChange={(e) => onAiSummaryChange!(e.target.value)}
            rows={3}
            placeholder="Describe this page in plain language for AI crawlers."
            className="w-full px-3 py-2 rounded-lg font-body text-sm border resize-none text-black"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
          />
          <div className="flex items-center justify-between">
            <span
              className="font-body text-[10px] font-medium"
              style={{
                // Green inside window, red outside — matches AdminInsights heuristic.
                color: aeoInRange ? "hsl(140 60% 35%)" : "hsl(var(--destructive))",
              }}
            >
              {aeoLen}/{AEO_MAX} chars
              {!aeoInRange && (
                <span className="ml-1 opacity-80">
                  ({aeoLen < AEO_MIN ? `need ${AEO_MIN - aeoLen} more` : `${aeoLen - AEO_MAX} over`})
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeoFields;
