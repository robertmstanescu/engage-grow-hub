import { useRef } from "react";
import { MousePointer2, Trash2 } from "lucide-react";
import { useBuilder } from "../builder/BuilderContext";
import { useInspectorFocus } from "./useInspectorFocus";
import { getWidget } from "@/lib/WidgetRegistry";
import { type PageRow, DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { confirmDestructive } from "@/components/ConfirmDialog";
import { countRowWidgets } from "../builder/rowWidgetCount";
import CellSettingsEditor from "./CellSettingsEditor";
import BoxModelControl, { type BoxField } from "./BoxModelControl";
import { DEFAULT_DESIGN_SETTINGS, readDesignSettings } from "@/types/rows";

// Section editors (re-used from the legacy form-driven UI). The Inspector
// is just a NEW HOST for these — the editors themselves are unchanged.
import HeroEditor from "../site-editor/HeroEditor";
import SeoFields from "../site-editor/SeoFields";
import RowAlignmentSettings from "../site-editor/RowAlignmentSettings";
import ColumnWidthControl from "../site-editor/ColumnWidthControl";
import { ColorField } from "../site-editor/FieldComponents";

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

  // Hero (special-cased single section) ------------------------------
  heroContent: Record<string, any>;
  onHeroFieldChange: (field: string, value: any) => void;

  // Page rows (the visual canvas) ------------------------------------
  pageRows: PageRow[];
  onRowsChange: (rows: PageRow[]) => void;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <h4
      className="font-body text-[10px] uppercase tracking-[0.18em] font-medium mb-2.5"
      style={{ color: "hsl(var(--muted-foreground))" }}
    >
      {title}
    </h4>
    <div className="space-y-3">{children}</div>
  </div>
);

const EmptyHint = ({ children }: { children: React.ReactNode }) => (
  <div
    className="flex flex-col items-center justify-center text-center h-full min-h-[200px] gap-3"
    style={{ color: "hsl(var(--muted-foreground))" }}
  >
    <MousePointer2 size={26} strokeWidth={1.4} />
    <p className="font-body text-xs leading-relaxed max-w-[220px]">{children}</p>
  </div>
);

const InspectorPanel = (props: InspectorPanelProps) => {
  const { activeElement, setActiveElement } = useBuilder();
  const {
    seoMetaTitle,
    seoMetaDescription,
    onSeoTitleChange,
    onSeoDescriptionChange,
    heroContent,
    onHeroFieldChange,
    pageRows,
    onRowsChange,
  } = props;

  /* US 1.3 — auto-scroll the matching input into view + flash it green
   * whenever `activeNodePath` updates. The hook is a no-op on the public
   * site and when the path stops at the widget level. */
  const containerRef = useRef<HTMLDivElement>(null);
  useInspectorFocus(containerRef);

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

  /* ─── Special case — Hero section ─────────────────────────────── */
  if (activeElement === "hero") {
    return (
      <Section title="Hero Section">
        <HeroEditor content={heroContent} onChange={onHeroFieldChange} />
      </Section>
    );
  }

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

  /* ─── Parse the selection id (`row:<id>` or `widget:<id>`) ───── */
  const [kind, rowId] = activeElement.split(":");
  const row = pageRows.find((r) => r.id === rowId);

  if (!row) {
    return (
      <EmptyHint>The selected element no longer exists. Click anywhere on the canvas to clear the selection.</EmptyHint>
    );
  }

  // Helpers — patch a single row in place, preserving the rest.
  const updateRow = (patch: Partial<PageRow>) => {
    onRowsChange(pageRows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  };
  const updateRowContent = (field: string, value: any) => {
    onRowsChange(
      pageRows.map((r) =>
        r.id === rowId ? { ...r, content: { ...r.content, [field]: value } } : r,
      ),
    );
  };

  /* ─── State 2 — Row selected → layout / spacing / bg colour ──── */
  if (kind === "row") {
    const layout = { ...DEFAULT_ROW_LAYOUT, ...(row.layout || {}) };

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
          <RowAlignmentSettings
            layout={layout}
            onChange={(next) => updateRow({ layout: next })}
          />
        </Section>

        {row.columns_data && row.columns_data.length > 1 && (
          <Section title="Column widths">
            <ColumnWidthControl
              columnCount={row.columns_data.length}
              widths={layout.column_widths}
              onChange={(widths) =>
                updateRow({ layout: { ...layout, column_widths: widths } })
              }
            />
          </Section>
        )}

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

  /* ─── State 3 — Widget selected → widget admin editor ─────────── */
  if (kind === "widget") {
    /* US 2.3 — Box Model spacing controls live at the TOP of every
     * widget inspector so designers can adjust margin/padding without
     * hunting for it inside per-widget admin UIs. The values are stored
     * under the reserved `__design` key on the widget content blob and
     * applied uniformly by `WidgetWrapper`. */
    const design = readDesignSettings(row.content);
    const updateDesignField = (field: BoxField, value: number) => {
      const nextDesign = { ...DEFAULT_DESIGN_SETTINGS, ...design, [field]: value };
      onRowsChange(
        pageRows.map((r) =>
          r.id === rowId
            ? { ...r, content: { ...r.content, __design: nextDesign } }
            : r,
        ),
      );
    };

    const boxModelSection = (
      <Section title="Spacing (Box Model)">
        <BoxModelControl
          marginTop={design.marginTop}
          marginRight={design.marginRight}
          marginBottom={design.marginBottom}
          marginLeft={design.marginLeft}
          paddingTop={design.paddingTop}
          paddingRight={design.paddingRight}
          paddingBottom={design.paddingBottom}
          paddingLeft={design.paddingLeft}
          onChange={updateDesignField}
        />
      </Section>
    );

    // First try the WidgetRegistry (US 16.1 dev note: "this is where
    // the WidgetRegistry shines"). If the widget self-registered an
    // adminComponent, render it directly.
    const def = getWidget(row.type);
    if (def?.adminComponent) {
      const Admin = def.adminComponent;
      return (
        <>
          {boxModelSection}
          <Section title={def.label || row.type}>
            <Admin content={row.content} onChange={updateRowContent} />
          </Section>
        </>
      );
    }

    // Legacy fallback — a switch over the row type for widgets that
    // haven't been ported to the registry's `adminComponent` slot yet.
    // Same dispatch as `RowsManager.renderRowEditorForContent`.
    const legacyEditor = (() => {
      switch (row.type) {
        case "hero":
          return <HeroRowFields content={row.content} onChange={updateRowContent} />;
        case "service":
          return (
            <PillarEditor
              pillarContent={row.content}
              servicesContent={{ services: row.content.services || [] }}
              onPillarChange={updateRowContent}
              onServicesChange={(svcs) => updateRowContent("services", svcs)}
            />
          );
        case "contact":
          return <ContactAdmin content={row.content} onChange={updateRowContent} />;
        case "image_text":
          return <ImageTextEditor content={row.content} onChange={updateRowContent} />;
        case "profile":
          return <ProfileEditor content={row.content} onChange={updateRowContent} />;
        case "grid":
          return <GridEditor content={row.content} onChange={updateRowContent} />;
        default:
          return (
            <p className="font-body text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              No inspector editor available for widget type "{row.type}". Edit it from the row's form view instead.
            </p>
          );
      }
    })();

    return (
      <>
        {boxModelSection}
        <Section title={`Widget · ${row.type}`}>{legacyEditor}</Section>
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
