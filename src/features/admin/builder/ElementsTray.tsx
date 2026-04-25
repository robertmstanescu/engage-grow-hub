/**
 * ════════════════════════════════════════════════════════════════════
 * ElementsTray — US 17.1
 * ════════════════════════════════════════════════════════════════════
 *
 * The draggable Widget Library that lives in the Left Sidebar of the
 * three-pane builder shell. It enumerates EVERY widget registered in
 * the `WidgetRegistry` and renders each as a small icon-+-label card
 * that can be picked up with the mouse via `@dnd-kit/core`.
 *
 * SCOPE OF THIS STORY
 * -------------------
 * 17.1 only delivers the SOURCES — pickable, draggable cards with a
 * proper "ghost" preview. Drop-handling on the canvas (turning a
 * dropped card into a real row in the page) is US 17.2 and lives in
 * `SiteEditor`'s `DndContext.onDragEnd` handler.
 *
 * DRAG PAYLOAD CONTRACT
 * ---------------------
 * Each draggable card sets:
 *   • `id`   — `"new-widget-<type>"` (unique within the DnD context)
 *   • `data` — `{ source: "tray", type, label }` so the drop-target can
 *               recognise this is a NEW widget being created (vs. an
 *               existing row being reordered) and seed it with that
 *               widget's `defaultData` from the registry.
 *
 * The DragOverlay (rendered by `SiteEditor`) reads `active.data.current`
 * to show a pretty floating preview that follows the cursor across the
 * whole screen — including outside the sidebar — instead of the default
 * cropped DOM-clone you'd get from CSS transforms alone.
 */

import { useDraggable } from "@dnd-kit/core";
import { Blocks } from "lucide-react";
import { listWidgets, type WidgetDefinition } from "@/lib/WidgetRegistry";

/** Stable id prefix used by the DnD context to recognise tray sources. */
export const TRAY_DRAG_ID_PREFIX = "new-widget-";

/** Shape of the payload attached to a tray-card drag event. */
export interface TrayDragData {
  source: "tray";
  type: string;
  label: string;
}

/** Type guard for `active.data.current` coming from the tray. */
export const isTrayDragData = (d: unknown): d is TrayDragData =>
  !!d && typeof d === "object" && (d as any).source === "tray" && typeof (d as any).type === "string";

/* ──────────────────────────────────────────────────────────────────
 * Single draggable card
 * ────────────────────────────────────────────────────────────────── */
interface TrayCardProps {
  def: WidgetDefinition;
}

const TrayCard = ({ def }: TrayCardProps) => {
  const Icon = def.icon ?? Blocks;
  const label = def.label ?? def.type;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${TRAY_DRAG_ID_PREFIX}${def.type}`,
    data: { source: "tray", type: def.type, label } satisfies TrayDragData,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      // Spread DnD listeners/attributes onto the card itself so the entire
      // card surface is grabbable (not just a tiny handle).
      {...listeners}
      {...attributes}
      title={`Drag “${label}” onto the canvas`}
      aria-label={`Drag ${label} widget`}
      className="group relative flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 transition-all cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2"
      style={{
        // WHY: while a card is being dragged we hide it locally — the
        // <DragOverlay> in SiteEditor renders the floating preview, so
        // leaving the source visible would create a duplicated ghost.
        opacity: isDragging ? 0.35 : 1,
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--border) / 0.6)",
        // @ts-expect-error — CSS custom prop for focus ring colour
        "--tw-ring-color": "hsl(var(--accent))",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "hsl(var(--accent))";
        e.currentTarget.style.backgroundColor = "hsl(var(--accent) / 0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "hsl(var(--border) / 0.6)";
        e.currentTarget.style.backgroundColor = "hsl(var(--card))";
      }}
    >
      <Icon
        size={18}
        strokeWidth={1.6}
        style={{ color: "hsl(var(--foreground))" }}
      />
      <span
        className="font-body text-[10px] leading-tight text-center line-clamp-2"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {label}
      </span>
    </button>
  );
};

/* ──────────────────────────────────────────────────────────────────
 * Floating preview rendered inside <DragOverlay> by SiteEditor.
 * Exported so the parent can mount it without recreating the look.
 * ────────────────────────────────────────────────────────────────── */
export const TrayDragPreview = ({ data }: { data: TrayDragData }) => {
  const def = listWidgets().find((w) => w.type === data.type);
  const Icon = def?.icon ?? Blocks;
  return (
    <div
      className="flex items-center gap-2 rounded-lg border px-3 py-2 shadow-lg pointer-events-none"
      style={{
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--accent))",
        color: "hsl(var(--foreground))",
      }}
    >
      <Icon size={16} strokeWidth={1.7} />
      <span className="font-body text-xs font-medium">{data.label}</span>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
 * The tray itself — a grouped grid of all registered widgets.
 * ────────────────────────────────────────────────────────────────── */
const ElementsTray = () => {
  const all = listWidgets();

  // Group by `category` for a tidier menu. Widgets with no category
  // bucket into "Other" so they're never silently hidden.
  const grouped = all.reduce<Record<string, WidgetDefinition[]>>((acc, def) => {
    const key = def.category || "Other";
    (acc[key] ??= []).push(def);
    return acc;
  }, {});

  // Stable category order — most-used first.
  const orderedCategories = [
    "Layout",
    "Content",
    "Media",
    "Marketing",
    "Social",
    "Other",
  ].filter((c) => grouped[c]?.length);

  if (all.length === 0) {
    return (
      <p
        className="font-body text-[11px] px-1 py-2"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        No widgets registered yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {orderedCategories.map((cat) => (
        <div key={cat}>
          <h4
            className="font-body text-[10px] uppercase tracking-[0.18em] font-medium mb-2 px-1"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {cat}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {grouped[cat]
              .slice()
              .sort((a, b) =>
                (a.label ?? a.type).localeCompare(b.label ?? b.type),
              )
              .map((def) => (
                <TrayCard key={def.type} def={def} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ElementsTray;
