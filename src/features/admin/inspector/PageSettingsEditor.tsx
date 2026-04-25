/**
 * ════════════════════════════════════════════════════════════════════
 * PageSettingsEditor — US 3.4 Inspector fallback
 * ════════════════════════════════════════════════════════════════════
 *
 * Renders inside the right Inspector when nothing on the canvas is
 * selected (the "Page Settings" empty-state). Surfaces the page-level
 * controls SEO managers used to have to leave the visual builder for:
 *
 *   • Internal Page Name   — admin-only label, drives the topbar
 *                            ("Editing: About Us") and the Pages list.
 *   • URL Slug             — public path (`/about-us`).
 *   • SEO Meta Title       — search-engine result title.
 *   • SEO Meta Description — SERP snippet.
 *   • Open Graph Image     — link-preview image used by social platforms.
 *
 * BACKWARDS COMPAT
 * ────────────────
 * Every page-level prop is optional. The main-page builder (which has
 * no internal name or slug to edit) simply omits those handlers and
 * the component hides those rows. The CMS-page builder passes the full
 * set so editors get every field documented in the AC.
 */
import { useEffect, useRef, useState } from "react";
import { Field } from "../site-editor/FieldComponents";
import SeoFields from "../site-editor/SeoFields";

export interface PageSettingsEditorProps {
  /** Internal label shown in the topbar / Pages table (CMS pages only). */
  pageName?: string;
  onPageNameChange?: (v: string) => void;

  /** URL path (CMS pages only). Stored without the leading slash in the
   *  database; we render it with one to match what users see in the
   *  address bar. */
  pageSlug?: string;
  onPageSlugChange?: (v: string) => void;

  /** SEO. Always shown — every page type has these. */
  seoMetaTitle: string;
  seoMetaDescription: string;
  onSeoTitleChange: (v: string) => void;
  onSeoDescriptionChange: (v: string) => void;

  /** Open-graph image URL. Optional — main page can opt out for now. */
  ogImage?: string;
  onOgImageChange?: (v: string) => void;
}

/**
 * Local-mirror text input (deferred commit on blur / Enter) so typing in
 * the slug or page name doesn't fire a write — and a downstream
 * re-render of the entire canvas — on every keystroke. Mirrors the
 * `useDeferredText` pattern in SeoFields.tsx.
 */
const useDeferredText = (
  externalValue: string,
  onCommit: (v: string) => void,
) => {
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

/**
 * Normalize whatever the editor types into a clean URL slug:
 *   "/About Us"   → "about-us"
 *   "About / Us"  → "about-us"
 *   "ABOUT-us!"   → "about-us"
 * We strip the leading slash, lowercase, swap whitespace and any
 * punctuation other than dash/underscore for "-", and collapse runs.
 *
 * The final value is what gets persisted; the input itself shows
 * whatever the user typed until they blur, so we don't fight the cursor.
 */
const cleanSlug = (raw: string): string =>
  raw
    .trim()
    .replace(/^\/+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const PageSettingsEditor = (props: PageSettingsEditorProps) => {
  const {
    pageName,
    onPageNameChange,
    pageSlug,
    onPageSlugChange,
    seoMetaTitle,
    seoMetaDescription,
    onSeoTitleChange,
    onSeoDescriptionChange,
    ogImage,
    onOgImageChange,
  } = props;

  const showName = typeof onPageNameChange === "function";
  const showSlug = typeof onPageSlugChange === "function";
  const showOg = typeof onOgImageChange === "function";

  // Deferred mirrors so per-keystroke typing doesn't churn the rest of
  // the editor. Each commits on blur / Enter, mirroring SeoFields.
  const name = useDeferredText(pageName || "", (v) => onPageNameChange?.(v));
  const slug = useDeferredText(pageSlug || "", (v) =>
    onPageSlugChange?.(cleanSlug(v)),
  );

  return (
    <div className="space-y-4">
      <p
        className="font-body text-[11px] leading-relaxed"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        Click an element on the canvas to edit it. Otherwise, these
        page-wide settings apply.
      </p>

      {(showName || showSlug) && (
        <div
          className="space-y-3 p-3 rounded-lg border"
          style={{
            borderColor: "hsl(var(--border) / 0.5)",
            backgroundColor: "hsl(var(--background))",
          }}
        >
          <label
            className="font-body text-[10px] uppercase tracking-wider font-medium"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Page
          </label>

          {showName && (
            <div>
              <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                Internal Page Name
              </label>
              <input
                type="text"
                value={name.local}
                onChange={(e) => name.setLocal(e.target.value)}
                onBlur={name.commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    name.commit();
                  }
                }}
                placeholder="e.g. About Us"
                className="w-full px-3 py-2 rounded-lg font-body text-sm border text-black"
                style={{
                  borderColor: "hsl(var(--border))",
                  backgroundColor: "hsl(var(--background))",
                }}
              />
              <span
                className="font-body text-[9px] mt-1 block"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Shown in the topbar and the Pages list. Not visible to
                visitors.
              </span>
            </div>
          )}

          {showSlug && (
            <div>
              <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                URL Slug
              </label>
              <div className="flex items-stretch border rounded-lg overflow-hidden"
                style={{
                  borderColor: "hsl(var(--border))",
                  backgroundColor: "hsl(var(--background))",
                }}
              >
                <span
                  className="px-2 flex items-center font-body text-xs select-none"
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    backgroundColor: "hsl(var(--muted) / 0.4)",
                  }}
                >
                  /
                </span>
                <input
                  type="text"
                  value={slug.local}
                  onChange={(e) => slug.setLocal(e.target.value)}
                  onBlur={slug.commit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault;
                      slug.commit();
                    }
                  }}
                  placeholder="about-us"
                  className="flex-1 px-2 py-2 font-body text-sm text-black bg-transparent outline-none"
                />
              </div>
              <span
                className="font-body text-[9px] mt-1 block"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Public URL path. Lowercase, dashes only — auto-cleaned on
                blur.
              </span>
            </div>
          )}
        </div>
      )}

      <SeoFields
        metaTitle={seoMetaTitle}
        metaDescription={seoMetaDescription}
        onTitleChange={onSeoTitleChange}
        onDescriptionChange={onSeoDescriptionChange}
      />

      {showOg && (
        <div
          className="space-y-3 p-3 rounded-lg border"
          style={{
            borderColor: "hsl(var(--border) / 0.5)",
            backgroundColor: "hsl(var(--background))",
          }}
        >
          <label
            className="font-body text-[10px] uppercase tracking-wider font-medium"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Social Sharing
          </label>
          <Field
            label="Open Graph Image (URL)"
            value={ogImage || ""}
            onChange={(v) => onOgImageChange?.(v)}
          />
          {ogImage ? (
            <div
              className="rounded-md overflow-hidden border"
              style={{ borderColor: "hsl(var(--border) / 0.5)" }}
            >
              {/* Plain <img> (not next/image) — admin-only preview, no
                  optimisation needed. The source is whatever URL the
                  editor pasted in; failures fall back to the alt text. */}
              <img
                src={ogImage}
                alt="Open Graph preview"
                className="w-full h-auto block"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display =
                    "none";
                }}
              />
            </div>
          ) : (
            <p
              className="font-body text-[10px]"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Paste a public image URL (1200×630 recommended) for
              link previews on social platforms.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PageSettingsEditor;
