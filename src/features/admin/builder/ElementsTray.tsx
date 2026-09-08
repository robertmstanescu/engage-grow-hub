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
import { Blocks, Bookmark, Columns2, Columns3, Columns4, Square } from "lucide-react";
import { listWidgets, type WidgetDefinition } from "@/lib/WidgetRegistry";
import { useBuilder } from "./BuilderContext";
import { useRowSnippets, type RowSnippet } from "@/hooks/useRowSnippets";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BLOCK_FAMILIES, defaultVariant, type BlockFamily } from "./blockFamilies";
import { SECTION_LIBRARY, type LibrarySection } from "./sectionLibrary";
import { useState } from "react";
import type { PageRowV3 } from "@/types/rows";

/** Stable id prefix used by the DnD context to recognise tray sources. */
export const TRAY_DRAG_ID_PREFIX = "new-widget-";
export const TRAY_LAYOUT_DRAG_ID_PREFIX = "new-layout-";
export const TRAY_SNIPPET_DRAG_ID_PREFIX = "new-snippet-";

/**
 * Shape of the payload attached to a tray-card drag event.
 * `kind` distinguishes:
 *   • `"widget"` — drop creates a single widget (legacy default).
 *   • `"layout"` — drop creates an EMPTY v3 row with N columns/cells so
 *      the editor can sketch structure first, then drop widgets into the
 *      cells. `columnCount` is the number of columns to seed.
 */
export type TrayDragData =
  | {
      source: "tray";
      kind?: "widget";
      type: string;
      label: string;
    }
  | {
      source: "tray";
      kind: "layout";
      type: "layout";
      label: string;
      columnCount: 1 | 2 | 3 | 4;
    }
  | {
      source: "tray";
      kind: "snippet";
      type: "snippet";
      label: string;
      snippetRow: PageRowV3;
    };

/** Type guard for `active.data.current` coming from the tray. */
export const isTrayDragData = (d: unknown): d is TrayDragData =>
  !!d && typeof d === "object" && (d as any).source === "tray" && typeof (d as any).type === "string";

export const isLayoutTrayDragData = (
  d: TrayDragData,
): d is Extract<TrayDragData, { kind: "layout" }> =>
  (d as any).kind === "layout";

export const isSnippetTrayDragData = (
  d: TrayDragData,
): d is Extract<TrayDragData, { kind: "snippet" }> =>
  (d as any).kind === "snippet";

/* ──────────────────────────────────────────────────────────────────
 * Single draggable card
 * ────────────────────────────────────────────────────────────────── */
interface TrayCardProps {
  def: WidgetDefinition<unknown>;
}

const TrayCard = ({ def }: TrayCardProps) => {
  const Icon = def.icon ?? Blocks;
  const label = def.label ?? def.type;
  const { insertWidgetAtSelection } = useBuilder();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${TRAY_DRAG_ID_PREFIX}${def.type}`,
    data: { source: "tray", kind: "widget", type: def.type, label } satisfies TrayDragData,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      // Spread DnD listeners/attributes onto the card itself so the entire
      // card surface is grabbable (not just a tiny handle).
      {...listeners}
      {...attributes}
      // Non-drag alternative: a plain mouse click inserts the widget
      // after the current selection, or at the end of the page, without
      // any drag gesture — PointerSensor only starts a drag once the
      // pointer moves past its activation distance, so a genuine click
      // (no movement) never gets swallowed by the drag listeners above
      // and reaches this handler instead. Keyboard users reach the SAME
      // insertWidgetAtSelection via the KeyboardSensor drag flow instead
      // (Tab here, Space/Enter to pick up, arrows to a drop zone,
      // Space/Enter to drop) — dnd-kit's keyboard listeners, spread in
      // via {...listeners} above, take priority over this button's own
      // native Enter/Space click activation once KeyboardSensor is
      // registered, so that's the actual keyboard path, not this onClick.
      onClick={() => insertWidgetAtSelection(def.type)}
      title={`Click or drag “${label}” onto the canvas`}
      aria-label={`Add ${label} widget`}
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
 * LayoutCard — draggable card that drops an EMPTY v3 row with N cells.
 *
 * These deliberately live OUTSIDE the WidgetRegistry. They don't
 * register as widgets (which would clutter every page-builder), but
 * they share the same drag-source contract via a dedicated `kind`
 * field on the payload.
 * ────────────────────────────────────────────────────────────────── */
interface LayoutCardProps {
  columnCount: 1 | 2 | 3 | 4;
  label: string;
  Icon: typeof Square;
}

const LayoutCard = ({ columnCount, label, Icon }: LayoutCardProps) => {
  const { insertLayoutAtSelection } = useBuilder();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${TRAY_LAYOUT_DRAG_ID_PREFIX}${columnCount}`,
    data: {
      source: "tray",
      kind: "layout",
      type: "layout",
      label,
      columnCount,
    } satisfies TrayDragData,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      // Non-drag alternative — see TrayCard's onClick for the full
      // rationale. Same insertion logic either way.
      onClick={() => insertLayoutAtSelection(columnCount)}
      title={`Click or drag a ${label.toLowerCase()} onto the canvas`}
      aria-label={`Add ${label}`}
      className="group relative flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 transition-all cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2"
      style={{
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
      <Icon size={18} strokeWidth={1.6} style={{ color: "hsl(var(--foreground))" }} />
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
 * SnippetCard — draggable/clickable card for a saved reusable row
 * (see InspectorPanel's "Save as Snippet"). Inserting one ALWAYS
 * clones with fresh ids (BuilderContext's insertPrebuiltRow /
 * insertSnippetAtSelection) — editing the inserted copy never affects
 * the saved snippet or any other page using it.
 * ────────────────────────────────────────────────────────────────── */
interface SnippetCardProps {
  snippet: RowSnippet;
}

const SnippetCard = ({ snippet }: SnippetCardProps) => {
  const { insertSnippetAtSelection } = useBuilder();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${TRAY_SNIPPET_DRAG_ID_PREFIX}${snippet.id}`,
    data: {
      source: "tray",
      kind: "snippet",
      type: "snippet",
      label: snippet.name,
      snippetRow: snippet.row_data,
    } satisfies TrayDragData,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      // Non-drag alternative — see TrayCard's onClick for the full
      // rationale. Same insertion logic either way.
      onClick={() => insertSnippetAtSelection(snippet.row_data)}
      title={`Click or drag "${snippet.name}" onto the canvas`}
      aria-label={`Add ${snippet.name} snippet`}
      className="group relative flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 transition-all cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2"
      style={{
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
      <Bookmark size={18} strokeWidth={1.6} style={{ color: "hsl(var(--foreground))" }} />
      <span
        className="font-body text-[10px] leading-tight text-center line-clamp-2"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {snippet.name}
      </span>
    </button>
  );
};

/* ──────────────────────────────────────────────────────────────────
 * Floating preview rendered inside <DragOverlay> by SiteEditor.
 * Exported so the parent can mount it without recreating the look.
 * ────────────────────────────────────────────────────────────────── */
export const TrayDragPreview = ({ data }: { data: TrayDragData }) => {
  // Layout/snippet drags don't have a registry entry; pick a fixed icon.
  let Icon: typeof Blocks;
  if ((data as any).kind === "layout") {
    const cc = (data as any).columnCount as number;
    Icon = cc === 1 ? Square : cc === 2 ? Columns2 : cc === 3 ? Columns3 : Columns4;
  } else if ((data as any).kind === "snippet") {
    Icon = Bookmark;
  } else {
    const def = listWidgets().find((w) => w.type === data.type);
    Icon = def?.icon ?? Blocks;
  }
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
 * Library sections — pre-designed rows (sectionLibrary.ts). Drag data
 * is the snippet shape, so the shell's snippet drop path inserts them
 * with fresh ids.
 * ────────────────────────────────────────────────────────────────── */
const LibraryCard = ({ section }: { section: LibrarySection }) => {
  const { insertSnippetAtSelection } = useBuilder();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${TRAY_SNIPPET_DRAG_ID_PREFIX}lib-${section.key}`,
    data: { source: "tray", kind: "snippet", type: "snippet", label: section.name, snippetRow: section.build() } satisfies TrayDragData,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => insertSnippetAtSelection(section.build())}
      title={`Click or drag “${section.name}” onto the page`}
      aria-label={`Add section ${section.name}`}
      className="tray-section"
      style={{ opacity: isDragging ? 0.35 : 1 }}
    >
      <span className="tray-section-name">{section.name}</span>
      <span className="tray-section-family">{section.family}</span>
    </button>
  );
};

/* ──────────────────────────────────────────────────────────────────
 * Block families — eight cards. A family with one variant inserts it
 * on click and drags it; a family with several opens a small list to
 * pick the variant (each entry is itself draggable). Dragging the
 * family card drags its default variant.
 * ────────────────────────────────────────────────────────────────── */
const VariantRow = ({ family, type, label, hint }: { family: BlockFamily; type: string; label: string; hint?: string }) => {
  const { insertWidgetAtSelection } = useBuilder();
  const def = listWidgets().find((w) => w.type === type);
  const Icon = def?.icon ?? family.icon;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${TRAY_DRAG_ID_PREFIX}${type}`,
    data: { source: "tray", kind: "widget", type, label } satisfies TrayDragData,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => insertWidgetAtSelection(type)}
      aria-label={`Add ${label} widget`}
      title={hint}
      className="tray-variant"
      style={{ opacity: isDragging ? 0.35 : 1 }}
    >
      <Icon size={14} strokeWidth={1.6} aria-hidden />
      <span className="tray-variant-name">{label}</span>
      {hint && <span className="tray-variant-hint">{hint}</span>}
    </button>
  );
};

const FamilyCard = ({ family }: { family: BlockFamily }) => {
  const { insertWidgetAtSelection } = useBuilder();
  const [open, setOpen] = useState(false);
  const first = defaultVariant(family);
  const Icon = family.icon;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${TRAY_DRAG_ID_PREFIX}family-${family.key}`,
    data: { source: "tray", kind: "widget", type: first.type, label: first.label } satisfies TrayDragData,
  });
  const single = family.variants.length === 1;
  const card = (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => (single ? insertWidgetAtSelection(first.type) : setOpen((v) => !v))}
      title={single ? `Click or drag “${family.label}” onto the page` : `${family.label}: ${family.variants.length} kinds`}
      aria-label={single ? `Add ${family.label} widget` : `${family.label} block, choose a kind`}
      aria-haspopup={single ? undefined : "menu"}
      aria-expanded={single ? undefined : open}
      className="tray-family"
      style={{ opacity: isDragging ? 0.35 : 1 }}
    >
      <Icon size={18} strokeWidth={1.6} aria-hidden />
      <span className="tray-family-name">{family.label}</span>
      {!single && <span className="tray-family-count">{family.variants.length}</span>}
    </button>
  );
  if (single) return card;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{card}</PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="admin-menu p-1 w-[240px]" role="menu" aria-label={`${family.label} kinds`}>
        {family.variants.map((v) => (
          <VariantRow key={v.type} family={family} type={v.type} label={v.label} hint={v.hint} />
        ))}
      </PopoverContent>
    </Popover>
  );
};

/* ──────────────────────────────────────────────────────────────────
 * The tray: Sections (library) · Structure · My snippets · Blocks.
 * ────────────────────────────────────────────────────────────────── */
const TrayHeading = ({ children }: { children: React.ReactNode }) => (
  <h4 className="font-body text-[10px] uppercase tracking-[0.18em] font-medium mb-2 px-1" style={{ color: "hsl(var(--muted-foreground))" }}>
    {children}
  </h4>
);

const ElementsTray = () => {
  const { snippets } = useRowSnippets();
  /* Every registered type must belong to a family; anything that does
     not is still reachable here so it is never silently hidden. */
  const orphans = listWidgets().filter((w) => !BLOCK_FAMILIES.some((f) => f.variants.some((v) => v.type === w.type)));

  return (
    <div className="space-y-4">
      <div>
        <TrayHeading>Sections</TrayHeading>
        <div className="space-y-1">
          {SECTION_LIBRARY.map((section) => (
            <LibraryCard key={section.key} section={section} />
          ))}
        </div>
      </div>

      <div>
        <TrayHeading>Blocks</TrayHeading>
        <div className="grid grid-cols-2 gap-2">
          {BLOCK_FAMILIES.map((family) => (
            <FamilyCard key={family.key} family={family} />
          ))}
          {orphans.map((def) => (
            <TrayCard key={def.type} def={def} />
          ))}
        </div>
      </div>

      {/* Structure — empty rows to lay out first and fill second. */}
      <div>
        <TrayHeading>Empty rows</TrayHeading>
        <div className="grid grid-cols-2 gap-2">
          <LayoutCard columnCount={1} label="1 column" Icon={Square} />
          <LayoutCard columnCount={2} label="2 columns" Icon={Columns2} />
          <LayoutCard columnCount={3} label="3 columns" Icon={Columns3} />
          <LayoutCard columnCount={4} label="4 columns" Icon={Columns4} />
        </div>
      </div>

      {snippets.length > 0 && (
        <div>
          <TrayHeading>My snippets</TrayHeading>
          <div className="grid grid-cols-2 gap-2">
            {snippets.map((snippet) => (
              <SnippetCard key={snippet.id} snippet={snippet} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ElementsTray;
