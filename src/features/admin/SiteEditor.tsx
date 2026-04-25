import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Layout, Image as ImageIcon, Search, Eye, Pencil } from "lucide-react";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import HeroEditor from "./site-editor/HeroEditor";
import RowsManager from "./site-editor/RowsManager";
import SeoFields from "./site-editor/SeoFields";
import { DEFAULT_ROWS, type PageRow } from "@/types/rows";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import AdminBuilderToolbar, { type ViewportMode } from "./site-editor/AdminBuilderToolbar";
// US 15.1 — render the SAME components the public site renders, against
// the in-memory draft content. WYSIWYG, no markup duplication.
import { HeroView } from "@/features/site/HeroSection";
import { RowsRenderer } from "@/features/site/rows/PageRows";
// US 15.2 — selection state for the visual canvas.
import { BuilderProvider, useBuilder } from "./builder/BuilderContext";
import SelectableWrapper from "./builder/SelectableWrapper";
// US 16.1 — contextual right-pane inspector, dispatched by activeElement.
import InspectorPanel from "./inspector/InspectorPanel";
// US 17.1 — draggable widget library (left sidebar).
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import ElementsTray, {
  TrayDragPreview,
  isTrayDragData,
  type TrayDragData,
} from "./builder/ElementsTray";


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
const SECTION_NAV: { key: "hero" | "page_rows" | "main_page_seo"; label: string; Icon: any }[] = [
  { key: "hero", label: "Hero Section", Icon: ImageIcon },
  { key: "page_rows", label: "Page Rows", Icon: Layout },
  { key: "main_page_seo", label: "SEO & Metadata", Icon: Search },
];

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

const SiteEditor = () => {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [activeSection, setActiveSection] = useState<"hero" | "page_rows" | "main_page_seo">("hero");
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

  /* ─── US 17.1 — drag-and-drop (Elements Tray → canvas) ──────────
   * Sensors with a small activation distance prevent accidental
   * drags when an editor merely clicks a tray card. The active
   * payload is mirrored into local state so the <DragOverlay> can
   * render a styled floating preview that follows the cursor. */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const [activeDrag, setActiveDrag] = useState<TrayDragData | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current;
    if (isTrayDragData(data)) setActiveDrag(data);
  };
  const handleDragEnd = (_e: DragEndEvent) => {
    // US 17.2 will turn a drop on the canvas into a real new row.
    // For 17.1 we just clear the preview state.
    setActiveDrag(null);
  };

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("section_key, content, draft_content")
        .in("section_key", ["hero", "page_rows", "main_page_seo"]) as any;
      if (data) {
        const mapped = data.map((s: any) => ({
          section_key: s.section_key,
          content: s.content,
          draft_content: s.draft_content || s.content,
        }));
        setSections(mapped);
      }
    };
    fetchAll();
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

  const pageRows: PageRow[] = (getDraft("page_rows") as any)?.rows || [];

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
    if (activeSection === "hero") {
      if (canvasMode === "preview") {
        // HeroView is a PURE component (US 15.1). Wrapped in
        // SelectableWrapper (US 15.2) so editors can target it.
        // The BuilderProvider lives at the top level of SiteEditor
        // (US 16.1) so the right-pane Inspector shares selection state.
        return (
          <CanvasSelectionSurface>
            <div className="rounded-md overflow-hidden border" style={{ borderColor: "hsl(var(--border) / 0.4)" }}>
              <SelectableWrapper id="hero" label="Hero" variant="row">
                <HeroView content={getDraft("hero") as any} />
              </SelectableWrapper>
            </div>
          </CanvasSelectionSurface>
        );
      }
      return (
        <HeroEditor content={getDraft("hero")} onChange={(f, v) => updateField("hero", f, v)} />
      );
    }
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
  const supportsPreview = activeSection === "hero" || activeSection === "page_rows";

  // Mobile/tablet canvas constraint (per US 14.2 dev notes — no iframes,
  // just a max-width swap so the rendered widget tree reflows naturally).
  const canvasMaxWidth =
    viewport === "mobile" ? 375 : viewport === "tablet" ? 768 : undefined;

  return (
    <BuilderProvider>
      {/* US 17.1 — single DndContext at the top of the builder so that
          tray drags (left sidebar) and any future canvas-side targets
          share one drag session. The DragOverlay renders the floating
          ghost preview that follows the cursor across the whole screen. */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
      <div className="flex flex-col h-[calc(100vh-180px)] min-h-[600px]">
      {/* ─── Top toolbar (US 14.2 + US 16.2) ──────────────────────────
          One global Save Draft button (saves every dirty section in a
          single batch). Accents itself when there are unsaved changes. */}
      <AdminBuilderToolbar
        viewport={viewport}
        onViewportChange={setViewport}
        onSaveDraft={saveAllDrafts}
        saving={saving === "__all__"}
        saveLabel="Save Draft"
        onPreview={openPreview}
        onPublish={publishAll}
        publishing={publishing}
        hasChanges={hasChanges}
      />

      {/* ─── Three-pane resizable shell ──────────────────────────── */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 border-x border-b overflow-hidden rounded-b-lg"
        style={{ borderColor: "hsl(var(--border) / 0.5)" }}
      >
        {/* LEFT — Library / Navigator (250px default, min 200px) */}
        <ResizablePanel defaultSize={18} minSize={14} maxSize={28}>
          <aside
            className="h-full flex flex-col"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: "hsl(var(--border) / 0.5)" }}
            >
              <h3
                className="font-body text-[10px] uppercase tracking-[0.18em] font-medium"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Navigator
              </h3>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
              {SECTION_NAV.map(({ key, label, Icon }) => {
                const active = activeSection === key;
                const dirty = isDirty(key);
                return (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left font-body text-sm transition-colors"
                    style={{
                      backgroundColor: active ? "hsl(var(--accent) / 0.18)" : "transparent",
                      color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      fontWeight: active ? 500 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.backgroundColor = "hsl(var(--muted) / 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Icon size={15} />
                    <span className="flex-1 truncate">{label}</span>
                    {dirty && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "hsl(var(--accent))" }}
                        aria-label="Unsaved changes"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* CENTER — Canvas (flexible, subtle gray bg) */}
        <ResizablePanel defaultSize={57} minSize={30}>
          <section
            className="h-full overflow-y-auto"
            style={{ backgroundColor: "hsl(var(--muted) / 0.35)" }}
          >
            <div
              className="mx-auto p-6 transition-[max-width] duration-300 ease-out"
              style={{
                // WHY: dynamic max-width simulates the viewport without an
                // iframe — the actual widget tree reflows at its real
                // Tailwind breakpoints (md / lg) so editors see the true
                // mobile/tablet stacking behavior.
                maxWidth: canvasMaxWidth ? `${canvasMaxWidth}px` : "64rem", // 64rem = max-w-5xl
              }}
            >
              {/* US 15.1 — Preview / Edit toggle (per-section, hidden for SEO) */}
              {supportsPreview && (
                <div className="flex items-center justify-end mb-3">
                  <div
                    className="inline-flex items-center rounded-full border p-0.5"
                    style={{ borderColor: "hsl(var(--border) / 0.6)", backgroundColor: "hsl(var(--card))" }}
                    role="group"
                    aria-label="Canvas mode"
                  >
                    {([
                      { key: "preview", label: "Preview", Icon: Eye },
                      { key: "edit", label: "Edit", Icon: Pencil },
                    ] as const).map(({ key, label, Icon }) => {
                      const active = canvasMode === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCanvasMode(key)}
                          aria-pressed={active}
                          className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors"
                          style={{
                            backgroundColor: active ? "hsl(var(--accent))" : "transparent",
                            color: active ? "hsl(var(--accent-foreground))" : "hsl(var(--muted-foreground))",
                          }}
                        >
                          <Icon size={12} /> {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div
                className="rounded-lg border shadow-sm overflow-hidden"
                style={{
                  // WHY no padding when previewing: the live frontend
                  // components own their own spacing/backgrounds (e.g.
                  // hero is full-bleed). Padding the wrapper would crop
                  // their visual edge. Edit mode keeps the comfy padding.
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border) / 0.5)",
                  padding: canvasMode === "preview" && supportsPreview ? 0 : "1.25rem",
                }}
              >
                {renderCanvas()}
              </div>
            </div>
          </section>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* RIGHT — Inspector (300px default, max 400px) */}
        <ResizablePanel defaultSize={25} minSize={18} maxSize={32}>
          <aside
            className="h-full flex flex-col"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: "hsl(var(--border) / 0.5)" }}
            >
              <h3
                className="font-body text-[10px] uppercase tracking-[0.18em] font-medium"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Inspector
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* US 16.1 — chameleon inspector. Reads activeElement from
                  the BuilderContext (lifted to the top of SiteEditor) and
                  renders SEO / row layout / widget admin accordingly. */}
              <InspectorPanel
                seoMetaTitle={(getDraft("main_page_seo") as any)?.meta_title || ""}
                seoMetaDescription={(getDraft("main_page_seo") as any)?.meta_description || ""}
                onSeoTitleChange={(v) => updateField("main_page_seo", "meta_title", v)}
                onSeoDescriptionChange={(v) => updateField("main_page_seo", "meta_description", v)}
                heroContent={getDraft("hero")}
                onHeroFieldChange={(f, v) => updateField("hero", f, v)}
                pageRows={pageRows}
                onRowsChange={(rows) => updateFullDraft("page_rows", { rows })}
              />
            </div>
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>
      </div>
    </BuilderProvider>
  );
};

export default SiteEditor;
