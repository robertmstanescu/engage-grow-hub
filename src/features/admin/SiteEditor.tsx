import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Layout, Image as ImageIcon, Search, MousePointer2 } from "lucide-react";
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

const SiteEditor = () => {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [activeSection, setActiveSection] = useState<"hero" | "page_rows" | "main_page_seo">("hero");
  const [saving, setSaving] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  // US 14.2 — viewport simulation. Drives a max-width on the canvas wrapper.
  const [viewport, setViewport] = useState<ViewportMode>("desktop");

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
  const renderCanvas = () => {
    if (activeSection === "hero") {
      return (
        <HeroEditor content={getDraft("hero")} onChange={(f, v) => updateField("hero", f, v)} />
      );
    }
    if (activeSection === "page_rows") {
      return (
        <RowsManager rows={pageRows} onChange={(rows) => updateFullDraft("page_rows", { rows })} />
      );
    }
    // SEO
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

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[600px] gap-2">
      {/* ─── Toolbar (above the three panes) ──────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>
          Edit Main Page
        </h2>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body text-[11px]"
              style={{ backgroundColor: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent-foreground))" }}
            >
              <FileText size={12} /> Unpublished changes
            </span>
          )}
          <button
            onClick={openPreview}
            className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
            style={{ border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
          >
            <Eye size={13} /> Preview
          </button>
          <button
            onClick={publishAll}
            disabled={publishing || !hasChanges}
            className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
          >
            <Send size={13} /> {publishing ? "Publishing…" : "Publish All"}
          </button>
        </div>
      </div>

      {/* ─── Three-pane resizable shell ──────────────────────────── */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 rounded-lg border overflow-hidden"
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
            <div className="max-w-5xl mx-auto p-6">
              <div
                className="rounded-lg border p-5 shadow-sm"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border) / 0.5)",
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
              {/*
                Inner inspector content is rendered by individual editors
                (e.g. WidgetSettingsDrawer launched from RowsManager). This
                pane shows the empty-state hint until a future story moves
                that drawer into this slot.
              */}
              <div
                className="flex flex-col items-center justify-center text-center h-full min-h-[280px] gap-3"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                <MousePointer2 size={28} strokeWidth={1.4} />
                <p className="font-body text-xs leading-relaxed max-w-[220px]">
                  Select a widget on the canvas to see its settings here.
                </p>
              </div>
            </div>
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default SiteEditor;
