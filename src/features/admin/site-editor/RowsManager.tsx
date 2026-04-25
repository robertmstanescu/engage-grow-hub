import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Type, Briefcase, LayoutGrid, Mail, Sparkles, Image, User, Grid3X3, Columns, Square, Columns2, Columns3, Columns4, Grip, Settings, Layers, Link2 } from "lucide-react";
import { toast } from "sonner";
import type { PageRow, WidgetDesignSettings } from "@/types/rows";
import { generateRowId, DEFAULT_CONTACT_FIELDS, DEFAULT_ROW_LAYOUT, DEFAULT_DESIGN_SETTINGS, readDesignSettings, readGlobalRef, GLOBAL_REF_KEY } from "@/lib/constants/rowDefaults";
import { useGlobalWidgets } from "@/hooks/useGlobalWidgets";
import RowAlignmentSettings from "./RowAlignmentSettings";
import ColumnWidthControl from "./ColumnWidthControl";
import { SectionBox, Field, RichField, ArrayField, SelectField, TextArea, ColorField } from "./FieldComponents";
import ImagePickerField from "../ImagePickerField";
import TitleLineEditor from "./TitleLineEditor";
import PillarEditor from "./PillarEditor";
import SubtitleEditor from "./SubtitleEditor";
import ImageTextEditor from "./ImageTextEditor";
import ProfileEditor from "./ProfileEditor";
import GridEditor from "./GridEditor";
import ContactAdmin from "@/features/widgets/contact/ContactAdmin";
import WidgetSettingsDrawer from "./WidgetSettingsDrawer";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { confirmDestructive } from "@/components/ConfirmDialog";
import { countRowWidgets } from "../builder/rowWidgetCount";

const ROW_TYPES = [
  { type: "hero" as const, label: "Hero", icon: Sparkles, defaultContent: { label: "", title_lines: [], subtitle: "", subtitle_color: "", body: "", body_color: "", title_color: "", label_color: "", bg_type: "none", bg_url: "" } },
  { type: "text" as const, label: "Text", icon: Type, defaultContent: { title_lines: [], subtitle: "", subtitle_color: "", body: "" } },
  { type: "service" as const, label: "Service", icon: Briefcase, defaultContent: { eyebrow: "", title: "", description: "", services: [] } },
  { type: "boxed" as const, label: "Boxed (max 6)", icon: LayoutGrid, defaultContent: { title_lines: [], subtitle: "", subtitle_color: "", cards: [] } },
  { type: "contact" as const, label: "Contact", icon: Mail, defaultContent: { title_lines: [], body: "", button_text: "Request a discovery call", success_heading: "Message received.", success_body: "We respond within 24 hours.", success_button: "Send another message", show_social: false, fields: DEFAULT_CONTACT_FIELDS } },
  { type: "image_text" as const, label: "Image & Text", icon: Image, defaultContent: { eyebrow: "", title: "", description: "", image_url: "", image_position: "right", image_shape: "default", floating_caption: "", caption_position: "bottom-left", color_eyebrow: "", color_title: "", color_description: "", color_caption_bg: "", color_caption_text: "" } },
  { type: "profile" as const, label: "Profile Feature", icon: User, defaultContent: { eyebrow: "", image_url: "", name: "", role: "", credentials: [], body: "", color_eyebrow: "", color_name: "", color_role: "", color_credential_bg: "", color_credential_text: "", color_body: "" } },
  { type: "grid" as const, label: "Grid", icon: Grid3X3, defaultContent: { eyebrow: "", title: "", description: "", items: [], color_eyebrow: "", color_title: "", color_description: "", color_card_border: "", color_card_border_hover: "", color_card_title: "", color_card_description: "", color_stat_number: "", color_stat_label: "" } },
];

/**
 * Layout presets exposed by the "Add Row" menu.
 *
 * WHY this replaces the old content-type dropdown:
 * Per the new page-builder paradigm, an admin first chooses a LAYOUT
 * (how many columns and their distribution), then drops widgets into
 * each cell. So "Add Row" no longer asks "what content?" — it asks
 * "what shape?". Widget content is added later, per-cell.
 */
const LAYOUT_PRESETS: Array<{
  id: string;
  label: string;
  widths: number[];
  Icon: any;
}> = [
  { id: "100",         label: "100%",       widths: [100],            Icon: Square   },
  { id: "50-50",       label: "50 / 50",    widths: [50, 50],         Icon: Columns2 },
  { id: "33-33-33",    label: "33 / 33 / 33", widths: [33, 34, 33],   Icon: Columns3 },
  { id: "25-25-25-25", label: "25 × 4",     widths: [25, 25, 25, 25], Icon: Columns4 },
  { id: "60-40",       label: "60 / 40",    widths: [60, 40],         Icon: Columns2 },
  { id: "40-60",       label: "40 / 60",    widths: [40, 60],         Icon: Columns2 },
];

interface Props {
  rows: PageRow[];
  onChange: (rows: PageRow[]) => void;
}

const RowsManager = ({ rows, onChange }: Props) => {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  // Add-Row menu has two tabs: layout presets, or insert a saved Global Block (US 8.1).
  const [addMenuTab, setAddMenuTab] = useState<"layout" | "global">("layout");
  const [inspectedCell, setInspectedCell] = useState<{ rowId: string; colIdx: number } | null>(null);

  // Global Blocks library — used for both the Add menu's "Global" tab
  // and to label cells that already reference a global widget.
  const { blocks: globalBlocks } = useGlobalWidgets();

  /**
   * Insert a new row whose single cell REFERENCES a Global Block
   * (US 8.1). The row's `type` is set to the global widget's type so
   * the legacy renderer dispatches correctly even before the v2
   * widget engine takes over; the actual data comes from the global
   * record at render time via `__global_ref`.
   */
  const addGlobalBlockRow = (block: { id: string; type: string; name: string }) => {
    const newRow: PageRow = {
      id: generateRowId(),
      type: block.type as PageRow["type"],
      strip_title: block.name,
      bg_color: "#FFFFFF",
      content: { [GLOBAL_REF_KEY]: block.id },
      layout: { ...DEFAULT_ROW_LAYOUT },
    };
    onChange([...rows, newRow]);
    setOpenRow(newRow.id);
    setShowAddMenu(false);
  };

  /**
   * Add an EMPTY row with N columns of the chosen layout. The row is
   * stored as a generic "text" row (the legacy renderers still drive
   * existing content), but every column starts with an empty content
   * blob — surfaced in the editor as dashed "+ Add Widget" cells.
   *
   * WHY type:"text" as the carrier: until the widget runtime ships
   * (later story), the rest of the codebase still expects `row.type`.
   * "text" is the safest no-op shape (no required fields, no crashes
   * if rendered empty). When the widget engine lands we'll swap this
   * for a dedicated "container" type.
   */
  const addRowWithLayout = (preset: typeof LAYOUT_PRESETS[number]) => {
    const colCount = preset.widths.length;
    const emptyContent = {} as Record<string, any>;
    const newRow: PageRow = {
      id: generateRowId(),
      type: "text",
      strip_title: `New ${colCount}-Column Row`,
      bg_color: "#FFFFFF",
      content: { ...emptyContent },
      columns_data: colCount > 1 ? Array.from({ length: colCount - 1 }, () => ({ ...emptyContent })) : undefined,
      layout: {
        ...DEFAULT_ROW_LAYOUT,
        column_widths: colCount > 1 ? preset.widths : undefined,
      },
    };
    onChange([...rows, newRow]);
    setOpenRow(newRow.id);
    setShowAddMenu(false);
  };

  const updateRow = (id: string, updates: Partial<PageRow>) => {
    onChange(rows.map((r) => r.id === id ? { ...r, ...updates } : r));
  };

  const updateRowContent = (id: string, field: string, value: any) => {
    onChange(rows.map((r) => r.id === id ? { ...r, content: { ...r.content, [field]: value } } : r));
  };

  const removeRow = async (id: string) => {
    // Debug Story 4.1 — destructive action guard. Confirm before
    // throwing away a row's worth of widgets. Cancel is a no-op.
    const target = rows.find((r) => r.id === id);
    if (target) {
      const count = countRowWidgets(target);
      const ok = await confirmDestructive({
        title: "Delete this row?",
        description:
          count > 1
            ? `Warning: This row contains ${count} widgets. Deleting it will permanently remove them. Are you sure?`
            : "Warning: Deleting this row will permanently remove it and its content. Are you sure?",
        confirmLabel: "Delete row",
        cancelLabel: "Cancel",
        destructive: true,
      });
      if (!ok) return;
    }
    onChange(rows.filter((r) => r.id !== id));
    if (openRow === id) setOpenRow(null);
  };

  /* ── Column management ── */
  const addColumn = (rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const template = ROW_TYPES.find((t) => t.type === row.type)!;
    const newColContent = { ...template.defaultContent };
    const existingExtra = row.columns_data || [];
    const newColumnsData = [...existingExtra, newColContent];
    const colCount = 1 + newColumnsData.length;
    const equalWidth = Math.round(100 / colCount);
    const widths = Array(colCount).fill(equalWidth);
    widths[widths.length - 1] = 100 - equalWidth * (colCount - 1);
    onChange(rows.map((r) =>
      r.id === rowId
        ? { ...r, columns_data: newColumnsData, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
        : r
    ));
  };

  const removeColumn = (rowId: string, colIndex: number) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    if (colIndex === 0 && row.columns_data && row.columns_data.length > 0) {
      const [promoted, ...rest] = row.columns_data;
      const colCount = 1 + rest.length;
      const widths = colCount > 1 ? Array(colCount).fill(Math.round(100 / colCount)) : undefined;
      onChange(rows.map((r) =>
        r.id === rowId
          ? { ...r, content: promoted, columns_data: rest.length > 0 ? rest : undefined, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
          : r
      ));
    } else if (colIndex > 0 && row.columns_data) {
      const newExtra = row.columns_data.filter((_, i) => i !== colIndex - 1);
      const colCount = 1 + newExtra.length;
      const widths = colCount > 1 ? Array(colCount).fill(Math.round(100 / colCount)) : undefined;
      onChange(rows.map((r) =>
        r.id === rowId
          ? { ...r, columns_data: newExtra.length > 0 ? newExtra : undefined, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
          : r
      ));
    }
  };

  const updateColumnContent = (rowId: string, colDataIndex: number, field: string, value: any) => {
    onChange(rows.map((r) => {
      if (r.id !== rowId || !r.columns_data) return r;
      const next = [...r.columns_data];
      next[colDataIndex] = { ...next[colDataIndex], [field]: value };
      return { ...r, columns_data: next };
    }));
  };

  const updateColumnWidths = (rowId: string, widths: number[]) => {
    onChange(rows.map((r) =>
      r.id === rowId
        ? { ...r, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
        : r
    ));
  };

  const renderRowEditorForContent = (row: PageRow, content: Record<string, any>, onContentChange: (field: string, value: any) => void) => {
    switch (row.type) {
      case "hero":
        return <HeroRowFields content={content} onChange={onContentChange} />;
      case "text":
        return <TextRowFields content={content} onChange={onContentChange} />;
      case "service":
        return (
          <PillarEditor
            pillarContent={content}
            servicesContent={{ services: content.services || [] }}
            onPillarChange={onContentChange}
            onServicesChange={(svcs) => onContentChange("services", svcs)}
          />
        );
      case "boxed":
        return <BoxedRowFields content={content} onChange={onContentChange} />;
      case "contact":
        // ContactAdmin lives in `src/features/widgets/contact/` so the
        // contact form is a self-contained, registry-driven widget
        // (US 2.2). The legacy inline `ContactRowFields` further down
        // this file is kept dormant for now to minimise diff risk.
        return <ContactAdmin content={content} onChange={onContentChange} />;
      case "image_text":
        return <ImageTextEditor content={content} onChange={onContentChange} />;
      case "profile":
        return <ProfileEditor content={content} onChange={onContentChange} />;
      case "grid":
        return <GridEditor content={content} onChange={onContentChange} />;
      default:
        return null;
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /**
   * ─────────────────────────────────────────────────────────────────────
   * NESTED DRAG & DROP — US 3.1
   * ─────────────────────────────────────────────────────────────────────
   * We run TWO logical sortable contexts inside ONE `<DndContext>`:
   *
   *   1. ROW-level vertical sort  → ids = `row:<rowId>`
   *   2. WIDGET-level cross-cell  → ids = `widget:<rowId>:<colIdx>`
   *                                 droppable cells = `cell:<rowId>:<colIdx>`
   *
   * WHY a single DndContext (not nested ones):
   * Nested DndContexts in @dnd-kit don't see each other's items, which
   * makes cross-container DnD impossible. The official "Multiple
   * Containers" recipe uses a single context and routes by id prefix.
   * We do the same — `active.id` / `over.id` carry their type as a
   * prefix so the handlers know what's being dragged where.
   *
   * WHY we mutate column CONTENT blobs (not yet PageWidget arrays):
   * The renderer (`PageRows.tsx`) still consumes the legacy v1 row
   * shape: `row.content` (col 0) + `row.columns_data[]` (cols 1..N),
   * with a single `row.type` driving rendering. Swapping the *blobs*
   * across cells of the same `row.type` is lossless and works today.
   * Cross-row moves between rows of the SAME type also work. Moving
   * across rows of DIFFERENT types would lose the schema for the
   * destination renderer, so we block it with a toast and ask the
   * user to use rows of the same type — until v2 widget arrays land.
   * ───────────────────────────────────────────────────────────────────── */

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const parseWidgetId = (id: string): { rowId: string; colIdx: number } | null => {
    if (typeof id !== "string" || !id.startsWith("widget:")) return null;
    const [, rowId, colStr] = id.split(":");
    const colIdx = Number(colStr);
    if (!rowId || Number.isNaN(colIdx)) return null;
    return { rowId, colIdx };
  };

  const parseCellId = (id: string): { rowId: string; colIdx: number } | null => {
    if (typeof id !== "string" || !id.startsWith("cell:")) return null;
    const [, rowId, colStr] = id.split(":");
    const colIdx = Number(colStr);
    if (!rowId || Number.isNaN(colIdx)) return null;
    return { rowId, colIdx };
  };

  const parseRowId = (id: string): string | null => {
    if (typeof id !== "string" || !id.startsWith("row:")) return null;
    return id.slice(4);
  };

  /** Read the content blob at (rowId, colIdx) from the current `rows` state. */
  const readCell = (rs: PageRow[], rowId: string, colIdx: number): Record<string, any> | null => {
    const row = rs.find((r) => r.id === rowId);
    if (!row) return null;
    if (colIdx === 0) return row.content || {};
    return row.columns_data?.[colIdx - 1] ?? null;
  };

  /** Write a new content blob at (rowId, colIdx) and return the new rows array. */
  const writeCell = (rs: PageRow[], rowId: string, colIdx: number, value: Record<string, any>): PageRow[] => {
    return rs.map((r) => {
      if (r.id !== rowId) return r;
      if (colIdx === 0) return { ...r, content: value };
      const next = [...(r.columns_data || [])];
      next[colIdx - 1] = value;
      return { ...r, columns_data: next };
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    // ── Case A: ROW reordering (vertical sort of strips) ───────────────
    const activeRowId = parseRowId(activeId);
    const overRowId = parseRowId(overId);
    if (activeRowId && overRowId) {
      const oldIndex = rows.findIndex((r) => r.id === activeRowId);
      const newIndex = rows.findIndex((r) => r.id === overRowId);
      if (oldIndex >= 0 && newIndex >= 0) onChange(arrayMove(rows, oldIndex, newIndex));
      return;
    }

    // ── Case B: WIDGET move (cell → cell, same or different row) ───────
    const fromWidget = parseWidgetId(activeId);
    if (!fromWidget) return;

    // Drop target is either another widget (insert at that slot) or a
    // bare cell (drop into the cell itself — important for empty cells).
    const toWidget = parseWidgetId(overId);
    const toCell = parseCellId(overId);
    const target = toWidget || toCell;
    if (!target) return;

    const fromRow = rows.find((r) => r.id === fromWidget.rowId);
    const toRow = rows.find((r) => r.id === target.rowId);
    if (!fromRow || !toRow) return;

    // Type-mismatch guard. Until v2 widget arrays land, each row has a
    // single `type` driving its renderer. Moving a `contact` blob into
    // a row whose type is `hero` would silently corrupt the destination.
    // Block it with a toast — the data stays put, no loss.
    if (fromRow.type !== toRow.type) {
      toast.error("Can't move between row types yet", {
        description: `Source is "${fromRow.type}", target is "${toRow.type}". Move within rows of the same type for now.`,
      });
      return;
    }

    // No-op if the user dropped a widget back onto its own cell with no
    // sibling to swap with (single-widget-per-cell legacy shape).
    if (fromWidget.rowId === target.rowId && fromWidget.colIdx === target.colIdx) return;

    // SWAP the two cell blobs. Because each cell carries exactly one
    // widget today, swap is the natural lossless operation:
    //  - dragging onto an OCCUPIED cell exchanges contents
    //  - dragging onto an EMPTY cell effectively MOVES the widget
    //    (the source becomes empty `{}`)
    // WHY swap, not splice: with a 1-widget-per-cell model, splice
    // would require shifting all subsequent cells (and rebalancing
    // column widths). Swap keeps the column geometry intact and is
    // what users intuitively expect from drag-to-reorganise.
    let next = rows;
    const a = readCell(next, fromWidget.rowId, fromWidget.colIdx) || {};
    const b = readCell(next, target.rowId, target.colIdx) || {};
    next = writeCell(next, fromWidget.rowId, fromWidget.colIdx, b);
    next = writeCell(next, target.rowId, target.colIdx, a);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Page Rows</label>
        {/* Click-to-add removed — rows and widgets are added via drag-and-drop from the Elements tray. */}
      </div>

      {/*
       * Single DndContext routes BOTH row sorting AND widget cell-to-cell
       * moves. Routing happens in `handleDragEnd` by id-prefix.
       * `closestCenter` works well for both axes; widget moves rely on
       * the cell droppable being detected when hovering anywhere over it.
       */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={rows.map((r) => `row:${r.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {rows.map((row) => {
            const TypeIcon = ROW_TYPES.find((t) => t.type === row.type)?.icon || Type;
            return (
              <SortableRowItem
                key={row.id}
                row={row}
                TypeIcon={TypeIcon}
                isOpen={openRow === row.id}
                onToggle={() => setOpenRow(openRow === row.id ? null : row.id)}
                onRemove={() => removeRow(row.id)}
                onUpdateRow={(updates) => updateRow(row.id, updates)}
                onUpdateContent={(field, value) => updateRowContent(row.id, field, value)}
                onAddColumn={() => addColumn(row.id)}
                onRemoveColumn={(colIndex) => removeColumn(row.id, colIndex)}
                onUpdateColumnContent={(colDataIdx, field, value) => updateColumnContent(row.id, colDataIdx, field, value)}
                onUpdateColumnWidths={(widths) => updateColumnWidths(row.id, widths)}
                renderEditorForContent={(content, onContentChange) => renderRowEditorForContent(row, content, onContentChange)}
                onInspectCell={(colIdx) => setInspectedCell({ rowId: row.id, colIdx })}
              />
            );
          })}
        </SortableContext>
        {/*
         * DragOverlay: a translucent ghost following the cursor while
         * dragging. Important because cells re-mount during cross-row
         * moves; without an overlay the dragged element can flicker.
         */}
        <DragOverlay>
          {activeDragId ? (
            <div
              className="rounded-md border-2 border-dashed px-3 py-2 font-body text-[10px] uppercase tracking-wider shadow-lg"
              style={{
                borderColor: "hsl(var(--primary))",
                backgroundColor: "hsl(var(--background))",
                color: "hsl(var(--primary))",
              }}
            >
              {activeDragId.startsWith("row:") ? "Moving row…" : "Moving widget…"}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/*
       * ─────────────────────────────────────────────────────────────
       * GLOBAL WIDGET SETTINGS DRAWER (US 6.1 — "The Inspector")
       * ─────────────────────────────────────────────────────────────
       * One drawer, retargeted by `inspectedCell`. Reads / writes the
       * `__design` blob on the targeted cell's content via the same
       * `updateRowContent` / `updateColumnContent` helpers that the
       * widget editors use — so saves go through ONE code path and
       * trigger the existing autosave pipeline unchanged.
       */}
      {(() => {
        const target = inspectedCell;
        if (!target) return null;
        const targetRow = rows.find((r) => r.id === target.rowId);
        if (!targetRow) return null;
        const cellContent = target.colIdx === 0
          ? (targetRow.content || {})
          : (targetRow.columns_data?.[target.colIdx - 1] || {});
        const design = readDesignSettings(cellContent);
        const writeDesign = (next: WidgetDesignSettings) => {
          // WHY a single field write: `updateRowContent` /
          // `updateColumnContent` already do an immutable merge under
          // the hood, so we hand them the WHOLE settings object as the
          // value of the reserved `__design` key. No deep-merge needed.
          if (target.colIdx === 0) {
            updateRowContent(target.rowId, "__design", next);
          } else {
            updateColumnContent(target.rowId, target.colIdx - 1, "__design", next);
          }
        };
        const colCount = 1 + (targetRow.columns_data?.length || 0);
        const label = colCount > 1
          ? `${targetRow.type} · Col ${target.colIdx + 1} of ${colCount} · ${targetRow.strip_title}`
          : `${targetRow.type} · ${targetRow.strip_title}`;
        const existingRef = readGlobalRef(cellContent);
        // Convert this cell into a Global Block reference (US 8.1).
        const onConvertedToGlobal = (globalId: string) => {
          // Preserve `__design` so per-instance chrome survives the swap.
          const localDesign = (cellContent as any)?.__design;
          const next: Record<string, any> = { [GLOBAL_REF_KEY]: globalId };
          if (localDesign) next.__design = localDesign;
          if (target.colIdx === 0) {
            updateRow(target.rowId, { content: next });
          } else {
            onChange(rows.map((r) => {
              if (r.id !== target.rowId || !r.columns_data) return r;
              const cols = [...r.columns_data];
              cols[target.colIdx - 1] = next;
              return { ...r, columns_data: cols };
            }));
          }
          toast.success("Linked to Global Block — edits will now sync everywhere.");
        };
        return (
          <WidgetSettingsDrawer
            open={true}
            onOpenChange={(o) => { if (!o) setInspectedCell(null); }}
            design={design}
            onChange={writeDesign}
            widgetLabel={label}
            saveAsGlobal={{
              widgetType: targetRow.type,
              snapshotData: cellContent,
              suggestedName: targetRow.strip_title || `${targetRow.type} block`,
              onConvertedToGlobal,
              isAlreadyReference: !!existingRef,
            }}
          />
        );
      })()}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────
 * WidgetCell — a single droppable cell in the row's column grid.
 *
 * Two roles in one component:
 *   1. DROPPABLE TARGET  — registered via `useDroppable` so the parent
 *                          DndContext can resolve drops onto the cell
 *                          itself (critical for EMPTY cells; without
 *                          this they'd have no `over.id`).
 *   2. SORTABLE ITEM     — when occupied, the cell ALSO registers as a
 *                          sortable widget (via `useSortable`) so the
 *                          user can pick it up and drop it elsewhere.
 *
 * Empty cells skip the sortable wrapper and just show the "+ Add Widget"
 * affordance — there's nothing to pick up, only somewhere to drop into.
 *
 * WHY useDroppable on the SAME node when occupied:
 * `useSortable` already provides droppable semantics for the cell node.
 * For empty cells we need a separate `useDroppable` (id `cell:...`)
 * because there is no sortable item to register the area as droppable.
 * ───────────────────────────────────────────────────────────────────── */

interface WidgetCellProps {
  rowId: string;
  rowType: string;
  colIdx: number;
  widthPct: number;
  isActive: boolean;
  isOccupied: boolean;
  onActivate: () => void;
  /** Open the global "Inspector" drawer for this cell (US 6.1). */
  onInspect: () => void;
}

const WidgetCell = ({
  rowId, rowType, colIdx, widthPct, isActive, isOccupied, onActivate, onInspect,
}: WidgetCellProps) => {
  const widgetId = `widget:${rowId}:${colIdx}`;
  const cellId = `cell:${rowId}:${colIdx}`;

  // Sortable handle ONLY when there's a widget to pick up.
  const sortable = useSortable({ id: widgetId, disabled: !isOccupied });
  // Empty cells need an explicit droppable so drops resolve to a target.
  const dropTarget = useDroppable({ id: cellId, disabled: isOccupied });

  // Pick the right ref/transform pair depending on cell state.
  const setNodeRef = isOccupied ? sortable.setNodeRef : dropTarget.setNodeRef;
  const style: React.CSSProperties = isOccupied
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.4 : 1,
      }
    : {};

  if (!isOccupied) {
    return (
      <button
        ref={setNodeRef as any}
        type="button"
        onClick={onActivate}
        className="flex flex-col items-center justify-center gap-1 min-h-[88px] rounded-md border-2 border-dashed transition-colors hover:opacity-80"
        style={{
          ...style,
          borderColor: dropTarget.isOver
            ? "hsl(var(--primary))"
            : isActive
              ? "hsl(var(--primary))"
              : "hsl(var(--primary) / 0.4)",
          backgroundColor: dropTarget.isOver
            ? "hsl(var(--primary) / 0.08)"
            : "hsl(var(--background))",
          color: "hsl(var(--muted-foreground))",
        }}
        title={`Column ${colIdx + 1} — drop a widget here`}
      >
        <span className="font-body text-[10px] uppercase tracking-wider">Drop widget here</span>
        <span className="font-body text-[9px] text-muted-foreground">
          Col {colIdx + 1} · {Math.round(widthPct)}%
        </span>
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef as any}
      style={{
        ...style,
        borderColor: isActive ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)",
        backgroundColor: "hsl(var(--background))",
      }}
      className="flex items-center gap-2 min-h-[88px] rounded-md border-2 px-2.5 py-2"
    >
      {/*
       * WHY the grip is a separate element (not the whole cell):
       * dnd-kit listeners on the entire cell would swallow clicks
       * meant for the "Edit" affordance. Restricting drag activation
       * to the Grip icon keeps interaction predictable.
       */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:opacity-70 touch-none flex-shrink-0"
        style={{ color: "hsl(var(--muted-foreground))" }}
        {...sortable.attributes}
        {...sortable.listeners}
        title="Drag widget"
        aria-label={`Drag widget in column ${colIdx + 1}`}
      >
        <Grip size={14} />
      </button>
      <button
        type="button"
        onClick={onActivate}
        className="flex-1 text-left min-w-0"
        title={`Edit widget in column ${colIdx + 1}`}
      >
        <div
          className="font-body text-[11px] font-medium truncate"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {rowType}
        </div>
        <div
          className="font-body text-[9px] text-muted-foreground"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Col {colIdx + 1} · {Math.round(widthPct)}%
        </div>
      </button>
      {/*
       * Inspector trigger (US 6.1). Opens the global "Settings" drawer
       * for this cell so the admin can edit margin / padding / bg /
       * radius without polluting the widget's own editor with the same
       * controls. Stops propagation so the parent edit button's click
       * doesn't fire alongside (we don't want to switch the active
       * column tab AND open the drawer at the same time).
       */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onInspect(); }}
        className="p-1.5 rounded hover:opacity-70 flex-shrink-0"
        style={{ color: "hsl(var(--muted-foreground))" }}
        title={`Widget settings (column ${colIdx + 1})`}
        aria-label={`Open widget settings for column ${colIdx + 1}`}
      >
        <Settings size={14} />
      </button>
    </div>
  );
};

/* ── Sortable Row Item ── */

interface SortableRowItemProps {
  row: PageRow;
  TypeIcon: any;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateRow: (updates: Partial<PageRow>) => void;
  onUpdateContent: (field: string, value: any) => void;
  onAddColumn: () => void;
  onRemoveColumn: (colIndex: number) => void;
  onUpdateColumnContent: (colDataIndex: number, field: string, value: any) => void;
  onUpdateColumnWidths: (widths: number[]) => void;
  renderEditorForContent: (content: Record<string, any>, onContentChange: (field: string, value: any) => void) => React.ReactNode;
  /** Open the global "Inspector" drawer for a specific cell (US 6.1). */
  onInspectCell: (colIdx: number) => void;
}

const SortableRowItem = ({
  row, TypeIcon, isOpen, onToggle, onRemove, onUpdateRow, onUpdateContent,
  onAddColumn, onRemoveColumn, onUpdateColumnContent, onUpdateColumnWidths,
  renderEditorForContent, onInspectCell,
}: SortableRowItemProps) => {
  // WHY prefixed id: the parent <DndContext> distinguishes ROW drags
  // from WIDGET drags by id-prefix ("row:" vs "widget:") so a single
  // context can route both interactions safely.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `row:${row.id}` });
  const [activeCol, setActiveCol] = useState(0);

  const colCount = 1 + (row.columns_data?.length || 0);
  const hasInherentSplit = row.type === "image_text" || row.type === "profile";
  const showWidthControl = colCount > 1 || hasInherentSplit;
  const widthColCount = hasInherentSplit && colCount === 1 ? 2 : colCount;
  const columnWidths = row.layout?.column_widths || Array(widthColCount).fill(Math.round(100 / widthColCount));

  // Get content and onChange for the active column
  const getColContent = (col: number) => col === 0 ? row.content : (row.columns_data?.[col - 1] || {});
  const getColOnChange = (col: number): ((field: string, value: any) => void) =>
    col === 0 ? onUpdateContent : (field, value) => onUpdateColumnContent(col - 1, field, value);

  // Clamp activeCol if columns were removed
  const safeActiveCol = Math.min(activeCol, colCount - 1);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderColor: "hsl(var(--border) / 0.5)",
    backgroundColor: "hsl(var(--card))",
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5" style={{ color: "hsl(var(--foreground))" }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:opacity-70 touch-none"
            style={{ color: "hsl(var(--muted-foreground))" }}
            {...attributes}
            {...listeners}>
            <GripVertical size={14} />
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity min-w-0">
            <TypeIcon size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
            <span className="font-body text-xs font-medium truncate">{row.strip_title}</span>
            <span className="font-body text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(var(--muted) / 0.4)", color: "hsl(var(--muted-foreground))" }}>
              {row.type}
            </span>
            {colCount > 1 && (
              <span className="font-body text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
                {colCount} cols
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onRemove} className="p-1 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
            <Trash2 size={13} />
          </button>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Field label="Strip Title" value={row.strip_title} onChange={(v) => onUpdateRow({ strip_title: v })} />
            <div>
              <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Background Color</label>
              <div className="flex gap-1.5">
                <input
                  type="color"
                  value={row.bg_color || "#FFFFFF"}
                  onChange={(e) => onUpdateRow({ bg_color: e.target.value })}
                  className="w-10 h-9 rounded border cursor-pointer"
                  style={{ borderColor: "hsl(var(--border))" }}
                />
                <input
                  value={row.bg_color || ""}
                  onChange={(e) => onUpdateRow({ bg_color: e.target.value })}
                  placeholder="#FFFFFF"
                  className="flex-1 px-3 py-2 rounded-lg font-body text-sm border"
                  style={{ borderColor: "hsl(var(--border))", backgroundColor: "#FFFFFF", color: "#1a1a1a" }}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {row.type !== "hero" && (
              <RowAlignmentSettings
                layout={row.layout || DEFAULT_ROW_LAYOUT}
                onChange={(layout) => onUpdateRow({ layout })}
              />
            )}

            {colCount < 4 && (
              <button
                type="button"
                onClick={onAddColumn}
                className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full hover:opacity-70 transition-opacity"
                style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}
                title="Add Column"
              >
                <Columns size={11} /> Add Column
              </button>
            )}

            <ColumnWidthControl
              columnCount={widthColCount}
              widths={columnWidths}
              onChange={onUpdateColumnWidths}
              disabled={!showWidthControl}
            />
          </div>

          {/* Column tabs */}
          {colCount > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: colCount }).map((_, i) => (
                <div key={i} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveCol(i)}
                    className="px-3 py-1.5 rounded-t text-[10px] font-body font-medium transition-all"
                    style={{
                      backgroundColor: safeActiveCol === i ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.3)",
                      color: safeActiveCol === i ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                    }}
                  >
                    Column {i + 1}
                  </button>
                  {colCount > 1 && (
                    <button
                      type="button"
                      onClick={() => { onRemoveColumn(i); if (safeActiveCol >= colCount - 1) setActiveCol(Math.max(0, colCount - 2)); }}
                      className="p-0.5 rounded hover:opacity-70 -ml-1"
                      style={{ color: "hsl(var(--destructive) / 0.7)" }}
                      title={`Remove Column ${i + 1}`}
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}


          {/*
           * ─────────────────────────────────────────────────────────────
           * WIDGET CELL GRID (US 3.1 — nested DnD surface)
           * ─────────────────────────────────────────────────────────────
           * Renders one cell per column. Each cell is a droppable target
           * (`cell:<rowId>:<colIdx>`). Occupied cells contain a sortable
           * "widget chip" (`widget:<rowId>:<colIdx>`) with a Grip handle.
           *
           * Why this surface is ALWAYS visible (not just when empty):
           * Per US 3.1 the admin must be able to drag widgets between
           * cells and across rows. That requires every cell to be a
           * droppable AND every occupied cell to expose a drag handle.
           * The previous "only-when-empty" scaffold made occupied cells
           * undraggable, which defeated the whole feature.
           *
           * Why we wrap each row's widgets in their own SortableContext:
           * @dnd-kit needs a SortableContext to enable smooth in-context
           * reordering hints. We use `rectSortingStrategy` because the
           * cells are laid out in a grid (not a vertical list).
           */}
          {(() => {
            const widthsForGrid = columnWidths.slice(0, colCount);
            const widgetIds = Array.from({ length: colCount }).map(
              (_, i) => `widget:${row.id}:${i}`,
            );
            return (
              <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
                <div
                  className="grid gap-2 p-3 rounded-lg"
                  style={{
                    gridTemplateColumns: widthsForGrid.map((w) => `${w}fr`).join(" "),
                    backgroundColor: "hsl(var(--muted) / 0.2)",
                  }}
                >
                  {Array.from({ length: colCount }).map((_, i) => {
                    const content = getColContent(i);
                    // WHY exclude `__design`: empty cells may still
                    // carry a `__design` blob from a previous widget
                    // that was deleted. Counting only "real" widget
                    // fields keeps the "+ Add Widget" affordance
                    // visible until actual content is added.
                    const realKeys = content ? Object.keys(content).filter((k) => k !== "__design") : [];
                    const isOccupied = realKeys.length > 0;
                    return (
                      <WidgetCell
                        key={i}
                        rowId={row.id}
                        rowType={row.type}
                        colIdx={i}
                        widthPct={widthsForGrid[i]}
                        isActive={safeActiveCol === i}
                        isOccupied={isOccupied}
                        onActivate={() => setActiveCol(i)}
                        onInspect={() => onInspectCell(i)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            );
          })()}

          {/*
           * NOTE: the "Show Subscribe widget" checkbox that previously
           * lived here was moved into `RowContentEditor.tsx` (top of the
           * Content tab) so it appears for EVERY row type and sits next
           * to the rest of the row's editable fields. The underlying
           * JSON key is unchanged (`content.show_subscribe`), so any
           * existing rows that have it enabled keep working unchanged.
           */}
          {renderEditorForContent(getColContent(safeActiveCol), getColOnChange(safeActiveCol))}
        </div>
      )}
    </div>
  );
};

/* ── Inline sub-editors ── */

const TitleLinesEditor = ({ titleLines, onChange }: { titleLines: string[]; onChange: (lines: string[]) => void }) => {
  const updateLine = (idx: number, html: string) => {
    const next = [...titleLines];
    next[idx] = html;
    onChange(next);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Title Lines</label>
        <button type="button" onClick={() => onChange([...titleLines, "<p></p>"])} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {titleLines.map((line, i) => (
          <SectionBox key={i} label={`Line ${i + 1}`}>
            <div className="flex gap-2">
              <div className="flex-1"><TitleLineEditor value={line} onChange={(v) => updateLine(i, v)} /></div>
              <button type="button" onClick={() => onChange(titleLines.filter((_, j) => j !== i))} className="self-end p-2 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                <Trash2 size={13} />
              </button>
            </div>
          </SectionBox>
        ))}
      </div>
    </div>
  );
};

const HeroRowFields = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  const BG_TYPES = [
    { label: "None", value: "none" },
    { label: "Image", value: "image" },
    { label: "Video", value: "video" },
  ];
  return (
    <div className="space-y-3">
      <Field label="Eyebrow (small text above title)" value={content.label || ""} onChange={(v) => onChange("label", v)} />
      <ColorField label="Eyebrow Color" description="Color of the small eyebrow text above the title" value={content.color_label || ""} fallback="" onChange={(v) => onChange("color_label", v)} />
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <Field label="Tagline (small text below title)" value={content.tagline || ""} onChange={(v) => onChange("tagline", v)} />
      <ColorField label="Tagline Color" description="Color of the small tagline text below the title" value={content.color_tagline || ""} fallback="" onChange={(v) => onChange("color_tagline", v)} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
      />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
      <SectionBox label="Background">
        <SelectField label="Type" value={content.bg_type || "none"} options={BG_TYPES} onChange={(v) => onChange("bg_type", v)} />
        {content.bg_type === "image" && (
          <ImagePickerField label="Background Image" value={content.bg_url || ""} onChange={(v) => onChange("bg_url", v)} />
        )}
        {content.bg_type === "video" && (
          <Field label="Video URL" value={content.bg_url || ""} onChange={(v) => onChange("bg_url", v)} />
        )}
      </SectionBox>
    </div>
  );
};

const TextRowFields = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  return (
    <div className="space-y-3">
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
      />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
    </div>
  );
};

const BoxedRowFields = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  const cards: { title: string; body: string }[] = content.cards || [];

  const updateCard = (idx: number, field: string, value: string) => {
    const next = [...cards];
    next[idx] = { ...next[idx], [field]: value };
    onChange("cards", next);
  };

  return (
    <div className="space-y-3">
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
      />
      <ColorField label="Card Title Color" description="Color of card titles in this section" value={content.color_card_title || ""} fallback="" onChange={(v) => onChange("color_card_title", v)} />
      <ColorField label="Card Body Color" description="Color of card body text" value={content.color_card_body || ""} fallback="" onChange={(v) => onChange("color_card_body", v)} />
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Cards (max 6)</label>
          <button type="button" onClick={() => onChange("cards", [...cards, { title: "", body: "" }])} disabled={cards.length >= 6} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 disabled:opacity-30" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Plus size={10} /> Add Card
          </button>
        </div>
        <div className="space-y-2">
          {cards.map((card, i) => (
            <SectionBox key={i} label={`Card ${i + 1}`}>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Field label="Title" value={card.title} onChange={(v) => updateCard(i, "title", v)} />
                  </div>
                  <button type="button" onClick={() => onChange("cards", cards.filter((_, j) => j !== i))} className="self-start p-2 rounded hover:opacity-70 mt-5" style={{ color: "hsl(var(--destructive))" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <RichField label="Body" value={card.body} onChange={(v) => updateCard(i, "body", v)} />
              </div>
            </SectionBox>
          ))}
        </div>
      </div>
    </div>
  );
};

const ContactRowFields = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  const fields = content.fields || DEFAULT_CONTACT_FIELDS;

  const updateFieldConfig = (idx: number, key: string, value: any) => {
    const next = [...fields];
    next[idx] = { ...next[idx], [key]: value };
    onChange("fields", next);
  };

  const addField = () => {
    const key = `custom_${Date.now()}`;
    onChange("fields", [...fields, { key, label: "New field", type: "text", required: false, visible: true }]);
  };

  const removeField = (idx: number) => {
    onChange("fields", fields.filter((_: any, i: number) => i !== idx));
  };

  const FIELD_TYPES = [
    { label: "Text", value: "text" },
    { label: "Email", value: "email" },
    { label: "Textarea", value: "textarea" },
    { label: "Checkbox", value: "checkbox" },
    { label: "Phone", value: "tel" },
    { label: "URL", value: "url" },
  ];

  return (
    <div className="space-y-3">
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
      <Field label="Button Text" value={content.button_text || ""} onChange={(v) => onChange("button_text", v)} />

      <SectionBox label="Form Fields">
        <div className="space-y-2">
          {fields.map((f: any, i: number) => (
            <div key={f.key || i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--background))" }}>
              <input
                type="checkbox"
                checked={f.visible}
                onChange={(e) => updateFieldConfig(i, "visible", e.target.checked)}
                className="rounded"
                style={{ accentColor: "hsl(var(--primary))" }}
              />
              <input
                value={f.label}
                onChange={(e) => updateFieldConfig(i, "label", e.target.value)}
                className="flex-1 px-2 py-1 rounded font-body text-xs border text-black"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "transparent" }}
              />
              <select
                value={f.type}
                onChange={(e) => updateFieldConfig(i, "type", e.target.value)}
                className="px-2 py-1 rounded font-body text-[10px] border text-black"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "transparent" }}>
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1 font-body text-[9px] uppercase tracking-wider text-muted-foreground">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => updateFieldConfig(i, "required", e.target.checked)}
                  className="rounded"
                  style={{ accentColor: "hsl(var(--primary))" }}
                />
                Req
              </label>
              <button type="button" onClick={() => removeField(i)} className="p-1 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 transition-opacity mt-2"
          style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
          <Plus size={10} /> Add Field
        </button>
      </SectionBox>

      <SectionBox label="Success State">
        <Field label="Heading" value={content.success_heading || ""} onChange={(v) => onChange("success_heading", v)} />
        <Field label="Body" value={content.success_body || ""} onChange={(v) => onChange("success_body", v)} />
        <Field label="Button Text" value={content.success_button || ""} onChange={(v) => onChange("success_button", v)} />
      </SectionBox>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={content.show_social || false}
          onChange={(e) => onChange("show_social", e.target.checked)}
          className="rounded"
          style={{ accentColor: "hsl(var(--primary))" }}
        />
        <span className="font-body text-xs text-muted-foreground">Show social media links below form</span>
      </label>
    </div>
  );
};

export default RowsManager;
