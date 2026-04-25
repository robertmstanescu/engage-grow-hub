import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { MousePointer2, Trash2 } from "lucide-react";
import { useBuilder } from "../builder/BuilderContext";
import { useInspectorFocus } from "./useInspectorFocus";
import { getWidget } from "@/lib/WidgetRegistry";
import { type PageRow, DEFAULT_ROW_LAYOUT, DEFAULT_DESIGN_SETTINGS, readDesignSettings } from "@/types/rows";
import { confirmDestructive } from "@/components/ConfirmDialog";
import { countRowWidgets } from "../builder/rowWidgetCount";
import CellSettingsEditor from "./CellSettingsEditor";
import { type BoxField } from "./BoxModelControl";
import WidgetInspectorTabs, { pickTabForFocusKey, type InspectorTab } from "./WidgetInspectorTabs";
import { pickForeground } from "@/lib/pickForeground";

// Debug Story 1.1 — sibling-safe widget lookup/patch helpers. The
// inspector cannot just `pageRows.find(r => r.id === widgetId)` because
// v3 rows host MANY widgets per row; that lookup either misses the
// click or overwrites the wrong row's content, erasing siblings.
import {
  findWidgetLocation,
  patchWidgetContent,
  readWidgetContent,
  readWidgetType,
  removeWidgetAt,
  type WidgetLocation,
} from "./widgetLocator";

import SeoFields from "../site-editor/SeoFields";
import RowAlignmentSettings from "../site-editor/RowAlignmentSettings";
import ColumnWidthControl from "../site-editor/ColumnWidthControl";
import { ColorField } from "../site-editor/FieldComponents";

// Widget admin editors (legacy, type-keyed). Where a widget exposes
// `adminComponent` via the WidgetRegistry, that wins. Otherwise we fall
// back to this map so older row types still get usable settings.
import HeroRowFields from "../site-editor/HeroEditor";
import PillarEditor from "../site-editor/PillarEditor";
import ImageTextEditor from "../site-editor/ImageTextEditor";
import ProfileEditor from "../site-editor/ProfileEditor";
import GridEditor from "../site-editor/GridEditor";
import ContactAdmin from "@/features/widgets/contact/ContactAdmin";

/* ════════════════════════════════════════════════════════════════════
 * InspectorPanel — Element Settings (US 3.1 / US 3.2 / EPIC overhaul)
 * ════════════════════════════════════════════════════════════════════
 *
 * Right-sidebar "chameleon" that swaps its contents based on the user's
 * selection. PATH-DRIVEN: we read `activeNodePath` from BuilderContext
 * directly instead of stringly parsing the legacy `activeElement` —
 * that's how the v3 widget id (which lives at path[3], NOT path[1])
 * survives intact through the inspector.
 *
 *   activeNodePath = null                                    → page SEO
 *   ['row', rowId]                                           → row settings
 *   ['row', rowId, 'col', colId, 'cell', cellId, ...]        → cell settings
 *   ['row', rowId, 'widget', widgetId, ...]                  → widget settings
 *
 * SCROLL CONTAINER (US 3.1):
 *   The whole panel is wrapped in overflow-y-auto / overflow-x-hidden
 *   with gap-4 between sections so scheduling, design, and content
 *   never visually crash into each other regardless of widget length.
 *
 * CONTEXT-AWARE INPUT BACKGROUND (US 3.2):
 *   When a widget is selected, we walk row → column → cell → widget to
 *   find the most specific `bg_color` / `__design.bgColor`. The widget
 *   CONTENT EDITOR is wrapped in a themed panel using that color so
 *   editors writing white text on dark backgrounds can actually SEE
 *   what they're typing. `pickForeground` gives the matching label
 *   color so the editor remains legible.
 * ──────────────────────────────────────────────────────────────────── */

export interface InspectorPanelProps {
  seoMetaTitle: string;
  seoMetaDescription: string;
  onSeoTitleChange: (v: string) => void;
  onSeoDescriptionChange: (v: string) => void;
  pageRows: PageRow[];
  onRowsChange: (rows: PageRow[]) => void;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2.5">
    {/* US 4.1 — admin-section-label gives slate-600 + bold so the header
        stops vanishing into the white panel surface. */}
    <h4 className="admin-section-label font-body text-[10px]">{title}</h4>
    <div className="space-y-3">{children}</div>
  </section>
);

// `forwardRef` silences a dev-only "Function components cannot be given
// refs" warning when this is the immediate child of ResizablePanel.
const EmptyHint = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => (
    <div
      ref={ref}
      className="flex flex-col items-center justify-center text-center h-full min-h-[200px] gap-3"
      style={{ color: "hsl(var(--muted-foreground))" }}
    >
      <MousePointer2 size={26} strokeWidth={1.4} />
      <p className="font-body text-xs leading-relaxed max-w-[220px]">{children}</p>
    </div>
  ),
);
EmptyHint.displayName = "EmptyHint";

/* ──────────────────────────────────────────────────────────────────
 * resolveSurfaceBg — US 3.2
 * Walk widget → cell → column → row to find the most specific bg
 * color the editor will see when that widget renders. Returned as a
 * css color string OR null when nothing more specific than the panel
 * default applies (so callers can fall back to the standard white
 * admin pane styling).
 * ────────────────────────────────────────────────────────────────── */
const resolveSurfaceBg = (
  rows: PageRow[],
  loc: WidgetLocation,
  widgetContent: Record<string, any>,
): string | null => {
  // Widget self-design wins (editors set their own surface explicitly).
  const widgetDesignBg = readDesignSettings(widgetContent)?.bgColor;
  if (widgetDesignBg && widgetDesignBg !== "transparent") return widgetDesignBg;

  const row = rows[loc.rowIdx] as any;
  const col = row?.columns?.[loc.colIdx];
  const cell = col?.cells?.[loc.cellIdx];

  const cellBg = cell?.bg_color;
  if (cellBg && cellBg !== "transparent") return cellBg;

  const colBg = col?.bg_color;
  if (colBg && colBg !== "transparent") return colBg;

  const rowBg = row?.bg_color;
  if (rowBg && rowBg !== "transparent" && rowBg !== "#FFFFFF" && rowBg !== "#ffffff") {
    return rowBg;
  }
  return null;
};

const InspectorPanel = (props: InspectorPanelProps) => {
  const { activeNodePath, setActiveElement } = useBuilder();
  const {
    seoMetaTitle,
    seoMetaDescription,
    onSeoTitleChange,
    onSeoDescriptionChange,
    pageRows,
    onRowsChange,
  } = props;

  /* US 1.3 — auto-scroll the matching input into view + flash it green
   * whenever `activeNodePath` updates. */
  const containerRef = useRef<HTMLDivElement>(null);
  useInspectorFocus(containerRef);

  /* US 2.5 — controlled tab state for the per-widget inspector. We
   * auto-switch to the tab that hosts the field US 1.3 wants to focus. */
  const [widgetTab, setWidgetTab] = useState<InspectorTab>("content");
  const focusLeaf = useMemo(() => {
    const tail = activeNodePath?.slice(4) ?? [];
    if (tail.length === 0) return null;
    if (tail[0] === "field" && tail.length >= 2) return tail[1];
    if (tail[0] === "item" && tail.length >= 3) return `item:${tail[1]}:${tail[2]}`;
    return tail[tail.length - 1] || null;
  }, [activeNodePath]);
  useEffect(() => {
    setWidgetTab(pickTabForFocusKey(focusLeaf));
  }, [focusLeaf, activeNodePath]);

  const renderBody = () => {
    /* ─── State 1 — nothing selected → page SEO settings ───────── */
    if (!activeNodePath || activeNodePath.length === 0) {
      return (
        <Section title="Page Settings">
          <p className="font-body text-[11px] leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
            Click an element on the canvas to edit it. Otherwise, these page-wide settings apply.
          </p>
          <SeoFields
            metaTitle={seoMetaTitle}
            metaDescription={seoMetaDescription}
            onTitleChange={onSeoTitleChange}
            onDescriptionChange={onSeoDescriptionChange}
          />
        </Section>
      );
    }

    /* Resolve segment positions in the path so we know which level the
     * selection terminates at. The path is normalised by BuilderContext;
     * we never have to guess a shape. */
    const widgetIdx = activeNodePath.indexOf("widget");
    const cellIdx = activeNodePath.indexOf("cell");
    const colIdx = activeNodePath.indexOf("col");
    const rowIdx = activeNodePath.indexOf("row");

    /* ─── WIDGET LEVEL ───────────────────────────────────────────
     * Drive selection off the v3 widget id at path[widgetIdx + 1].
     * BuilderContext guarantees this is the WIDGET id, not the row id,
     * so `findWidgetLocation` resolves a unique cell/widget pair. */
    if (widgetIdx !== -1 && activeNodePath.length > widgetIdx + 1) {
      const widgetId = activeNodePath[widgetIdx + 1];
      const loc = findWidgetLocation(pageRows, widgetId);
      if (!loc) {
        return <EmptyHint>The selected widget no longer exists. Click anywhere on the canvas to clear the selection.</EmptyHint>;
      }

      const widgetContent = readWidgetContent(pageRows, loc);
      const widgetType = readWidgetType(pageRows, loc);

      /** Sibling-safe patch: replace ONE field on the targeted widget. */
      const updateWidgetField = (field: string, value: any) => {
        onRowsChange(patchWidgetContent(pageRows, loc, (prev) => ({ ...prev, [field]: value })));
      };

      /* Design settings live under the reserved `__design` key on the
       * widget content blob and are applied uniformly by `WidgetWrapper`. */
      const design = readDesignSettings(widgetContent);
      const writeDesign = (patch: Partial<typeof design>) => {
        const nextDesign = { ...DEFAULT_DESIGN_SETTINGS, ...design, ...patch };
        onRowsChange(patchWidgetContent(pageRows, loc, (prev) => ({ ...prev, __design: nextDesign })));
      };
      const updateDesignField = (field: BoxField, value: number) =>
        writeDesign({ [field]: value } as Partial<typeof design>);

      /* Resolve the per-widget admin editor — registry first, then a
       * legacy switch for widgets that haven't been ported yet. */
      const def = getWidget(widgetType as any);
      const rawContentEditor = def?.adminComponent
        ? (() => {
            const Admin = def.adminComponent!;
            return <Admin content={widgetContent} onChange={updateWidgetField} />;
          })()
        : (() => {
            switch (widgetType) {
              case "hero":
                return <HeroRowFields content={widgetContent} onChange={updateWidgetField} />;
              case "service":
                return (
                  <PillarEditor
                    pillarContent={widgetContent}
                    servicesContent={{ services: widgetContent.services || [] }}
                    onPillarChange={updateWidgetField}
                    onServicesChange={(svcs) => updateWidgetField("services", svcs)}
                  />
                );
              case "contact":
                return <ContactAdmin content={widgetContent} onChange={updateWidgetField} />;
              case "image_text":
                return <ImageTextEditor content={widgetContent} onChange={updateWidgetField} />;
              case "profile":
                return <ProfileEditor content={widgetContent} onChange={updateWidgetField} />;
              case "grid":
                return <GridEditor content={widgetContent} onChange={updateWidgetField} />;
              default:
                return (
                  <p className="font-body text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    No inspector editor available for widget type "{widgetType}". Edit it from the row's form view instead.
                  </p>
                );
            }
          })();

      /* US 3.2 — Context-Aware Backgrounds for Text Inputs.
       * Wrap the content editor in a panel whose background mirrors the
       * actual surface the widget sits on. `pickForeground` returns the
       * matching readable text color so labels and helper copy on top of
       * a dark surface stay legible. When no special bg applies we leave
       * the panel transparent so the standard light admin theme wins. */
      const surfaceBg = resolveSurfaceBg(pageRows, loc, widgetContent);
      const surfaceFg = surfaceBg ? pickForeground(surfaceBg) : null;
      const themedContentEditor = surfaceBg ? (
        <div
          className="rounded-lg p-3 -mx-1"
          style={{
            backgroundColor: surfaceBg,
            color: surfaceFg ?? undefined,
            // Soft border so the themed panel feels intentional, not stuck on.
            boxShadow: "inset 0 0 0 1px hsl(var(--border) / 0.4)",
          }}
        >
          {rawContentEditor}
        </div>
      ) : (
        rawContentEditor
      );

      const widgetLabel = def?.label || widgetType || "Widget";

      const handleDeleteWidget = async () => {
        const ok = await confirmDestructive({
          title: "Delete this widget?",
          description:
            "Warning: This will permanently remove the widget and its content from the page. Are you sure?",
          confirmLabel: "Delete widget",
        });
        if (!ok) return;
        onRowsChange(removeWidgetAt(pageRows, loc));
        setActiveElement(null);
      };

      return (
        <>
          <header className="space-y-1">
            <p className="admin-section-label font-body text-[10px]">Element</p>
            <h3 className="font-display text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              {widgetLabel}
            </h3>
          </header>

          <WidgetInspectorTabs
            activeTab={widgetTab}
            onTabChange={setWidgetTab}
            contentEditor={themedContentEditor}
            design={design}
            onDesignFieldChange={updateDesignField}
            onDesignBgChange={(color) => writeDesign({ bgColor: color })}
            onDesignRadiusChange={(px) => writeDesign({ borderRadius: px })}
            onVisibilityChange={(visibility) => writeDesign({ visibility })}
            onCustomCssChange={(customCss) => writeDesign({ customCss })}
          />

          {/* Destructive action lives at the bottom so the editor must
           *  scroll past the safe controls; click ALWAYS routes through
           *  `confirmDestructive`. */}
          <Section title="Danger zone">
            <button
              type="button"
              onClick={handleDeleteWidget}
              className="flex items-center gap-2 px-3 py-2 rounded-md border w-full justify-center font-body text-[11px] uppercase tracking-[0.12em] cursor-pointer transition-colors"
              style={{
                borderColor: "hsl(var(--destructive) / 0.4)",
                color: "hsl(var(--destructive))",
                backgroundColor: "transparent",
              }}
            >
              <Trash2 size={12} />
              Delete widget
            </button>
          </Section>
        </>
      );
    }

    /* ─── CELL LEVEL ─────────────────────────────────────────────
     * Path: ['row', rowId, 'col', colId, 'cell', cellId, ...] */
    if (cellIdx !== -1 && activeNodePath.length > cellIdx + 1) {
      const rowId = activeNodePath[rowIdx + 1];
      const colId = colIdx !== -1 ? activeNodePath[colIdx + 1] : null;
      const cellId = activeNodePath[cellIdx + 1];

      const cellRow = pageRows.find((r) => r.id === rowId) as any;
      const column = cellRow?.columns?.find((c: any) => c.id === colId);
      const cell = column?.cells?.find((c: any) => c.id === cellId);

      if (!cell) {
        return <EmptyHint>The selected cell was removed. Pick another cell or click empty canvas to clear.</EmptyHint>;
      }

      const onCellChange = (patch: Partial<typeof cell>) => {
        onRowsChange(
          pageRows.map((r: any) => {
            if (r.id !== rowId || !Array.isArray(r.columns)) return r;
            return {
              ...r,
              columns: r.columns.map((col: any) => {
                if (col.id !== colId) return col;
                return {
                  ...col,
                  cells: (col.cells || []).map((cc: any) =>
                    cc.id === cellId ? { ...cc, ...patch } : cc,
                  ),
                };
              }),
            };
          }),
        );
      };

      return (
        <Section title="Cell Settings">
          <CellSettingsEditor cell={cell} onChange={onCellChange} />
        </Section>
      );
    }

    /* ─── ROW LEVEL ──────────────────────────────────────────────
     * Path: ['row', rowId] (no widget/cell segment after it). */
    if (rowIdx !== -1 && activeNodePath.length > rowIdx + 1) {
      const rowId = activeNodePath[rowIdx + 1];
      const row = pageRows.find((r) => r.id === rowId);
      if (!row) {
        return <EmptyHint>The selected element no longer exists. Click anywhere on the canvas to clear the selection.</EmptyHint>;
      }

      const updateRow = (patch: Partial<PageRow>) =>
        onRowsChange(pageRows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
      const layout = { ...DEFAULT_ROW_LAYOUT, ...(row.layout || {}) };

      const handleDeleteRow = async () => {
        const count = countRowWidgets(row);
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
        onRowsChange(pageRows.filter((r) => r.id !== rowId));
        setActiveElement(null);
      };

      return (
        <>
          <Section title={`Row · ${row.type}`}>
            <p className="font-body text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              Layout, spacing and background controls for the entire row.
            </p>
          </Section>

          <Section title="Background">
            <ColorField
              label="Background Colour"
              value={row.bg_color || ""}
              onChange={(v) => updateRow({ bg_color: v })}
            />
          </Section>

          <Section title="Alignment">
            <RowAlignmentSettings layout={layout} onChange={(next) => updateRow({ layout: next })} />
          </Section>

          {row.columns_data && row.columns_data.length > 1 && (
            <Section title="Column widths">
              <ColumnWidthControl
                columnCount={row.columns_data.length}
                widths={layout.column_widths}
                onChange={(widths) => updateRow({ layout: { ...layout, column_widths: widths } })}
              />
            </Section>
          )}

          <Section title="Danger zone">
            <button
              type="button"
              onClick={handleDeleteRow}
              className="flex items-center gap-2 px-3 py-2 rounded-md border w-full justify-center font-body text-[11px] uppercase tracking-[0.12em] cursor-pointer transition-colors"
              style={{
                borderColor: "hsl(var(--destructive) / 0.4)",
                color: "hsl(var(--destructive))",
                backgroundColor: "transparent",
              }}
            >
              <Trash2 size={12} />
              Delete row
            </button>
          </Section>
        </>
      );
    }

    return <EmptyHint>Select an element on the canvas to edit its settings.</EmptyHint>;
  };

  /* US 3.1 — strict scroll container. overflow-y-auto + overflow-x-hidden
   * keeps long forms (scheduling, design, content) from blowing out the
   * panel; the gap-4 between top-level sections prevents visual collisions
   * between the header, tabs, and danger zone. */
  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-4 min-w-0"
    >
      {renderBody()}
    </div>
  );
};

export default InspectorPanel;
