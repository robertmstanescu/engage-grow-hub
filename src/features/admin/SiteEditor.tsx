import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { invalidateSiteContent } from "@/hooks/useSiteContent";
import RowsManager from "./site-editor/RowsManager";
import SeoFields from "./site-editor/SeoFields";
// US 2.3 — unified left-rail navigator (Page Title + URL + Sections + Elements).
import PageNavigator from "./builder/PageNavigator";
import { DEFAULT_ROWS, type PageRow, normalizeRowsToV3 } from "@/types/rows";
import type { ImperativePanelGroupHandle } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { usePanelLimits } from "./builder/usePanelLimits";
import AdminBuilderToolbar, { type ViewportMode } from "./site-editor/AdminBuilderToolbar";
import CanvasViewport from "./site-editor/CanvasViewport";
// US 15.1 — render the SAME components the public site renders, against
// the in-memory draft content. WYSIWYG, no markup duplication.
import { RowsRenderer } from "@/features/site/rows/PageRows";
// US 15.2 — selection state for the visual canvas.
import { BuilderProvider, useBuilder } from "./builder/BuilderContext";
import CanvasBreadcrumb from "./builder/CanvasBreadcrumb";
// US 16.1 — contextual right-pane inspector, dispatched by activeElement.
import InspectorPanel from "./inspector/InspectorPanel";
import RevisionHistoryPanel from "./builder/RevisionHistoryPanel";
import SiteSectionSchedulePanel from "./builder/SiteSectionSchedulePanel";
import {
  findMissingAltViolations,
  formatAltMissingMessage,
} from "@/services/contentAccessibility";
// US 17.1 — draggable widget library (left sidebar).
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
import ElementsTray, {
  TrayDragPreview,
  isTrayDragData,
  type TrayDragData,
} from "./builder/ElementsTray";
// US 17.2 — drop-target id parsing for tray-sourced drops.
import { parseDropZoneId } from "./builder/CanvasDropZone";
// US 17.2 — registry lookup so dropped widgets seed with proper defaults.
import { getWidget } from "@/lib/WidgetRegistry";
import { generateRowId, DEFAULT_ROW_LAYOUT } from "@/types/rows";


interface SectionData {
  section_key: string;
  content: Record<string, any>;
  draft_content: Record<string, any> | null;
}

/**
 * EPIC 14 — Three-Pane Builder Shell
 *
 * Layout:
 *   ┌──────────────┬─────────────────────────┬───────────────┐
 *   │  Library /   │        Canvas           │   Inspector   │
 *   │  Navigator   │  (active section editor)│  (settings)   │
 *   │   ~250 px    │      flex (slate)       │    ~300 px    │
 *   └──────────────┴─────────────────────────┴───────────────┘
 *
 * WHY: Replaces the legacy vertical accordion. Editors now have persistent
 * tools on the left, the page in the center, and contextual settings on
 * the right — mirroring Webflow / Figma. Inner widget editors are unchanged
 * in this story; only the outer shell is rebuilt (US 14.1).
 */
/* US 2.1 — The "hero" entry is gone. Hero is now an ordinary widget
 * at page_rows[0]; no separate left-rail tab and no separate Supabase
 * section. The remaining sections are page_rows (the canvas) and
 * main_page_seo (page-wide metadata). */
// US 2.3 — SECTION_NAV is gone. Sections are now derived from page_rows
// inside <PageNavigator />. The "main_page_seo" surface lives in the
// inspector and SEO modal, not in a left-rail tab.

/**
 * CanvasSelectionSurface — captures clicks on EMPTY canvas area to
 * clear the active selection (US 15.2). Lives inside <BuilderProvider>
 * so it can call `setActiveElement(null)` when the user clicks
 * anywhere outside a SelectableWrapper. Selectable wrappers themselves
 * call `e.stopPropagation()`, so a click that lands on a row/widget
 * never reaches this handler.
 */
const CanvasSelectionSurface = ({ children }: { children: React.ReactNode }) => {
  const { setActiveElement } = useBuilder();
  return (
    <div onClick={() => setActiveElement(null)} className="contents">
      {children}
    </div>
  );
};

/**
 * BuilderDndShell — owns the `onDragEnd` logic that needs both the
 * page-rows state AND the selection context (US 17.2). It MUST render
 * under <BuilderProvider> because it calls `useBuilder()` to auto-
 * select the freshly-dropped widget. Sensors and the activeDrag
 * mirror are passed in from <SiteEditor> (they're pure state).
 */
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

    // Look up defaults from the registry — the OCP win: any newly
    // registered widget automatically becomes droppable, no edits here.
    const def = getWidget(data.type);
    if (!def) return;

    const newRow: PageRow = {
      id: generateRowId(),
      type: data.type as PageRow["type"],
      strip_title: data.label || data.type,
      bg_color: "#FFFFFF",
      content: { ...(def.defaultData as Record<string, any>) },
      layout: { ...DEFAULT_ROW_LAYOUT },
    };

    // Compute insertion index. "before:<rowId>" inserts at that row's
    // index; "end" appends to the bottom of the page.
    let insertAt = pageRows.length;
    if (drop.kind === "before") {
      const idx = pageRows.findIndex((r) => r.id === drop.rowId);
      if (idx >= 0) insertAt = idx;
    }
    const next = [...pageRows.slice(0, insertAt), newRow, ...pageRows.slice(insertAt)];
    onRowsChange(next);

    // Auto-select the new widget so the right Inspector instantly
    // opens its editor (per the AC spec).
    setActiveElement(`widget:${newRow.id}`);
  };

  return (
    <DndContext
      sensors={sensors}
      // pointerWithin only flags an "over" target when the cursor is
      // actually inside a droppable's bounds — drops on the 1px gap
      // between two zones therefore leave `over` null and the handler
      // safely rejects them (Debug Story 2.1).
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      {children}
      {/* Floating drag preview — rendered into a portal by dnd-kit so it
          escapes the sidebar's overflow:hidden and follows the cursor
          across the entire viewport. Snap-back animation gives explicit
          "rejected" feedback when a drop misses every valid target. */}
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

const SiteEditor = () => {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [activeSection, setActiveSection] = useState<"page_rows" | "main_page_seo">("page_rows");
  const [saving, setSaving] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  // US 14.2 — viewport simulation. Drives a max-width on the canvas wrapper.
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  // US 15.1 — Canvas mode: "preview" shows the actual frontend
  // components rendering live draft state (WYSIWYG); "edit" shows the
  // existing form-based editors (HeroEditor / RowsManager) so editors
  // can still drag, drop and configure widgets in the form-driven UI.
  // Default to preview because that's the whole point of US 15.1.
  const [canvasMode, setCanvasMode] = useState<"preview" | "edit">("preview");
  // EPIC 2 / US 2.1 — in-place Edit/Preview toggle for the toolbar.
  // Defaults to "edit" so editors land in the full builder.
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  // Debug Story 1.1 — pixel-anchored panel limits + double-click reset.
  const limits = usePanelLimits();
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const resetLayout = () => {
    panelGroupRef.current?.setLayout([
      limits.leftDefault,
      limits.centerDefault,
      limits.rightDefault,
    ]);
  };

  /* ─── US 17.1 / 17.2 — drag-and-drop (Elements Tray → canvas) ──
   * Sensors with a small activation distance prevent accidental
   * drags when an editor merely clicks a tray card. The active
   * payload is mirrored into local state so the <DragOverlay> can
   * render a styled floating preview that follows the cursor.
   *
   * The actual drop handler lives in <BuilderDndShell> below — it
   * needs `useBuilder()` (to auto-select the freshly-dropped widget),
   * which means it must render UNDER <BuilderProvider>. We hoist
   * sensors + the activeDrag mirror up here because both pieces are
   * pure state and don't need provider access.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const [activeDrag, setActiveDrag] = useState<TrayDragData | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current;
    if (isTrayDragData(data)) setActiveDrag(data);
  };

  const reloadSections = async () => {
    const { data } = await supabase
      .from("site_content")
      .select("section_key, content, draft_content")
      .in("section_key", ["page_rows", "main_page_seo"]) as any;
    if (data) {
      const mapped = data.map((s: any) => ({
        section_key: s.section_key,
        content: s.content,
        draft_content: s.draft_content || s.content,
      }));
      setSections(mapped);
    }
  };

  useEffect(() => {
    reloadSections();
  }, []);

  const getSection = (key: string) => sections.find((s) => s.section_key === key);
  const getDraft = (key: string) => getSection(key)?.draft_content || getSection(key)?.content || {};

  const updateField = (sectionKey: string, field: string, value: any) => {
    setSections((prev) =>
      prev.map((s) =>
        s.section_key === sectionKey
          ? { ...s, draft_content: { ...(s.draft_content || s.content), [field]: value } }
          : s
      )
    );
  };

  const updateFullDraft = (sectionKey: string, draft: Record<string, any>) => {
    setSections((prev) =>
      prev.map((s) => (s.section_key === sectionKey ? { ...s, draft_content: draft } : s))
    );
  };

  const saveDraft = async (sectionKey: string) => {
    setSaving(sectionKey);
    const section = getSection(sectionKey);
    if (!section) { setSaving(null); return; }

    const draft = (section.draft_content || section.content) as any;
    const { data: existing } = await supabase
      .from("site_content")
      .select("id")
      .eq("section_key", sectionKey)
      .maybeSingle();

    if (existing) {
      await supabase.from("site_content").update({ draft_content: draft }).eq("section_key", sectionKey);
    } else {
      await supabase.from("site_content").insert({ section_key: sectionKey, content: draft, draft_content: draft } as any);
    }

    toast.success("Draft saved");
    setSaving(null);
  };

  /**
   * US 16.2 — Global Save Draft. There is now ONE save action in the
   * toolbar (no per-widget Save buttons anywhere). It writes draft_content
   * for EVERY dirty section in a single batch — this is the only path
   * from in-memory edits to the database. Until clicked, all edits live
   * purely in local state (refresh = lose changes, by design).
   */
  const saveAllDrafts = async () => {
    const dirty = sections.filter(
      (s) => JSON.stringify(s.draft_content) !== JSON.stringify(s.content),
    );
    if (dirty.length === 0) {
      toast.info("Nothing to save");
      return;
    }
    setSaving("__all__");
    const updates = dirty.map((s) => {
      const draft = (s.draft_content || s.content) as any;
      return supabase.from("site_content").upsert(
        { section_key: s.section_key, content: s.content, draft_content: draft } as any,
        { onConflict: "section_key" },
      );
    });
    const results = await Promise.all(updates);
    const err = results.find((r) => r.error);
    if (err?.error) {
      toast.error((err.error as any).message);
    } else {
      toast.success(`Draft saved (${dirty.length} ${dirty.length === 1 ? "section" : "sections"})`);
    }
    setSaving(null);
  };

  const publishAll = async () => {
    // EPIC 13 / US 13.1 — gate publish on accessibility (alt text).
    // We pull rows from the live draft snapshot — the source of truth
    // about what is ABOUT to go live.
    const draftRowsForCheck =
      ((sections.find((s) => s.section_key === "page_rows")?.draft_content as any)?.rows ||
        (sections.find((s) => s.section_key === "page_rows")?.content as any)?.rows ||
        []) as PageRow[];
    const violations = findMissingAltViolations(draftRowsForCheck);
    const message = formatAltMissingMessage(violations);
    if (message) {
      toast.error(message, {
        description: violations
          .map((v) => `• ${v.label} — “${v.stripTitle}”`)
          .join("\n"),
      });
      return;
    }

    setPublishing(true);
    const updates = sections.map((s) => {
      const data = (s.draft_content || s.content) as any;
      return supabase
        .from("site_content")
        .upsert({ section_key: s.section_key, content: data, draft_content: data } as any, { onConflict: "section_key" });
    });

    const results = await Promise.all(updates);
    const err = results.find((r) => r.error);
    if (err?.error) {
      toast.error((err.error as any).message);
    } else {
      setSections((prev) => prev.map((s) => ({ ...s, content: s.draft_content || s.content })));
      sections.forEach((s) => invalidateSiteContent(s.section_key));
      toast.success("All changes published!");
    }
    setPublishing(false);
  };

  const openPreview = () => {
    const saveAll = sections.map((s) =>
      supabase.from("site_content").update({ draft_content: (s.draft_content || s.content) as any }).eq("section_key", s.section_key)
    );
    Promise.all(saveAll).then(() => window.open("/?preview=1", "_blank"));
  };

  const hasChanges = sections.some((s) => JSON.stringify(s.draft_content) !== JSON.stringify(s.content));

  // Ensure page_rows and main_page_seo sections exist in state
  useEffect(() => {
    if (sections.length > 0) {
      const toAdd: any[] = [];
      if (!getSection("page_rows")) {
        toAdd.push({ section_key: "page_rows", content: { rows: DEFAULT_ROWS }, draft_content: { rows: DEFAULT_ROWS } });
      }
      if (!getSection("main_page_seo")) {
        toAdd.push({ section_key: "main_page_seo", content: { meta_title: "", meta_description: "" }, draft_content: { meta_title: "", meta_description: "" } });
      }
      if (toAdd.length) setSections((prev) => [...prev, ...toAdd]);
    }
  }, [sections.length]);

  // US 2.2 — Normalize draft to v3 on every read so widgetLocator,
  // RowsRenderer, and the inspector all operate on the Atomic Node Tree
  // exclusively. Stale v1/v2 payloads in the draft (loaded from DB
  // before the schema cut) get upgraded once on the way in.
  const pageRows: PageRow[] = normalizeRowsToV3((getDraft("page_rows") as any)?.rows || []) as unknown as PageRow[];

  // Per-section dirty indicator for the navigator
  const isDirty = (key: string) => {
    const s = getSection(key);
    if (!s) return false;
    return JSON.stringify(s.draft_content) !== JSON.stringify(s.content);
  };

  /* ─── Canvas content for the active section ─────────────────────── */
  // NOTE: per-section "Save Draft" buttons were removed in US 14.2 — the
  // toolbar's Save Draft button now saves the currently-active section.
  //
  // US 15.1 — Two render modes:
  //   • "preview" → live frontend components (HeroView / RowsRenderer)
  //                 fed the in-memory draft. True WYSIWYG: every edit
  //                 (still made via the form drawers / inspector) shows
  //                 up here on the next render.
  //   • "edit"    → the existing form-driven UI (HeroEditor, RowsManager)
  //                 with drag-and-drop reordering, add/delete widget
  //                 controls, etc. Kept available so editors can perform
  //                 actions that don't have inline-canvas equivalents
  //                 yet (a later epic will move these inline).
  const renderCanvas = () => {
    /* US 2.1 — The dedicated "hero" canvas branch is gone. Hero is
     * rendered alongside everything else by RowsRenderer because it now
     * lives at page_rows[0]. */
    if (activeSection === "page_rows") {
      if (canvasMode === "preview") {
        // RowsRenderer is the same component the public site uses (via
        // PageRows). Inside RowsRenderer, every row + widget is wrapped
        // in <SelectableWrapper> (US 15.2) — which short-circuits to a
        // no-op fragment on the public site (no BuilderProvider there).
        return (
          <CanvasSelectionSurface>
            <div className="rounded-md overflow-hidden border" style={{ borderColor: "hsl(var(--border) / 0.4)" }}>
              <RowsRenderer rows={pageRows} />
            </div>
          </CanvasSelectionSurface>
        );
      }
      return (
        <RowsManager rows={pageRows} onChange={(rows) => updateFullDraft("page_rows", { rows })} />
      );
    }
    // SEO has no visual frontend representation — always show the form.
    return (
      <div className="space-y-4">
        <p className="font-body text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          OG image for social sharing is set via the Publish button. These fields control search engine metadata only.
        </p>
        <SeoFields
          metaTitle={(getDraft("main_page_seo") as any)?.meta_title || ""}
          metaDescription={(getDraft("main_page_seo") as any)?.meta_description || ""}
          onTitleChange={(v) => updateField("main_page_seo", "meta_title", v)}
          onDescriptionChange={(v) => updateField("main_page_seo", "meta_description", v)}
        />
      </div>
    );
  };

  // Preview/Edit toggle is hidden for SEO (no visual rep).
  const supportsPreview = activeSection === "page_rows";

  // ─── Viewport simulation (US 14.2, hardened) ────────────────────
  // PROBLEM with the previous max-width-only approach: tailwind's `md:`
  // / `lg:` variants are evaluated against the REAL viewport, so even
  // when the canvas was visually narrowed to 375px, every nested widget
  // still believed it was on desktop. To get true device behaviour we
  // render the simulated viewport at its natural CSS pixel WIDTH and
  // scale-down with CSS transform so it visually fits the canvas column.
  // The viewport meta + media queries inside the wrapper still see the
  // original parent width (CSS limitation — only iframes get isolated
  // breakpoints), but the LAYOUT WIDTH the widgets compute against is
  // now correct, which is what 95% of "looks wrong on phone" bugs are.
  const deviceWidth =
    viewport === "mobile" ? 390 : viewport === "tablet" ? 820 : null;

  return (
    <BuilderProvider pageRows={pageRows} onRowsChange={(rows) => updateFullDraft("page_rows", { rows })}>
      {/* US 17.1 / 17.2 — single DndContext at the top of the builder so
          tray drags (left sidebar) and canvas drop targets share one
          drag session. The drop handler lives in <BuilderDndShell> so
          it can call useBuilder() to auto-select the new widget. */}
      <BuilderDndShell
        sensors={sensors}
        activeDrag={activeDrag}
        setActiveDrag={setActiveDrag}
        onDragStart={handleDragStart}
        pageRows={pageRows}
        onRowsChange={(rows) => updateFullDraft("page_rows", { rows })}
      >
      <div className="flex flex-col h-[calc(100vh-180px)] min-h-[600px]">
      {/* ─── Top toolbar (US 14.2 + US 16.2) ──────────────────────────
          One global Save Draft button (saves every dirty section in a
          single batch). Accents itself when there are unsaved changes. */}
      <AdminBuilderToolbar
        viewport={viewport}
        onViewportChange={setViewport}
        previewMode={previewMode}
        onPreviewModeChange={setPreviewMode}
        onSaveDraft={saveAllDrafts}
        saving={saving === "__all__"}
        saveLabel="Save Draft"
        onPreview={openPreview}
        onPublish={publishAll}
        publishing={publishing}
        hasChanges={hasChanges}
      />

      {/* ─── Three-pane resizable shell ──────────────────────────────
          Debug Story 1.1 — pixel-anchored limits via usePanelLimits.
          Debug Story 1.2 — when the container is too narrow to satisfy
          left+center+right minimums (≈740px), fall back to a vertical
          stacked + scrollable layout instead of jamming impossible
          percentage constraints into react-resizable-panels. */}
      <div ref={limits.containerRef} className="flex-1 min-h-0 flex">
        {(() => {
          const leftPane = (
            <aside
              className="h-full flex flex-col"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              {/* US 2.3 — replaces the old "Navigator + Elements" stack
                  with the unified PageNavigator (Title + URL + Sections
                  + Elements). The homepage's slug is fixed at "/", so
                  slugEditable={false}. The page title is mirrored to
                  the SEO meta_title so editors edit it in one place. */}
              <PageNavigator
                pageTitle={(getDraft("main_page_seo") as any)?.meta_title || ""}
                onPageTitleChange={(v) => updateField("main_page_seo", "meta_title", v)}
                pageSlug=""
                slugEditable={false}
                slugPrefix="/"
                pageRows={pageRows}
              />
            </aside>
          );

          const centerPane = (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex-1 min-h-0">
                <CanvasViewport
                  deviceWidth={deviceWidth}
                  viewport={viewport}
                  supportsPreview={supportsPreview}
                  canvasMode={canvasMode}
                  setCanvasMode={setCanvasMode}
                >
                  {renderCanvas()}
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
                style={{ borderColor: "hsl(var(--border) / 0.5)" }}
              >
                {/* US 3.1 — "Inspector" → "Element Settings" (user-facing). */}
                <h3
                  className="font-body text-[10px] uppercase tracking-[0.18em] font-medium"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  Element Settings
                </h3>
              </div>
              {/* US 3.1 — strict scroll container. overflow-x-hidden + min-w-0
                  prevents long text inputs from pushing the panel sideways,
                  and gap-4 between Content / Design / Scheduling stops the
                  sections from visually crashing into each other. */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-4 flex flex-col gap-4">
                <InspectorPanel
                  seoMetaTitle={(getDraft("main_page_seo") as any)?.meta_title || ""}
                  seoMetaDescription={(getDraft("main_page_seo") as any)?.meta_description || ""}
                  onSeoTitleChange={(v) => updateField("main_page_seo", "meta_title", v)}
                  onSeoDescriptionChange={(v) => updateField("main_page_seo", "meta_description", v)}
                  pageRows={pageRows}
                  onRowsChange={(rows) => updateFullDraft("page_rows", { rows })}
                />
                <div className="pt-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
                  <SiteSectionSchedulePanel sectionKey={activeSection} />
                </div>
                <div className="pt-4 border-t" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
                  <RevisionHistoryPanel
                    entityType="site_content"
                    entityRef={activeSection}
                    onRestored={() => {
                      invalidateSiteContent(activeSection);
                      reloadSections();
                    }}
                  />
                </div>
              </div>
            </aside>
          );

          // EPIC 2 / US 2.1 — preview mode strips the side panes so the
          // canvas mimics the live site (toolbar + canvas only).
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

export default SiteEditor;
