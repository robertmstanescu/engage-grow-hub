import { Monitor, Tablet, Smartphone, Eye, Pencil, Save, Send, FileText, ExternalLink } from "lucide-react";

/**
 * Viewport modes drive the Canvas wrapper width in SiteEditor.
 *
 *   desktop → 100% (no constraint)
 *   tablet  → 768 px, centered
 *   mobile  → 375 px, centered
 *
 * WHY: Editors need to sanity-check responsive stacking before publish.
 * We use a CSS max-width swap (no iframes) so the actual rendered widget
 * tree reflows naturally at the simulated breakpoint.
 */
export type ViewportMode = "desktop" | "tablet" | "mobile";

/**
 * EPIC 2 / US 2.1 — Topbar Action Consolidation
 * ----------------------------------------------
 * Edit / Preview is now an in-place TOGGLE that hides or shows the left
 * (Elements) and right (Inspector) panes. It's grouped with the viewport
 * segment in the toolbar's CENTER so context-switching feels like one
 * unified control panel.
 *
 *   "edit"    — full 3-pane builder (default)
 *   "preview" — toolbar + canvas only (mimics the live site)
 */
export type PreviewMode = "edit" | "preview";

interface AdminBuilderToolbarProps {
  viewport: ViewportMode;
  onViewportChange: (v: ViewportMode) => void;

  /** In-place Edit/Preview toggle (US 2.1). */
  previewMode: PreviewMode;
  onPreviewModeChange: (m: PreviewMode) => void;

  // Save Draft (active section)
  onSaveDraft: () => void;
  saving: boolean;
  saveLabel?: string;

  // Open the rendered page in a new tab (separate from the in-place toggle).
  onPreview: () => void;
  onPublish: () => void;
  publishing: boolean;
  hasChanges: boolean;
}

const VIEWPORTS: { key: ViewportMode; label: string; Icon: typeof Monitor }[] = [
  { key: "desktop", label: "Desktop", Icon: Monitor },
  { key: "tablet", label: "Tablet", Icon: Tablet },
  { key: "mobile", label: "Mobile", Icon: Smartphone },
];

const MODES: { key: PreviewMode; label: string; Icon: typeof Pencil }[] = [
  { key: "edit", label: "Edit", Icon: Pencil },
  { key: "preview", label: "Preview", Icon: Eye },
];

const AdminBuilderToolbar = ({
  viewport,
  onViewportChange,
  previewMode,
  onPreviewModeChange,
  onSaveDraft,
  saving,
  saveLabel = "Save Draft",
  onPreview,
  onPublish,
  publishing,
  hasChanges,
}: AdminBuilderToolbarProps) => {
  // Reusable segment styling so the two pill groups stay visually identical.
  const segmentBtn = (active: boolean): React.CSSProperties => ({
    backgroundColor: active ? "hsl(var(--accent))" : "transparent",
    color: active ? "hsl(var(--accent-foreground))" : "hsl(var(--muted-foreground))",
  });

  return (
    <div
      className="sticky top-0 z-30 grid items-center gap-3 px-4 py-2.5 border-b backdrop-blur-md"
      style={{
        backgroundColor: "hsl(var(--card) / 0.95)",
        borderColor: "hsl(var(--border) / 0.5)",
        // 3-column grid keeps the center group truly centered, regardless
        // of how wide the left title or right action cluster grows.
        gridTemplateColumns: "1fr auto 1fr",
      }}
    >
      {/* LEFT — title + dirty pill */}
      <div className="flex items-center gap-3 min-w-0">
        <h2
          className="font-display text-sm font-bold truncate"
          style={{ color: "hsl(var(--secondary))" }}
        >
          Edit Main Page
        </h2>
        {hasChanges && (
          <span
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-[10px] uppercase tracking-wider"
            style={{
              backgroundColor: "hsl(var(--accent) / 0.15)",
              color: "hsl(var(--accent-foreground))",
            }}
          >
            <FileText size={11} /> Unpublished
          </span>
        )}
      </div>

      {/* CENTER — viewport segment + edit/preview segment, fused. */}
      <div className="flex items-center gap-2 justify-self-center">
        <div
          className="flex items-center rounded-full border p-0.5"
          style={{ borderColor: "hsl(var(--border) / 0.6)" }}
          role="group"
          aria-label="Viewport"
        >
          {VIEWPORTS.map(({ key, label, Icon }) => {
            const active = viewport === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onViewportChange(key)}
                title={label}
                aria-label={label}
                aria-pressed={active}
                className="flex items-center justify-center w-9 h-8 rounded-full transition-colors"
                style={segmentBtn(active)}
              >
                <Icon size={15} strokeWidth={1.75} />
              </button>
            );
          })}
        </div>

        {/* Vertical divider — visual cue that these are two related but
            distinct control groups. */}
        <span
          aria-hidden="true"
          className="h-5 w-px"
          style={{ backgroundColor: "hsl(var(--border) / 0.6)" }}
        />

        <div
          className="flex items-center rounded-full border p-0.5"
          style={{ borderColor: "hsl(var(--border) / 0.6)" }}
          role="group"
          aria-label="Canvas mode"
        >
          {MODES.map(({ key, label, Icon }) => {
            const active = previewMode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onPreviewModeChange(key)}
                title={label}
                aria-label={label}
                aria-pressed={active}
                className="flex items-center gap-1.5 h-8 rounded-full transition-colors px-3"
                style={segmentBtn(active)}
              >
                <Icon size={14} strokeWidth={1.75} />
                <span className="font-body text-[11px] uppercase tracking-wider">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT — Save Draft + Publish (open-in-new-tab is a small icon). */}
      <div className="flex items-center gap-2 justify-self-end">
        {/* Open in new tab — kept as a discrete utility, separate from the
            in-place Preview toggle in the center group. */}
        <button
          onClick={onPreview}
          title="Open preview in new tab"
          aria-label="Open preview in new tab"
          className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:opacity-80"
          style={{
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          <ExternalLink size={13} />
        </button>

        <button
          onClick={onSaveDraft}
          disabled={saving}
          title={hasChanges ? "You have unsaved changes — click to save the draft" : "No changes to save"}
          className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full hover:opacity-80 transition-all disabled:opacity-50"
          style={{
            backgroundColor: hasChanges ? "hsl(var(--accent) / 0.18)" : "transparent",
            border: hasChanges
              ? "1px solid hsl(var(--accent))"
              : "1px solid hsl(var(--border))",
            color: hasChanges ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))",
            fontWeight: hasChanges ? 600 : 400,
          }}
        >
          <Save size={12} /> {saving ? "Saving…" : saveLabel}
        </button>

        <button
          onClick={onPublish}
          disabled={publishing || !hasChanges}
          className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full hover:opacity-80 transition-opacity disabled:opacity-40"
          style={{
            backgroundColor: "hsl(var(--accent))",
            color: "hsl(var(--accent-foreground))",
          }}
        >
          <Send size={12} /> {publishing ? "Publishing…" : "Publish All"}
        </button>
      </div>
    </div>
  );
};

export default AdminBuilderToolbar;
