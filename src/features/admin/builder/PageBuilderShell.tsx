/**
 * ════════════════════════════════════════════════════════════════════
 * PageBuilderShell — generic 3-pane visual page builder
 * ════════════════════════════════════════════════════════════════════
 *
 * EXTRACTED FROM SiteEditor SO IT CAN BE REUSED.
 * The original SiteEditor had toolbar / left-tray / canvas / inspector
 * all welded to its main-page-only data model (`site_content` sections,
 * Hero, etc.). To make the new builder usable for CMS pages and blog
 * posts (which only need page rows + SEO + a title), we lift the shell
 * into this stateless component. Each adapter (SiteEditor for the main
 * page, CmsPageBuilder, BlogPostBuilder) owns its own data fetching
 * and just passes rows + setters down here.
 *
 * THE SHELL OWNS:
 *   • DndContext sensors (one per shell instance)
 *   • Viewport simulation state (desktop / tablet / mobile)
 *   • The actual layout (left tray, canvas, inspector)
 *
 * THE ADAPTER OWNS:
 *   • Loading rows from its source table (site_content / cms_pages /
 *     blog_posts) and writing them back
 *   • SEO + page-level metadata
 *   • Anything Hero-related (only the main-page adapter has a Hero)
 */
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  defaultDropAnimationSideEffects,
  pointerWithin,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { ImperativePanelGroupHandle } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { usePanelLimits } from "./usePanelLimits";
import AdminBuilderToolbar, { type ViewportMode } from "../site-editor/AdminBuilderToolbar";
import CanvasViewport from "../site-editor/CanvasViewport";
import { BuilderProvider, useBuilder } from "./BuilderContext";
import ElementsTray, {
  TrayDragPreview,
  isTrayDragData,
  isLayoutTrayDragData,
  type TrayDragData,
} from "./ElementsTray";
import { parseDropZoneId } from "./CanvasDropZone";
import { getWidget } from "@/lib/WidgetRegistry";
import type { PageRow } from "@/types/rows";
import { generateRowId, DEFAULT_ROW_LAYOUT, buildEmptyV3Row } from "@/lib/constants/rowDefaults";
import { RowsRenderer } from "@/features/site/rows/PageRows";
import InspectorPanel from "../inspector/InspectorPanel";
import CanvasBreadcrumb from "./CanvasBreadcrumb";
import PageNavigator, { isSectionNavDragData } from "./PageNavigator";

/* ------------------------------------------------------------------
 * BuilderDndShell — drop handler that needs `useBuilder()` (auto-select
 * the freshly-dropped widget). Must live inside <BuilderProvider>.
 * ------------------------------------------------------------------ */
interface BuilderDndShellProps {
  sensors: ReturnType<typeof useSensors>;
  activeDrag: TrayDragData | null;
  setActiveDrag: (d: TrayDragData | null) => void;
  onDragStart: (e: DragStartEvent) => void;
  pageRows: PageRow[];
  onRowsChange: (rows: PageRow[]) => void;
  children: React.ReactNode;
}

const BuilderDndShell = ({
  sensors,
  activeDrag,
  setActiveDrag,
  onDragStart,
  pageRows,
  onRowsChange,
  children,
}: BuilderDndShellProps) => {
  const { setActiveElement } = useBuilder();

  const handleDragEnd = (e: DragEndEvent) => {
    const data = e.active.data.current;
    const overId = e.over?.id;
    setActiveDrag(null);

    if (isSectionNavDragData(data) && typeof overId === "string" && overId.startsWith("section-row:")) {
      const overRowId = overId.replace("section-row:", "");
      if (data.rowId !== overRowId) {
        const oldIndex = pageRows.findIndex((row) => row.id === data.rowId);
        const newIndex = pageRows.findIndex((row) => row.id === overRowId);
        if (oldIndex >= 0 && newIndex >= 0) onRowsChange(arrayMove(pageRows, oldIndex, newIndex));
      }
      return;
    }

    // Debug Story 2.1 — "Abyss Test". Reject every drop that is not on
    // a registered CanvasDropZone. parseDropZoneId returns null for:
    //   • drops on the toolbar / inspector / library (no `over`)
    //   • drops on the 1px gap between zones (no `over`, thanks to
    //     `pointerWithin` collision detection below)
    //   • drops on `cell:*` droppables in the legacy edit-mode RowsManager
    //   • drops on any future non-canvas droppable
    // In every case we MUST bail before mutating the rows array OR the
    // active-element selection. The DragOverlay snaps back to origin via
    // `dropAnimation` so the editor sees clear "rejected" feedback.
    if (!isTrayDragData(data) || overId == null) return;
    const drop = parseDropZoneId(overId);
    if (!drop) return;

    // ── Layout-drop branch ───────────────────────────────────────
    // The "Structure" cards in the tray drop an EMPTY v3 row (with N
    // columns + one empty cell each) so editors can sketch a page
    // skeleton first and fill the cells with widgets afterwards.
    // Layout cards aren't allowed inside cells (they would create a
    // row inside a cell, which the schema doesn't support) — silently
    // ignore those drops.
    if (isLayoutTrayDragData(data)) {
      if (drop.kind === "cell") return;
      const emptyRow = buildEmptyV3Row(data.columnCount);
      let insertAt = pageRows.length;
      if (drop.kind === "before") {
        const idx = pageRows.findIndex((r) => r.id === drop.rowId);
        if (idx >= 0) insertAt = idx;
      }
      const next = [
        ...pageRows.slice(0, insertAt),
        emptyRow as unknown as PageRow,
        ...pageRows.slice(insertAt),
      ];
      onRowsChange(next);
      // Select the new row so the inspector shows its layout settings.
      setActiveElement(`row:${emptyRow.id}`);
      return;
    }

    const def = getWidget(data.type);
    if (!def) {
      // US 1.2 — never let a drop disappear into the void. If a widget
      // type is missing from the registry we surface a toast so editors
      // know WHY their drop didn't materialise (instead of blaming DnD).
      toast.error(`Unknown widget type: "${data.type}". Drop ignored.`);
      return;
    }
    // Defensive default-data spread (US 1.1). Even if a misregistered
    // widget slipped through with `defaultData === undefined`, we want
    // an empty object — never `{ ...undefined }` semantics elsewhere.
    const seed = (def.defaultData ?? {}) as Record<string, any>;

    // ── Cell-drop branch (US 1.2) ────────────────────────────────
    // Drop landed inside an empty cell on a v3 row. We push a new
    // PageWidget into that cell instead of creating a new row.
    if (drop.kind === "cell") {
      const newWidgetId = generateRowId();
      const next = pageRows.map((r: any) => {
        if (r.id !== drop.rowId || !Array.isArray(r.columns)) return r;
        return {
          ...r,
          columns: r.columns.map((col: any) => {
            if (col.id !== drop.colId) return col;
            return {
              ...col,
              cells: (col.cells || []).map((cc: any) => {
                if (cc.id !== drop.cellId) return cc;
                return {
                  ...cc,
                  widgets: [
                    ...(cc.widgets || []),
                    { id: newWidgetId, type: data.type, data: { ...seed } },
                  ],
                };
              }),
            };
          }),
        };
      });
      onRowsChange(next);
      // Select the new widget so the inspector opens its editor.
      setActiveElement(`widget:${newWidgetId}`);
      return;
    }

    const newRow: PageRow = {
      id: generateRowId(),
      type: data.type as PageRow["type"],
      strip_title: data.label || data.type,
      bg_color: "#FFFFFF",
      content: { ...seed },
      layout: { ...DEFAULT_ROW_LAYOUT },
    };

    let insertAt = pageRows.length;
    if (drop.kind === "before") {
      const idx = pageRows.findIndex((r) => r.id === drop.rowId);
      if (idx >= 0) insertAt = idx;
    }
    const next = [...pageRows.slice(0, insertAt), newRow, ...pageRows.slice(insertAt)];
    onRowsChange(next);
    setActiveElement(`widget:${newRow.id}`);
  };

  return (
    <DndContext
      sensors={sensors}
      // `pointerWithin` only flags an "over" when the cursor is actually
      // inside a droppable's bounds — so a drop on the 1px border between
      // two zones leaves `over` null and the handler safely rejects it.
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      {children}
      {/* Snap-back drop animation — when a tray drag misses every valid
          drop zone the overlay tweens back to the source element instead
          of vanishing at the cursor, giving the editor explicit visual
          confirmation that the drop was rejected. */}
      <DragOverlay dropAnimation={SNAP_BACK_ANIMATION}>
        {activeDrag ? <TrayDragPreview data={activeDrag} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

const SNAP_BACK_ANIMATION: DropAnimation = {
  duration: 180,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};

/* ------------------------------------------------------------------
 * CanvasSelectionSurface — clears selection on canvas-empty click.
 * ------------------------------------------------------------------ */
const CanvasSelectionSurface = ({ children }: { children: React.ReactNode }) => {
  const { setActiveElement } = useBuilder();
  return (
    <div onClick={() => setActiveElement(null)} className="contents">
      {children}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * PageBuilderShell — the public component
 * ════════════════════════════════════════════════════════════════════ */
export interface PageBuilderShellProps {
  /** Header label for the toolbar (e.g. "Edit Blog Post · Hello World"). */
  title: string;

  /** Page rows (working draft). */
  pageRows: PageRow[];
  onRowsChange: (rows: PageRow[]) => void;

  /** SEO. Both blogs and CMS pages have these on the page record. */
  seoMetaTitle: string;
  seoMetaDescription: string;
  onSeoTitleChange: (v: string) => void;
  onSeoDescriptionChange: (v: string) => void;

  /** Save / publish actions. The shell renders the buttons; the adapter
   * implements the actual DB writes. */
  onSaveDraft: () => Promise<void> | void;
  onPublish: () => Promise<void> | void;
  onPreview: () => void;
  saving: boolean;
  publishing: boolean;
  hasChanges: boolean;

  /** Optional pre-canvas slot (e.g. main page renders Hero here). */
  preCanvas?: React.ReactNode;

  /** Optional content rendered at the bottom of the inspector pane
   *  (e.g. revision-history panel for the current entity). */
  inspectorFooter?: React.ReactNode;

  /** Optional scheduling panel rendered above the revision history. */
  schedulePanel?: React.ReactNode;

  /* ── US 2.3 — Left Navigator identity slots ────────────────────
   * The Left Sidebar Navigator now shows the page's title and URL
   * front-and-centre. Adapters supply the values + setters; omit a
   * setter to render the corresponding field as read-only. */

  /** Editable page title shown at the top of the Left Navigator. */
  pageTitle: string;
  onPageTitleChange?: (next: string) => void;

  /** Page URL slug shown beneath the title. */
  pageSlug: string;
  onPageSlugChange?: (next: string) => void;

  /** Set false to render the slug as a read-only badge (e.g. main page "/"). */
  slugEditable?: boolean;

  /** Optional URL prefix shown in front of the slug (default "/"). */
  slugPrefix?: string;
}

const PageBuilderShell = (props: PageBuilderShellProps) => {
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  // EPIC 2 / US 2.1 — in-place Edit/Preview toggle. When "preview", we
  // hide the side panes so the canvas mimics the live site.
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const [activeDrag, setActiveDrag] = useState<TrayDragData | null>(null);
  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current;
    if (isTrayDragData(data)) setActiveDrag(data);
  };

  // Debug Story 1.1 — pixel-anchored panel limits.
  const limits = usePanelLimits();
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const resetLayout = () => {
    panelGroupRef.current?.setLayout([
      limits.leftDefault,
      limits.centerDefault,
      limits.rightDefault,
    ]);
  };

  const deviceWidth =
    viewport === "mobile" ? 390 : viewport === "tablet" ? 820 : null;

  return (
    <BuilderProvider pageRows={props.pageRows} onRowsChange={props.onRowsChange}>
      <BuilderDndShell
        sensors={sensors}
        activeDrag={activeDrag}
        setActiveDrag={setActiveDrag}
        onDragStart={handleDragStart}
        pageRows={props.pageRows}
        onRowsChange={props.onRowsChange}
      >
        <div className="flex flex-col h-[calc(100vh-180px)] min-h-[600px]">
          <AdminBuilderToolbar
            viewport={viewport}
            onViewportChange={setViewport}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
            onSaveDraft={() => props.onSaveDraft()}
            saving={props.saving}
            saveLabel="Save Draft"
            onPreview={props.onPreview}
            onPublish={() => props.onPublish()}
            publishing={props.publishing}
            hasChanges={props.hasChanges}
          />

          {/* Debug Story 1.2 — at very narrow widths the 3-pane budget
              (left ≥200 + center ≥300 + right ≥240 ≈ 740px) cannot fit.
              Fall back to a vertical stacked layout that scrolls instead
              of feeding impossible percentage constraints to the
              resizable group. */}
          <div ref={limits.containerRef} className="flex-1 min-h-0 flex">
            {(() => {
              const leftPane = (
                <aside
                  className="h-full flex flex-col"
                  style={{ backgroundColor: "hsl(var(--card))" }}
                >
                  {/* US 2.3 — Left Sidebar Navigator: Page Title + URL
                      slot at the top, then the canvas section list,
                      then the Elements tray. */}
                  <PageNavigator
                    pageTitle={props.pageTitle}
                    onPageTitleChange={props.onPageTitleChange}
                    pageSlug={props.pageSlug}
                    onPageSlugChange={props.onPageSlugChange}
                    slugEditable={props.slugEditable}
                    slugPrefix={props.slugPrefix}
                    pageRows={props.pageRows}
                    onRowsChange={props.onRowsChange}
                    schedulePanel={props.schedulePanel}
                    revisionPanel={props.inspectorFooter}
                  />
                </aside>
              );

              const centerPane = (
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex-1 min-h-0">
                    <CanvasViewport
                      deviceWidth={deviceWidth}
                      viewport={viewport}
                      supportsPreview={true}
                      canvasMode="preview"
                      setCanvasMode={() => {}}
                    >
                      <CanvasSelectionSurface>
                        {props.preCanvas}
                        {/* EPIC 2 / US 2.2 — no inner border/padding here:
                            the surrounding CanvasViewport supplies the
                            floating frame, and full-width hero rows must
                            still bleed edge-to-edge. */}
                        <RowsRenderer rows={props.pageRows} />
                      </CanvasSelectionSurface>
                    </CanvasViewport>
                  </div>
                  {/* EPIC 1 / US 1.5 — interactive DOM breadcrumb */}
                  <CanvasBreadcrumb />
                </div>
              );

              const rightPane = (
                <aside
                  className="h-full flex flex-col min-w-0"
                  style={{ backgroundColor: "hsl(var(--card))" }}
                >
                  <div
                    className="px-4 py-3 border-b"
                    style={{ borderColor: "hsl(var(--border))" }}
                  >
                    {/* US 3.1 — "Inspector" → "Element Settings" (user-facing).
                        US 4.1 — admin-section-label upgrades contrast. */}
                    <h3 className="admin-section-label font-body text-[10px]">
                      Element Settings
                    </h3>
                  </div>
                  {/* US 3.1 — strict scroll container. overflow-x-hidden +
                      min-w-0 keeps long inputs from blowing out the panel,
                      and gap-4 between sections (Content / Design /
                      Scheduling) prevents visual collisions. */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-4 flex flex-col gap-4">
                    <InspectorPanel
                      seoMetaTitle={props.seoMetaTitle}
                      seoMetaDescription={props.seoMetaDescription}
                      onSeoTitleChange={props.onSeoTitleChange}
                      onSeoDescriptionChange={props.onSeoDescriptionChange}
                      pageRows={props.pageRows}
                      onRowsChange={props.onRowsChange}
                    />
                  </div>
                </aside>
              );

              // EPIC 2 / US 2.1 — preview mode strips the side panes so
              // the canvas mimics the live site (toolbar + canvas only).
              if (previewMode === "preview") {
                return (
                  <div
                    className="flex-1 min-h-0 border-x border-b rounded-b-lg overflow-hidden"
                    style={{ borderColor: "hsl(var(--border) / 0.5)" }}
                  >
                    {centerPane}
                  </div>
                );
              }

              if (limits.stack) {
                return (
                  <div
                    className="flex-1 min-h-0 overflow-y-auto border-x border-b rounded-b-lg flex flex-col divide-y"
                    style={{ borderColor: "hsl(var(--border) / 0.5)" }}
                  >
                    <div className="min-h-[260px]">{leftPane}</div>
                    <div className="min-h-[420px]">{centerPane}</div>
                    <div className="min-h-[320px]">{rightPane}</div>
                  </div>
                );
              }

              return (
                <ResizablePanelGroup
                  ref={panelGroupRef}
                  direction="horizontal"
                  className="flex-1 border-x border-b overflow-hidden rounded-b-lg"
                  style={{ borderColor: "hsl(var(--border) / 0.5)" }}
                >
                  <ResizablePanel
                    defaultSize={limits.leftDefault}
                    minSize={limits.leftMin}
                    maxSize={limits.leftMax}
                  >
                    {leftPane}
                  </ResizablePanel>
                  <ResizableHandle withHandle onDoubleClick={resetLayout} />
                  <ResizablePanel
                    defaultSize={limits.centerDefault}
                    minSize={limits.centerMin}
                  >
                    {centerPane}
                  </ResizablePanel>
                  <ResizableHandle withHandle onDoubleClick={resetLayout} />
                  <ResizablePanel
                    defaultSize={limits.rightDefault}
                    minSize={limits.rightMin}
                    maxSize={limits.rightMax}
                  >
                    {rightPane}
                  </ResizablePanel>
                </ResizablePanelGroup>
              );
            })()}
          </div>
        </div>
      </BuilderDndShell>
    </BuilderProvider>
  );
};

export default PageBuilderShell;
