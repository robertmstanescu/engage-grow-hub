import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { MousePointer2, Trash2 } from "lucide-react";
import { useBuilder } from "../builder/BuilderContext";
import { useInspectorFocus } from "./useInspectorFocus";
import { getWidget } from "@/lib/WidgetRegistry";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import { confirmDestructive } from "@/components/ConfirmDialog";
import { countRowWidgets } from "../builder/rowWidgetCount";
import CellSettingsEditor from "./CellSettingsEditor";
import { type BoxField } from "./BoxModelControl";
import WidgetInspectorTabs, { pickTabForFocusKey, type InspectorTab } from "./WidgetInspectorTabs";
import { DEFAULT_DESIGN_SETTINGS, readDesignSettings } from "@/lib/constants/rowDefaults";
// Debug Story 1.1 — sibling-safe widget lookup/patch helpers. The
// inspector cannot just `pageRows.find(r => r.id === widgetId)` because
// v2/v3 rows host MANY widgets per row; that lookup either misses the
// click or overwrites the wrong row's content, erasing siblings.
import {
  findWidgetLocation,
  patchWidgetContent,
  readWidgetContent,
  readWidgetType,
  removeWidgetAt,
} from "./widgetLocator";

// Section editors (re-used from the legacy form-driven UI). The Inspector
// is just a NEW HOST for these — the editors themselves are unchanged.
// US 2.1 — HeroEditor is no longer imported at the top: hero is reached
// only through the widget-fallback map below (HeroRowFields alias).
import SeoFields from "../site-editor/SeoFields";
import RowStyleTab from "../editors/RowStyleTab";

// Widget admin editors (legacy, type-keyed). Where a widget exposes
// `adminComponent` via the WidgetRegistry, that wins (US 16.1 dev note).
// Otherwise we fall back to this map so older row types still get
// usable settings until they're migrated to self-registering widgets.
import HeroRowFields from "../site-editor/HeroEditor";
import PillarEditor from "../site-editor/PillarEditor";
import ImageTextEditor from "../site-editor/ImageTextEditor";
import ProfileEditor from "../site-editor/ProfileEditor";
import GridEditor from "../site-editor/GridEditor";
import ContactAdmin from "@/features/widgets/contact/ContactAdmin";
import TextRowEditor from "../site-editor/TextRowEditor";
import BoxedRowEditor from "../site-editor/BoxedRowEditor";
import LeadMagnetEditor from "../site-editor/LeadMagnetEditor";
import VowsEditor from "../site-editor/VowsEditor";
import { LogoCloudEditor } from "../editors/NewRowEditors";

/* ════════════════════════════════════════════════════════════════════
 * InspectorPanel — US 16.1
 * ════════════════════════════════════════════════════════════════════
 *
 * Right-sidebar "chameleon" that swaps its contents based on what the
 * user clicked in the canvas (BuilderContext.activeElement):
 *
 *   • null            → page-level SEO fields (default)
 *   • "hero"          → HeroEditor (special-cased section)
 *   • "row:<id>"      → row layout controls (alignment, column widths,
 *                       background colour)
 *   • "widget:<id>"   → that widget's admin editor — resolved through
 *                       the WidgetRegistry (`adminComponent`) first,
 *                       with a legacy type-keyed fallback for rows that
 *                       haven't been migrated yet.
 *
 * The panel is intentionally STATELESS — all data comes in via props
 * and all writes are forwarded to setters owned by SiteEditor.
 */
export interface InspectorPanelProps {
  // Page-level data ---------------------------------------------------
  seoMetaTitle: string;
  seoMetaDescription: string;
  onSeoTitleChange: (v: string) => void;
  onSeoDescriptionChange: (v: string) => void;

  // US 2.1 — Hero is no longer a special section; it lives in pageRows
  // as an ordinary widget at index 0. The widget-editor branch picks it
  // up via the `case "hero"` row-type fallback.

  // Page rows (the visual canvas) ------------------------------------
  pageRows: PageRow[];
  onRowsChange: (rows: PageRow[]) => void;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-5">
    {/* US 4.1 — admin-section-label gives slate-600 + bold so the header
        stops vanishing into the white panel surface. */}
    <h4 className="admin-section-label font-body text-[10px] mb-2.5">
      {title}
    </h4>
    <div className="space-y-3">{children}</div>
  </div>
);

// `forwardRef` silences a dev-only "Function components cannot be given
// refs" warning that fires when this component is the immediate child
// of a ref-forwarding parent (ResizablePanel) during HMR introspection.
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

const InspectorPanel = (props: InspectorPanelProps) => {
  const { activeElement, setActiveElement, activeNodePath } = useBuilder();
  const {
    seoMetaTitle,
    seoMetaDescription,
    onSeoTitleChange,
    onSeoDescriptionChange,
    pageRows,
    onRowsChange,
  } = props;

  /* US 1.3 — auto-scroll the matching input into view + flash it green
   * whenever `activeNodePath` updates. The hook is a no-op on the public
   * site and when the path stops at the widget level. */
  const containerRef = useRef<HTMLDivElement>(null);
  useInspectorFocus(containerRef);

  /* US 2.5 — controlled tab state for the per-widget inspector. We
   * auto-switch to the tab that hosts the field US 1.3 wants to focus
   * (e.g. clicking the green border in the canvas pings borderRadius,
   * which lives in Design — flip the tab BEFORE the focus hook runs so
   * it can scroll/flash the input). */
  const [widgetTab, setWidgetTab] = useState<InspectorTab>("content");
  const focusLeaf = useMemo(() => {
    const tail = activeNodePath?.slice(4) ?? [];
    if (tail.length === 0) return null;
    if (tail[0] === "field" && tail.length >= 2) return tail[1];
    if (tail[0] === "item" && tail.length >= 3) return `item:${tail[1]}:${tail[2]}`;
    return tail[tail.length - 1] || null;
  }, [activeNodePath]);
  useEffect(() => {
    const target = pickTabForFocusKey(focusLeaf);
    setWidgetTab(target);
  }, [focusLeaf, activeElement]);

  const renderBody = () => {

  /* ─── State 1 — nothing selected → page SEO settings ─────────── */
  if (!activeElement) {
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

  /* US 2.1 — The "hero" special-case branch is gone. Hero is now an
   * ordinary widget at page_rows[0]; selecting it routes through the
   * `widget:<id>` branch which calls `<HeroRowFields/>` via the
   * row-type fallback at the bottom of this component. */

  /* ─── State 4 — Cell selected → Cell Settings ─────────────────
   * activeElement looks like `cell:<rowId>:<colId>:<cellId>`. The
   * BuilderContext is the canonical source of this shorthand, so the
   * parser here is intentionally narrow — anything else falls through
   * to the row/widget branches below. */
  if (activeElement.startsWith("cell:")) {
    const [, cRowId, colId, cellId] = activeElement.split(":");
    const cellRow = pageRows.find((r) => r.id === cRowId) as any;
    if (!cellRow || !Array.isArray(cellRow.columns)) {
      return (
        <EmptyHint>
          The selected cell no longer exists. Click anywhere on the canvas to clear the selection.
        </EmptyHint>
      );
    }
    const column = cellRow.columns.find((c: any) => c.id === colId);
    const cell = column?.cells?.find((c: any) => c.id === cellId);
    if (!column || !cell) {
      return (
        <EmptyHint>
          The selected cell was removed. Pick another cell or click empty canvas to clear.
        </EmptyHint>
      );
    }

    const onCellChange = (patch: Partial<typeof cell>) => {
      onRowsChange(
        pageRows.map((r: any) => {
          if (r.id !== cRowId || !Array.isArray(r.columns)) return r;
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

  /* ─── Parse the selection id (`row:<id>` or `widget:<id>`) ─────
   *
   * Debug Story 1.1 — for `widget:<id>` the parsed `rowId` is actually
   * the WIDGET id, which won't match any row in v2/v3 layouts. So we
   * only enforce the row-lookup guard for the row branch; the widget
   * branch resolves its target via `findWidgetLocation`. */
  const [kind, rowId] = activeElement.split(":");
  const row = pageRows.find((r) => r.id === rowId);

  if (kind === "row" && !row) {
    return (
      <EmptyHint>The selected element no longer exists. Click anywhere on the canvas to clear the selection.</EmptyHint>
    );
  }

  // Helpers — patch a single ROW in place (v1 row-only operations).
  // For widget-level updates we use the sibling-safe widgetLocator
  // helpers in the widget branch below.
  const updateRow = (patch: Partial<PageRow>) => {
    onRowsChange(pageRows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  };

  /* ─── State 2 — Row selected → layout / spacing / bg colour ──── */
  if (kind === "row") {
    /* ─── Debug Story 4.1 — destructive action guard ─────────────
     * Counts configured widget cells in the row and shows a modal
     * confirmation before mutating `pageRows`. Cancel leaves state
     * untouched (the .then handler simply returns). */
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

    /* US 4.x — Re-link the FULL background/style stack into the
     * Inspector. `RowStyleTab` already wires:
     *   • Background colour + opacity
     *   • Background image URL + opacity
     *   • Row internal alignment
     *   • Column widths (auto-hidden for single-column rows)
     *   • GradientEditor (linear/radial/conic/mesh)
     *   • OverlayEditor (decorative overlays)
     * All writes flow through `updateRow` so the targeted row in
     * pageRows is patched in place — siblings are untouched. */
    return (
      <>
        <Section title={`Row · ${row.type}`}>
          <p className="font-body text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            Layout, spacing and background controls for the entire row.
          </p>
        </Section>

        <RowStyleTab
          row={row}
          onRowMetaChange={(updates) => updateRow(updates)}
          onUpdateColumnWidths={(widths) =>
            updateRow({
              layout: {
                ...DEFAULT_ROW_LAYOUT,
                ...(row.layout || {}),
                column_widths: widths,
              },
            })
          }
        />

        {/* Destructive action lives at the bottom of the row inspector
         * so the user has to scroll past the safe controls first — and
         * the click ALWAYS routes through `confirmDestructive`. */}
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

  /* ─── State 3 — Widget selected → tabbed widget inspector (US 2.5)
   *
   * Debug Story 1.1 ("Sibling Erasure Test"):
   * The id parsed from `widget:<widgetId>` is the WIDGET'S id, NOT the
   * row's. In v2/v3 rows that hold multiple widgets, looking it up via
   * `pageRows.find(r => r.id === widgetId)` would either miss entirely
   * or match an unrelated row and overwrite its content, erasing every
   * sibling widget. Instead we walk the tree with `findWidgetLocation`
   * and patch through `patchWidgetContent`, which clones every ancestor
   * array on the way down — siblings stay byte-identical.
   * ─────────────────────────────────────────────────────────────── */
  if (kind === "widget") {
    // `rowId` here is actually the WIDGET id (legacy variable name kept
    // to minimise diff). The locator handles v1 / v2 / v3 transparently.
    const widgetId = rowId;
    const loc = findWidgetLocation(pageRows, widgetId);
    if (!loc) {
      return (
        <EmptyHint>
          The selected widget no longer exists. Click anywhere on the canvas to clear the selection.
        </EmptyHint>
      );
    }

    const widgetContent = readWidgetContent(pageRows, loc);
    const widgetType = readWidgetType(pageRows, loc);

    /** Sibling-safe patch: replace ONE field on the targeted widget. */
    const updateWidgetField = (field: string, value: any) => {
      onRowsChange(
        patchWidgetContent(pageRows, loc, (prev) => ({ ...prev, [field]: value })),
      );
    };

    /** Sibling-safe replace: hand the editor the whole content blob. */
    const replaceWidgetContent = (next: Record<string, any>) => {
      onRowsChange(patchWidgetContent(pageRows, loc, () => next));
    };

    /* Design settings live under the reserved `__design` key on the
     * widget content blob and are applied uniformly by `WidgetWrapper`. */
    const design = readDesignSettings(widgetContent);
    const writeDesign = (patch: Partial<typeof design>) => {
      const nextDesign = { ...DEFAULT_DESIGN_SETTINGS, ...design, ...patch };
      onRowsChange(
        patchWidgetContent(pageRows, loc, (prev) => ({
          ...prev,
          __design: nextDesign,
        })),
      );
    };
    const updateDesignField = (field: BoxField, value: number) =>
      writeDesign({ [field]: value } as Partial<typeof design>);

    /* Resolve the per-widget admin editor — registry first, then a
     * legacy switch for widgets that haven't been ported yet. The
     * resulting node renders inside the Content tab. */
    const def = getWidget(widgetType as any);
    const contentEditor = def?.adminComponent
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
            case "text":
              return <TextRowEditor content={widgetContent} onChange={updateWidgetField} />;
            case "boxed":
              return <BoxedRowEditor content={widgetContent} onChange={updateWidgetField} />;
            case "lead_magnet":
              return <LeadMagnetEditor content={widgetContent} onChange={replaceWidgetContent} />;
            case "logo_cloud":
              return <LogoCloudEditor content={widgetContent} onChange={updateWidgetField} />;
            case "vows":
              return <VowsEditor content={widgetContent} onChange={updateWidgetField} />;
            default:
              return (
                <p className="font-body text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  No inspector editor available for widget type "{widgetType}". Edit it from the row's form view instead.
                </p>
              );
          }
        })();

    const widgetLabel = def?.label || widgetType;

    /** Sibling-safe delete: drop ONLY this widget. For v1 rows that
     *  removes the whole row (one widget == one row); for v2/v3 the row
     *  stays so its other widgets remain editable. */
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

    // Suppress unused-var warning (legacy fallback editor sometimes
    // wants whole-content replace; kept exported for future editors).
    void replaceWidgetContent;

    return (
      <>
        <div className="mb-4">
          <h3
            className="font-body text-[11px] uppercase tracking-[0.18em] font-semibold"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Widget · {widgetLabel}
          </h3>
        </div>
        <WidgetInspectorTabs
          activeTab={widgetTab}
          onTabChange={setWidgetTab}
          contentEditor={contentEditor}
          design={design}
          onDesignFieldChange={updateDesignField}
          onDesignBgChange={(color) => writeDesign({ bgColor: color })}
          onDesignRadiusChange={(px) => writeDesign({ borderRadius: px })}
          onVisibilityChange={(visibility) => writeDesign({ visibility })}
          onCustomCssChange={(customCss) => writeDesign({ customCss })}
        />

        {/* Danger zone — destructive actions accessible from the
         *  Inspector so editors can remove rogue widgets without
         *  hunting for a separate UI. */}
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

  return <EmptyHint>Select an element on the canvas to edit its settings.</EmptyHint>;
  };

  return (
    <div ref={containerRef} className="h-full">
      {renderBody()}
    </div>
  );
};

export default InspectorPanel;
