import { Monitor, Tablet, Smartphone, Eye, Save, Send, FileText } from "lucide-react";

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

interface AdminBuilderToolbarProps {
  viewport: ViewportMode;
  onViewportChange: (v: ViewportMode) => void;

  // Save Draft (active section)
  onSaveDraft: () => void;
  saving: boolean;
  saveLabel?: string;

  // Preview & Publish
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

const AdminBuilderToolbar = ({
  viewport,
  onViewportChange,
  onSaveDraft,
  saving,
  saveLabel = "Save Draft",
  onPreview,
  onPublish,
  publishing,
  hasChanges,
}: AdminBuilderToolbarProps) => {
  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5 border-b backdrop-blur-md"
      style={{
        backgroundColor: "hsl(var(--card) / 0.95)",
        borderColor: "hsl(var(--border) / 0.5)",
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

      {/* CENTER — viewport toggles */}
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
              style={{
                backgroundColor: active ? "hsl(var(--accent))" : "transparent",
                color: active
                  ? "hsl(var(--accent-foreground))"
                  : "hsl(var(--muted-foreground))",
              }}
            >
              <Icon size={15} strokeWidth={1.75} />
            </button>
          );
        })}
      </div>

      {/* RIGHT — Save Draft / Preview / Publish */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSaveDraft}
          disabled={saving}
          className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
          style={{
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
        >
          <Save size={12} /> {saving ? "Saving…" : saveLabel}
        </button>
        <button
          onClick={onPreview}
          className="hidden sm:flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full hover:opacity-80 transition-opacity"
          style={{
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
        >
          <Eye size={12} /> Preview
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
