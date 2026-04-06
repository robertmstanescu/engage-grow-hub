import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import {
  LayoutDashboard, FileText, Compass, BookOpen,
  Users, Mail, Image, Palette, Settings, LogOut,
  Save, Send,
  GripVertical, Plus, Trash2, ArrowLeft,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import BlogEditor from "./BlogEditor";
import ContactsList from "./ContactsList";
import EmailCampaigns from "./EmailCampaigns";
import SiteEditor from "./SiteEditor";
import TagsManager from "./TagsManager";
import PagesManager from "./PagesManager";
import NavigationManager from "./NavigationManager";
import GlobalSettings from "./GlobalSettings";
import MediaGallery from "./MediaGallery";
import BrandSettings from "./BrandSettings";
import HeroEditor from "./site-editor/HeroEditor";
import SeoFields from "./site-editor/SeoFields";
import { DEFAULT_ROWS, type PageRow, DEFAULT_ROW_LAYOUT, DEFAULT_CONTACT_FIELDS } from "@/types/rows";
import { Field, RichField, SectionBox, ColorField, SelectField } from "./site-editor/FieldComponents";
import TitleLineEditor from "./site-editor/TitleLineEditor";
import SubtitleEditor from "./site-editor/SubtitleEditor";
import RowLayoutSettings from "./site-editor/RowLayoutSettings";
import PillarEditor from "./site-editor/PillarEditor";
import ImageTextEditor from "./site-editor/ImageTextEditor";
import ProfileEditor from "./site-editor/ProfileEditor";
import GridEditor from "./site-editor/GridEditor";
import ImagePickerField from "./ImagePickerField";
import { patchLivePreviewState, pushLivePreviewToWindow, readLivePreviewState } from "@/lib/livePreview";

type Tab = "site" | "pages" | "navigation" | "blog" | "contacts" | "emails" | "media" | "brand" | "settings";

type PropertiesSubTab = "content" | "style" | "seo";

interface Props { session: any; }

/* ── Helpers ── */
const SECTION_EMOJI: Record<string, string> = {
  hero: "🎭", text: "✦", service: "💀", boxed: "✦", contact: "📬",
  image_text: "🖼", profile: "👤", grid: "📊",
};

const ROW_TYPE_OPTIONS: { type: PageRow["type"]; label: string; emoji: string }[] = [
  { type: "text", label: "Text", emoji: "✦" },
  { type: "service", label: "Service Pillar", emoji: "💀" },
  { type: "boxed", label: "Boxed Cards", emoji: "✦" },
  { type: "contact", label: "Contact", emoji: "📬" },
  { type: "hero", label: "Hero", emoji: "🎭" },
  { type: "image_text", label: "Image & Text", emoji: "🖼" },
  { type: "profile", label: "Profile", emoji: "👤" },
  { type: "grid", label: "Grid", emoji: "📊" },
];
const sectionEmoji = (type: string) => SECTION_EMOJI[type] || "📄";



const NAV_GROUPS = [
  {
    label: "CONTENT",
    items: [
      { key: "site" as Tab, icon: LayoutDashboard, label: "Site Editor" },
      { key: "pages" as Tab, icon: FileText, label: "Pages" },
      { key: "navigation" as Tab, icon: Compass, label: "Navigation" },
      { key: "blog" as Tab, icon: BookOpen, label: "Blog Posts" },
    ],
  },
  {
    label: "ENGAGE",
    items: [
      { key: "contacts" as Tab, icon: Users, label: "Contacts" },
      { key: "emails" as Tab, icon: Mail, label: "Email Campaigns" },
      { key: "media" as Tab, icon: Image, label: "Media" },
    ],
  },
  {
    label: "CONFIGURE",
    items: [
      { key: "brand" as Tab, icon: Palette, label: "Brand" },
      { key: "settings" as Tab, icon: Settings, label: "Settings" },
    ],
  },
];

interface SectionData {
  section_key: string;
  content: Record<string, any>;
  draft_content: Record<string, any> | null;
}

interface CmsPageRef {
  id: string;
  slug: string;
  title: string;
}

/* ═══════════════════════════════════════════════
   SORTABLE SECTION BLOCK
   ═══════════════════════════════════════════════ */
const SortableSectionBlock = ({
  row, isSelected, onClick,
}: {
  row: PageRow; isSelected: boolean; onClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`Section: ${row.strip_title || row.type}`}
    >
      <span
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: isSelected ? "hsl(var(--secondary))" : "transparent" }}
      />
      <span className="text-sm flex-shrink-0">{sectionEmoji(row.type)}</span>
      <div className="min-w-0 flex-1">
        <div
          className="font-body text-[11px] font-medium truncate"
          style={{ color: isSelected ? "hsl(var(--secondary))" : "hsl(var(--foreground))" }}
        >
          {row.strip_title || row.type}
        </div>
        <div
          className="font-body text-[9px] uppercase tracking-wider"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          {row.type}
        </div>
      </div>
      <GripVertical size={12} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
    </div>
  );
};

/* ═══════════════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════════════ */
const AdminDashboard = ({ session }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>("site");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [propertiesSubTab, setPropertiesSubTab] = useState<PropertiesSubTab>("content");
  const [showAddRow, setShowAddRow] = useState(false);

  // ── CMS page editing ──
  const [cmsPage, setCmsPage] = useState<CmsPageRef | null>(null);
  const [cmsPageRows, setCmsPageRows] = useState<PageRow[]>([]);
  const [cmsPageStatus, setCmsPageStatus] = useState<string>("draft");
  const [cmsPageMeta, setCmsPageMeta] = useState<{ meta_title: string; meta_description: string }>({ meta_title: "", meta_description: "" });

  // ── Site content state (main page) ──
  const [sections, setSections] = useState<SectionData[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Load main page data
  useEffect(() => {
    if (cmsPage) return;
    const fetchAll = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("section_key, content, draft_content")
        .in("section_key", ["hero", "page_rows", "main_page_seo"]) as any;
      if (data && data.length > 0) {
        const mapped = data.map((s: any) => ({
          section_key: s.section_key,
          content: s.content,
          draft_content: s.draft_content || s.content,
        }));
        setSections(mapped);
      } else {
        // No data yet — seed with defaults
        setSections([
          { section_key: "page_rows", content: { rows: DEFAULT_ROWS }, draft_content: { rows: DEFAULT_ROWS } },
          { section_key: "main_page_seo", content: { meta_title: "", meta_description: "" }, draft_content: { meta_title: "", meta_description: "" } },
        ]);
      }
    };
    fetchAll();
  }, [cmsPage]);

  // Load CMS page data
  useEffect(() => {
    if (!cmsPage) return;
    const load = async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("id", cmsPage.id)
        .maybeSingle() as any;
      if (data) {
        setCmsPageRows(data.draft_page_rows || data.page_rows || []);
        setCmsPageStatus(data.status || "draft");
        setCmsPageMeta({ meta_title: data.meta_title || "", meta_description: data.meta_description || "" });
      }
    };
    load();
  }, [cmsPage?.id]);

  // Ensure page_rows and main_page_seo exist for main page
  useEffect(() => {
    if (cmsPage) return;
    if (sections.length > 0) {
      const toAdd: any[] = [];
      if (!sections.find((s) => s.section_key === "page_rows")) {
        toAdd.push({ section_key: "page_rows", content: { rows: DEFAULT_ROWS }, draft_content: { rows: DEFAULT_ROWS } });
      }
      if (!sections.find((s) => s.section_key === "main_page_seo")) {
        toAdd.push({ section_key: "main_page_seo", content: { meta_title: "", meta_description: "" }, draft_content: { meta_title: "", meta_description: "" } });
      }
      if (toAdd.length) setSections((prev) => [...prev, ...toAdd]);
    }
  }, [sections.length, cmsPage]);

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

  // Unified rows: main page or CMS page
  const pageRows: PageRow[] = cmsPage
    ? cmsPageRows
    : (getDraft("page_rows") as any)?.rows || [];

  const selectedRow = pageRows.find((r) => r.id === selectedSectionId) || null;

  // Unified row update
  const updateRows = useCallback((newRows: PageRow[]) => {
    if (cmsPage) {
      setCmsPageRows(newRows);
    } else {
      updateFullDraft("page_rows", { rows: newRows });
    }
  }, [cmsPage]);

  const addRow = useCallback((type: PageRow["type"]) => {
    const newRow: PageRow = {
      id: crypto.randomUUID(),
      type,
      strip_title: ROW_TYPE_OPTIONS.find((o) => o.type === type)?.label || type,
      bg_color: "#FFFFFF",
      content: type === "boxed" ? { title_lines: [], cards: [] }
        : type === "contact" ? { title_lines: [], body: "", button_text: "Submit", fields: [] }
        : type === "service" ? { eyebrow: "", title: "", description: "", services: [] }
        : type === "grid" ? { title_lines: [], items: [] }
        : { title_lines: [], body: "" },
    };
    updateRows([...pageRows, newRow]);
    setSelectedSectionId(newRow.id);
    setPropertiesSubTab("content");
    setShowAddRow(false);
  }, [pageRows, updateRows]);

  const deleteRow = useCallback((rowId: string) => {
    updateRows(pageRows.filter((r) => r.id !== rowId));
    if (selectedSectionId === rowId) setSelectedSectionId(null);
  }, [pageRows, updateRows, selectedSectionId]);

  const toggleCmsPagePublish = useCallback(async () => {
    if (!cmsPage) return;
    const newStatus = cmsPageStatus === "published" ? "draft" : "published";
    const updates: any = { status: newStatus };
    if (newStatus === "published") {
      updates.page_rows = cmsPageRows;
      updates.draft_page_rows = cmsPageRows;
    }
    await supabase.from("cms_pages").update(updates).eq("id", cmsPage.id);
    setCmsPageStatus(newStatus);
    toast.success(newStatus === "published" ? "Published!" : "Unpublished");
  }, [cmsPage, cmsPageStatus, cmsPageRows]);

  const updateCmsPageMeta = useCallback(async (field: string, value: string) => {
    const next = { ...cmsPageMeta, [field]: value };
    setCmsPageMeta(next);
    if (cmsPage) {
      await supabase.from("cms_pages").update({ [field]: value } as any).eq("id", cmsPage.id);
    }
  }, [cmsPage, cmsPageMeta]);

  // ── Save / Publish ──
  const saveDraft = useCallback(async () => {
    setSaving(true);
    if (cmsPage) {
      const { error } = await supabase
        .from("cms_pages")
        .update({ draft_page_rows: cmsPageRows as any } as any)
        .eq("id", cmsPage.id);
      if (error) toast.error(error.message);
      else toast.success("Draft saved");
    } else {
      const promises = sections.map(async (s) => {
        const draft = (s.draft_content || s.content) as any;
        const { data: existing } = await supabase
          .from("site_content").select("id").eq("section_key", s.section_key).maybeSingle();
        if (existing) {
          await supabase.from("site_content").update({ draft_content: draft }).eq("section_key", s.section_key);
        } else {
          await supabase.from("site_content").insert({ section_key: s.section_key, content: draft, draft_content: draft } as any);
        }
      });
      await Promise.all(promises);
      toast.success("Draft saved");
    }
    setSaving(false);
  }, [sections, cmsPage, cmsPageRows]);

  const publishAll = useCallback(async () => {
    setPublishing(true);
    if (cmsPage) {
      const { error } = await supabase
        .from("cms_pages")
        .update({ page_rows: cmsPageRows as any, draft_page_rows: cmsPageRows as any, status: "published" } as any)
        .eq("id", cmsPage.id);
      if (error) toast.error(error.message);
      else {
        setCmsPageStatus("published");
        toast.success("Page published!");
      }
    } else {
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
    }
    setPublishing(false);
  }, [sections, cmsPage, cmsPageRows]);

  const hasChanges = cmsPage
    ? true // CMS pages always allow save
    : sections.some((s) => JSON.stringify(s.draft_content) !== JSON.stringify(s.content));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
  };

  // ── Section selection ──
  const selectSection = (rowId: string) => {
    setSelectedSectionId(rowId);
    setPropertiesSubTab("content");
  };

  // ── DnD sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = pageRows.findIndex((r) => r.id === active.id);
      const newIndex = pageRows.findIndex((r) => r.id === over.id);
      updateRows(arrayMove(pageRows, oldIndex, newIndex));
    }
  };

  // ── Row content update for properties panel ──
  const updateRowContent = (field: string, value: any) => {
    if (!selectedSectionId) return;
    const newRows = pageRows.map((r) =>
      r.id === selectedSectionId ? { ...r, content: { ...r.content, [field]: value } } : r
    );
    updateRows(newRows);
  };

  const updateRowMeta = (updates: Partial<PageRow>) => {
    if (!selectedSectionId) return;
    const newRows = pageRows.map((r) =>
      r.id === selectedSectionId ? { ...r, ...updates } : r
    );
    updateRows(newRows);
  };

  // ── Edit page handler (from PagesManager) ──
  const handleEditPage = (page: CmsPageRef | null) => {
    setCmsPage(page);
    setActiveTab("site");
    setSelectedSectionId(null);
  };

  const isSiteTab = activeTab === "site";
  const isMainPage = !cmsPage;
  const pageLabel = cmsPage ? cmsPage.title : "Main Page";

  const tabLabel = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === activeTab)?.label || "";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "hsl(var(--background))" }}>
      {/* ═══ TOPBAR ═══ */}
      <header
        style={{
          height: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 1rem 0 calc(58px + 1rem)",
          backgroundColor: "hsl(var(--card))", borderBottom: "1px solid hsl(var(--border))",
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, color: "hsl(var(--secondary))", letterSpacing: "0.15em" }}>
          THE MAGIC COFFIN
        </span>
        <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-body)" }}>
          {isSiteTab ? pageLabel : tabLabel}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => window.open(cmsPage ? `/p/${cmsPage.slug}` : "/", "_blank")}
            style={{ fontSize: 10, fontFamily: "var(--font-body)", color: "hsl(var(--muted-foreground))", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em" }}
          >
            Preview live →
          </button>
          {isSiteTab && (
            <>
              {cmsPage && (
                <button
                  onClick={toggleCmsPagePublish}
                  style={{
                    fontSize: 10, fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.1em",
                    padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                    border: `1px solid ${cmsPageStatus === "published" ? "hsl(var(--destructive) / 0.4)" : "hsl(var(--border))"}`,
                    background: "transparent",
                    color: cmsPageStatus === "published" ? "hsl(var(--destructive))" : "hsl(var(--foreground))",
                  }}
                >
                  {cmsPageStatus === "published" ? "Unpublish" : "Set Published"}
                </button>
              )}
              <button
                onClick={saveDraft}
                disabled={saving}
                style={{
                  fontSize: 10, fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.1em",
                  padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                  border: "1px solid hsl(var(--border))", background: "transparent",
                  color: "hsl(var(--foreground))", opacity: saving ? 0.5 : 1,
                }}
              >
                <Save size={11} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button
                onClick={publishAll}
                disabled={publishing}
                style={{
                  fontSize: 10, fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.1em",
                  padding: "6px 14px", borderRadius: 20, cursor: "pointer", border: "none",
                  backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--background))",
                  opacity: publishing ? 0.4 : 1,
                }}
              >
                <Send size={11} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                {publishing ? "Publishing…" : "Publish"}
              </button>
            </>
          )}
          <div
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 700, color: "hsl(var(--background))",
            }}
          >
            R
          </div>
        </div>
      </header>

      {/* ═══ MAIN ROW ═══ */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── SIDEBAR ── */}
        <nav
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
          style={{
            width: sidebarExpanded ? 220 : 58,
            transition: "width 0.3s cubic-bezier(0.16,1,0.3,1)",
            backgroundColor: "hsl(var(--card))",
            borderRight: "1px solid hsl(var(--border))",
            flexShrink: 0, overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingTop: 8 }}>
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <div
                  style={{
                    fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase" as const,
                    color: "hsl(var(--muted-foreground) / 0.5)", padding: "0.75rem 1.1rem 0.35rem",
                    opacity: sidebarExpanded ? 1 : 0, transition: "opacity 0.2s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const active = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setActiveTab(item.key); setSelectedSectionId(null); if (item.key !== "site") setCmsPage(null); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "8px 16px", border: "none", cursor: "pointer",
                        textAlign: "left" as const, background: active ? "hsl(var(--secondary) / 0.07)" : "transparent",
                        borderLeft: active ? "2px solid hsl(var(--secondary))" : "2px solid transparent",
                        color: active ? "hsl(var(--secondary))" : "hsl(var(--muted-foreground))",
                        transition: "background 0.15s",
                      }}
                      onMouseOver={(e) => { if (!active) (e.currentTarget.style.background = "hsl(var(--foreground) / 0.04)"); }}
                      onMouseOut={(e) => { if (!active) (e.currentTarget.style.background = "transparent"); }}
                    >
                      <item.icon size={16} style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontFamily: "var(--font-body)", fontSize: 11, whiteSpace: "nowrap",
                          opacity: sidebarExpanded ? 1 : 0, transition: "opacity 0.2s",
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {/* Sign out */}
          <div style={{ borderTop: "1px solid hsl(var(--border))", padding: 4 }}>
            <button
              onClick={handleLogout}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "8px 16px", border: "none", cursor: "pointer", textAlign: "left" as const,
                background: "transparent", color: "hsl(var(--muted-foreground))",
              }}
            >
              <LogOut size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 11, whiteSpace: "nowrap", opacity: sidebarExpanded ? 1 : 0, transition: "opacity 0.2s" }}>
                Sign out
              </span>
            </button>
          </div>
        </nav>

        {/* ── PAGE STRUCTURE PANEL ── */}
        <div
          style={{
            width: isSiteTab ? 240 : 0,
            transition: "width 0.3s cubic-bezier(0.16,1,0.3,1)",
            backgroundColor: "hsl(var(--card))",
            borderRight: isSiteTab ? "1px solid hsl(var(--border))" : "none",
            flexShrink: 0, overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{
            height: 44, display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 1rem", borderBottom: "1px solid hsl(var(--border))", flexShrink: 0,
          }}>
            {cmsPage ? (
              <button
                onClick={() => setCmsPage(null)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-body)", fontSize: 10 }}
              >
                <ArrowLeft size={12} /> Back to Main Page
              </button>
            ) : (
              <span style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, color: "hsl(var(--foreground))", whiteSpace: "nowrap" }}>
                Page Structure
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem", scrollbarWidth: "thin" as const }}>
            {/* Hero section block (main page only) */}
            {isMainPage && (
              <div
                onClick={() => { setSelectedSectionId("__hero__"); setPropertiesSubTab("content"); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all mb-1"
                style={{
                  background: selectedSectionId === "__hero__" ? "hsl(var(--secondary) / 0.07)" : "transparent",
                }}
              >
                <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: selectedSectionId === "__hero__" ? "hsl(var(--secondary))" : "transparent" }} />
                <span className="text-sm flex-shrink-0">🎭</span>
                <div className="min-w-0 flex-1">
                  <div className="font-body text-[11px] font-medium truncate" style={{ color: selectedSectionId === "__hero__" ? "hsl(var(--secondary))" : "hsl(var(--foreground))" }}>
                    Hero
                  </div>
                  <div className="font-body text-[9px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>hero</div>
                </div>
              </div>
            )}

            {/* Page rows - draggable */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pageRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                {pageRows.map((row) => (
                  <SortableSectionBlock
                    key={row.id}
                    row={row}
                    isSelected={selectedSectionId === row.id}
                    onClick={() => selectSection(row.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Add row button */}
            <div className="relative mt-2 px-3">
              <button
                onClick={() => setShowAddRow(!showAddRow)}
                className="flex items-center gap-1.5 w-full justify-center py-2 rounded-lg border border-dashed transition-all hover:opacity-70"
                style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "var(--font-body)" }}
              >
                <Plus size={12} /> Add Row
              </button>
              {showAddRow && (
                <div
                  className="absolute left-3 right-3 mt-1 rounded-lg border shadow-lg overflow-hidden z-10"
                  style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                >
                  {ROW_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => addRow(opt.type)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left transition-all"
                      style={{ fontSize: 11, fontFamily: "var(--font-body)", color: "hsl(var(--foreground))", background: "transparent", border: "none", cursor: "pointer" }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "hsl(var(--secondary) / 0.07)")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {pageRows.length === 0 && (
              <div className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "var(--font-body)" }}>
                No rows yet. Click '+ Add Row' above.
              </div>
            )}

            {/* SEO block */}
            <div
              onClick={() => { setSelectedSectionId("__seo__"); setPropertiesSubTab("seo"); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all mt-1"
              style={{
                background: selectedSectionId === "__seo__" ? "hsl(var(--secondary) / 0.07)" : "transparent",
              }}
            >
              <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: selectedSectionId === "__seo__" ? "hsl(var(--secondary))" : "transparent" }} />
              <span className="text-sm flex-shrink-0">🔍</span>
              <div className="min-w-0 flex-1">
                <div className="font-body text-[11px] font-medium truncate" style={{ color: selectedSectionId === "__seo__" ? "hsl(var(--secondary))" : "hsl(var(--foreground))" }}>
                  SEO & Metadata
                </div>
                <div className="font-body text-[9px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>meta</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {isSiteTab ? (
            <div style={{ flex: 1, backgroundColor: "hsl(var(--card))", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {!selectedSectionId ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-body)" }}>
                    Select a section to edit
                  </span>
                </div>
              ) : (
                <>
                  {/* Properties Header */}
                  <div style={{
                    height: 44, display: "flex", alignItems: "center", gap: 8,
                    padding: "0 1rem", borderBottom: "1px solid hsl(var(--border))", flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, color: "hsl(var(--foreground))", whiteSpace: "nowrap" }}>
                      {selectedSectionId === "__hero__"
                        ? "Hero"
                        : selectedSectionId === "__seo__"
                        ? "SEO & Metadata"
                        : selectedRow?.strip_title || "Section"}
                    </span>
                    {selectedSectionId !== "__seo__" && (
                      <span style={{
                        fontSize: 8, textTransform: "uppercase" as const, letterSpacing: "0.1em",
                        background: "hsl(var(--secondary) / 0.1)", color: "hsl(var(--secondary))",
                        padding: "2px 7px", borderRadius: 4,
                      }}>
                        {selectedSectionId === "__hero__" ? "hero" : selectedRow?.type}
                      </span>
                    )}
                  </div>

                  {/* Sub-tabs */}
                  {selectedSectionId !== "__seo__" && (
                    <div style={{ display: "flex", borderBottom: "1px solid hsl(var(--border))", flexShrink: 0 }}>
                      {(["content", "style", "seo"] as PropertiesSubTab[]).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setPropertiesSubTab(tab)}
                          style={{
                            flex: 1, padding: "0.5rem", fontSize: 9, letterSpacing: "0.1em",
                            textTransform: "uppercase" as const, border: "none", cursor: "pointer",
                            background: "transparent",
                            color: propertiesSubTab === tab ? "hsl(var(--secondary))" : "hsl(var(--muted-foreground))",
                            borderBottom: propertiesSubTab === tab ? "2px solid hsl(var(--secondary))" : "2px solid transparent",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Scrollable body */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "1rem", scrollbarWidth: "thin" as const }}>
                    {selectedSectionId === "__seo__" ? (
                      cmsPage ? (
                        <SeoFields
                          metaTitle={cmsPageMeta.meta_title}
                          metaDescription={cmsPageMeta.meta_description}
                          onTitleChange={(v) => updateCmsPageMeta("meta_title", v)}
                          onDescriptionChange={(v) => updateCmsPageMeta("meta_description", v)}
                        />
                      ) : (
                        <SeoFields
                          metaTitle={(getDraft("main_page_seo") as any)?.meta_title || ""}
                          metaDescription={(getDraft("main_page_seo") as any)?.meta_description || ""}
                          onTitleChange={(v) => updateField("main_page_seo", "meta_title", v)}
                          onDescriptionChange={(v) => updateField("main_page_seo", "meta_description", v)}
                        />
                      )
                    ) : selectedSectionId === "__hero__" ? (
                      propertiesSubTab === "content" ? (
                        <HeroEditor content={getDraft("hero")} onChange={(f, v) => updateField("hero", f, v)} />
                      ) : propertiesSubTab === "style" ? (
                        <StyleTab />
                      ) : (
                        <SeoFields
                          metaTitle={(getDraft("main_page_seo") as any)?.meta_title || ""}
                          metaDescription={(getDraft("main_page_seo") as any)?.meta_description || ""}
                          onTitleChange={(v) => updateField("main_page_seo", "meta_title", v)}
                          onDescriptionChange={(v) => updateField("main_page_seo", "meta_description", v)}
                        />
                      )
                    ) : selectedRow ? (
                      propertiesSubTab === "content" ? (
                        <RowContentEditor row={selectedRow} onContentChange={updateRowContent} onRowMetaChange={updateRowMeta} onDelete={() => deleteRow(selectedRow.id)} />
                      ) : propertiesSubTab === "style" ? (
                        <StyleTab />
                      ) : (
                        cmsPage ? (
                          <SeoFields
                            metaTitle={cmsPageMeta.meta_title}
                            metaDescription={cmsPageMeta.meta_description}
                            onTitleChange={(v) => updateCmsPageMeta("meta_title", v)}
                            onDescriptionChange={(v) => updateCmsPageMeta("meta_description", v)}
                          />
                        ) : (
                          <SeoFields
                            metaTitle={(getDraft("main_page_seo") as any)?.meta_title || ""}
                            metaDescription={(getDraft("main_page_seo") as any)?.meta_description || ""}
                            onTitleChange={(v) => updateField("main_page_seo", "meta_title", v)}
                            onDescriptionChange={(v) => updateField("main_page_seo", "meta_description", v)}
                          />
                        )
                      )
                    ) : null}
                  </div>

                  {/* Footer */}
                  <div style={{
                    height: 52, display: "flex", alignItems: "center", gap: 8,
                    padding: "0 1rem", borderTop: "1px solid hsl(var(--border))", flexShrink: 0,
                  }}>
                    <button
                      onClick={saveDraft}
                      disabled={saving}
                      style={{
                        flex: 1, fontSize: 10, fontFamily: "var(--font-body)", textTransform: "uppercase" as const,
                        letterSpacing: "0.1em", padding: "8px 0", borderRadius: 20, cursor: "pointer",
                        border: "1px solid hsl(var(--border))", background: "transparent",
                        color: "hsl(var(--foreground))", opacity: saving ? 0.5 : 1,
                      }}
                    >
                      Save draft
                    </button>
                    <button
                      onClick={publishAll}
                      disabled={publishing}
                      style={{
                        flex: 1, fontSize: 10, fontFamily: "var(--font-body)", textTransform: "uppercase" as const,
                        letterSpacing: "0.1em", padding: "8px 0", borderRadius: 20, cursor: "pointer",
                        border: "none", backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--background))",
                        opacity: publishing ? 0.4 : 1,
                      }}
                    >
                      Publish
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <main style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
              <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                {activeTab === "pages" && <PagesManager onEditPage={handleEditPage} />}
                {activeTab === "navigation" && <NavigationManager />}
                {activeTab === "blog" && <BlogEditor />}
                {activeTab === "contacts" && <ContactsList />}
                {activeTab === "emails" && <EmailCampaigns />}
                {activeTab === "media" && <MediaGallery />}
                {activeTab === "brand" && <BrandSettings />}
                {activeTab === "settings" && <GlobalSettings />}
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Style Tab ── */
const StyleTab = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div>
      <label style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "hsl(var(--muted-foreground))", display: "block", marginBottom: 6 }}>
        Glass card intensity
      </label>
      <input type="range" min={0} max={100} defaultValue={50} style={{ width: "100%", accentColor: "hsl(var(--secondary))" }} />
    </div>
    <div>
      <label style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "hsl(var(--muted-foreground))", display: "block", marginBottom: 6 }}>
        Gradient text
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" defaultChecked={false} style={{ accentColor: "hsl(var(--secondary))" }} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "hsl(var(--foreground))" }}>Enable gradient text</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, marginTop: 8, background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }} />
    </div>
  </div>
);

/* ── Title Lines Editor (for properties panel) ── */
const TitleLinesEditor = ({ titleLines, onChange }: { titleLines: string[]; onChange: (lines: string[]) => void }) => {
  const updateLine = (idx: number, html: string) => {
    const next = [...titleLines];
    next[idx] = html;
    onChange(next);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Title Lines</label>
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

/* ── Row Content Editor ── */
const RowContentEditor = ({
  row, onContentChange, onRowMetaChange, onDelete,
}: {
  row: PageRow;
  onContentChange: (field: string, value: any) => void;
  onRowMetaChange: (updates: Partial<PageRow>) => void;
  onDelete?: () => void;
}) => {
  const content = row.content;

  const commonMeta = (
    <div className="space-y-2 mb-4">
      <Field label="Strip Title" value={row.strip_title} onChange={(v) => onRowMetaChange({ strip_title: v })} />
      <div>
        <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>Background Color</label>
        <div className="flex gap-1.5">
          <input type="color" value={row.bg_color || "#FFFFFF"} onChange={(e) => onRowMetaChange({ bg_color: e.target.value })} className="w-10 h-9 rounded border cursor-pointer" style={{ borderColor: "hsl(var(--border))" }} />
          <input value={row.bg_color || ""} onChange={(e) => onRowMetaChange({ bg_color: e.target.value })} placeholder="#FFFFFF" className="flex-1 px-3 py-2 rounded-lg font-body text-sm border" style={{ borderColor: "hsl(var(--border))", backgroundColor: "#FFFFFF", color: "#1a1a1a" }} />
        </div>
      </div>
      <RowLayoutSettings layout={row.layout || DEFAULT_ROW_LAYOUT} onChange={(layout) => onRowMetaChange({ layout })} />
      {onDelete && (
        <button type="button" onClick={onDelete} className="flex items-center gap-1.5 font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 transition-opacity" style={{ color: "hsl(var(--destructive))", border: "1px solid hsl(var(--destructive) / 0.3)" }}>
          <Trash2 size={11} /> Delete Row
        </button>
      )}
    </div>
  );

  const titleLines = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );

  const noteAndButton = (
    <SectionBox label="Note & Button">
      <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onContentChange("eyebrow", v)} />
      <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onContentChange("note", v)} />
      <Field label="Button Label" value={content.cta_label || ""} onChange={(v) => onContentChange("cta_label", v)} />
      <Field label="Button URL" value={content.cta_url || ""} onChange={(v) => onContentChange("cta_url", v)} />
    </SectionBox>
  );

  switch (row.type) {
    case "hero":
      return <>{commonMeta}<HeroRowFieldsInline content={content} onChange={onContentChange} /></>;
    case "text":
      return (
        <>{commonMeta}
          <div className="space-y-3">
            <TitleLinesEditor titleLines={titleLines} onChange={(v) => onContentChange("title_lines", v)} />
            <SubtitleEditor subtitle={content.subtitle || ""} subtitleColor={content.subtitle_color || ""} onSubtitleChange={(v) => onContentChange("subtitle", v)} onColorChange={(v) => onContentChange("subtitle_color", v)} />
            <RichField label="Body" value={content.body || ""} onChange={(v) => onContentChange("body", v)} />
            {noteAndButton}
          </div>
        </>
      );
    case "service":
      return (
        <>{commonMeta}
          <PillarEditor pillarContent={content} servicesContent={{ services: content.services || [] }} onPillarChange={onContentChange} onServicesChange={(svcs) => onContentChange("services", svcs)} />
        </>
      );
    case "boxed":
      return (
        <>{commonMeta}
          <div className="space-y-3">
            <TitleLinesEditor titleLines={titleLines} onChange={(v) => onContentChange("title_lines", v)} />
            <SubtitleEditor subtitle={content.subtitle || ""} subtitleColor={content.subtitle_color || ""} onSubtitleChange={(v) => onContentChange("subtitle", v)} onColorChange={(v) => onContentChange("subtitle_color", v)} />
            <ColorField label="Card Title Color" value={content.color_card_title || ""} fallback="" onChange={(v) => onContentChange("color_card_title", v)} />
            <ColorField label="Card Body Color" value={content.color_card_body || ""} fallback="" onChange={(v) => onContentChange("color_card_body", v)} />
            <BoxedArrayField content={content} onChange={onContentChange} />
            {noteAndButton}
          </div>
        </>
      );
    case "contact":
      return (
        <>{commonMeta}
          <div className="space-y-3">
            <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onContentChange("eyebrow", v)} />
            <TitleLinesEditor titleLines={titleLines} onChange={(v) => onContentChange("title_lines", v)} />
            <SubtitleEditor subtitle={content.subtitle || ""} subtitleColor={content.subtitle_color || ""} onSubtitleChange={(v) => onContentChange("subtitle", v)} onColorChange={(v) => onContentChange("subtitle_color", v)} />
            <RichField label="Body" value={content.body || ""} onChange={(v) => onContentChange("body", v)} />
            <Field label="Button Text" value={content.button_text || ""} onChange={(v) => onContentChange("button_text", v)} />
            <SectionBox label="Colors">
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Eyebrow" value={content.color_eyebrow || ""} fallback="#7B3A91" onChange={(v) => onContentChange("color_eyebrow", v)} />
              </div>
            </SectionBox>
            <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onContentChange("note", v)} />
          </div>
        </>
      );
    case "image_text":
      return <>{commonMeta}<ImageTextEditor content={content} onChange={onContentChange} /></>;
    case "profile":
      return <>{commonMeta}<ProfileEditor content={content} onChange={onContentChange} /></>;
    case "grid":
      return <>{commonMeta}<GridEditor content={content} onChange={onContentChange} /></>;
    default:
      return commonMeta;
  }
};

const HeroRowFieldsInline = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  const BG_TYPES = [{ label: "None", value: "none" }, { label: "Image", value: "image" }, { label: "Video", value: "video" }];
  return (
    <div className="space-y-3">
      <Field label="Eyebrow" value={content.label || ""} onChange={(v) => onChange("label", v)} />
      <ColorField label="Eyebrow Color" value={content.color_label || ""} fallback="" onChange={(v) => onChange("color_label", v)} />
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <Field label="Tagline" value={content.tagline || ""} onChange={(v) => onChange("tagline", v)} />
      <ColorField label="Tagline Color" value={content.color_tagline || ""} fallback="" onChange={(v) => onChange("color_tagline", v)} />
      <SubtitleEditor subtitle={content.subtitle || ""} subtitleColor={content.subtitle_color || ""} onSubtitleChange={(v) => onChange("subtitle", v)} onColorChange={(v) => onChange("subtitle_color", v)} />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
      <SectionBox label="Background">
        <SelectField label="Type" value={content.bg_type || "none"} options={BG_TYPES} onChange={(v) => onChange("bg_type", v)} />
        {content.bg_type === "image" && <ImagePickerField label="Background Image" value={content.bg_url || ""} onChange={(v) => onChange("bg_url", v)} />}
        {content.bg_type === "video" && <Field label="Video URL" value={content.bg_url || ""} onChange={(v) => onChange("bg_url", v)} />}
      </SectionBox>
    </div>
  );
};

/* ── Boxed cards array helper ── */
const BoxedArrayField = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const cards: { title: string; body: string }[] = content.cards || [];
  const updateCard = (idx: number, field: string, value: string) => {
    const next = [...cards];
    next[idx] = { ...next[idx], [field]: value };
    onChange("cards", next);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Cards (max 6)</label>
        <button type="button" onClick={() => onChange("cards", [...cards, { title: "", body: "" }])} disabled={cards.length >= 6} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 disabled:opacity-30" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
          <Plus size={10} /> Add Card
        </button>
      </div>
      <div className="space-y-2">
        {cards.map((card, i) => (
          <SectionBox key={i} label={`Card ${i + 1}`}>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1"><Field label="Title" value={card.title} onChange={(v) => updateCard(i, "title", v)} /></div>
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
  );
};

export default AdminDashboard;
