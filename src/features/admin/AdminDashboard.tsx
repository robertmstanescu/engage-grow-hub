import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { runDbAction } from "@/services/db-helpers";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import {
  LayoutDashboard, FileText, Compass, BookOpen,
  Users, Mail, Image, Palette, Settings, LogOut,
  Save, Send, Tag, UserCog,
  GripVertical, Plus, Trash2, ArrowLeft, Columns, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import ManageTeam from "./ManageTeam";
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
import RowAlignmentSettings from "./site-editor/RowAlignmentSettings";
import ColumnWidthControl from "./site-editor/ColumnWidthControl";
import PillarEditor from "./site-editor/PillarEditor";
import ImageTextEditor from "./site-editor/ImageTextEditor";
import ProfileEditor from "./site-editor/ProfileEditor";
import GridEditor from "./site-editor/GridEditor";
import ImagePickerField from "./ImagePickerField";
import GradientEditor from "./site-editor/GradientEditor";
import OverlayEditor from "./site-editor/OverlayEditor";
import { useListFilters } from "@/hooks/useListFilters";
import ListFilters from "@/components/ui/list-filters";


type Tab = "site" | "pages" | "navigation" | "blog" | "contacts" | "emails" | "media" | "brand" | "tags" | "settings" | "team";

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
      { key: "tags" as Tab, icon: Tag, label: "Tags" },
      { key: "team" as Tab, icon: UserCog, label: "Manage Team" },
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
  const [activeCol, setActiveCol] = useState(0);

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

  const addColumnToRow = useCallback((rowId: string) => {
    const row = pageRows.find((r) => r.id === rowId);
    if (!row) return;
    const defaultContent = ROW_TYPE_OPTIONS.find((o) => o.type === row.type)
      ? { title_lines: [], body: "" }
      : { title_lines: [], body: "" };
    const existingExtra = row.columns_data || [];
    const newColumnsData = [...existingExtra, defaultContent];
    const colCount = 1 + newColumnsData.length;
    const equalWidth = Math.round(100 / colCount);
    const widths = Array(colCount).fill(equalWidth);
    widths[widths.length - 1] = 100 - equalWidth * (colCount - 1);
    updateRows(pageRows.map((r) =>
      r.id === rowId
        ? { ...r, columns_data: newColumnsData, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
        : r
    ));
  }, [pageRows, updateRows]);

  const removeColumnFromRow = useCallback((rowId: string, colIndex: number) => {
    const row = pageRows.find((r) => r.id === rowId);
    if (!row) return;
    if (colIndex === 0 && row.columns_data && row.columns_data.length > 0) {
      const [promoted, ...rest] = row.columns_data;
      const colCount = 1 + rest.length;
      const widths = colCount > 1 ? Array(colCount).fill(Math.round(100 / colCount)) : undefined;
      updateRows(pageRows.map((r) =>
        r.id === rowId
          ? { ...r, content: promoted, columns_data: rest.length > 0 ? rest : undefined, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
          : r
      ));
    } else if (colIndex > 0 && row.columns_data) {
      const newExtra = row.columns_data.filter((_, i) => i !== colIndex - 1);
      const colCount = 1 + newExtra.length;
      const widths = colCount > 1 ? Array(colCount).fill(Math.round(100 / colCount)) : undefined;
      updateRows(pageRows.map((r) =>
        r.id === rowId
          ? { ...r, columns_data: newExtra.length > 0 ? newExtra : undefined, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
          : r
      ));
    }
    setActiveCol(0);
  }, [pageRows, updateRows]);

  const updateColumnWidths = useCallback((rowId: string, widths: number[]) => {
    updateRows(pageRows.map((r) =>
      r.id === rowId
        ? { ...r, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
        : r
    ));
  }, [pageRows, updateRows]);


  const toggleCmsPagePublish = useCallback(async () => {
    if (!cmsPage) return;
    const newStatus = cmsPageStatus === "published" ? "draft" : "published";
    const updates: any = { status: newStatus };
    if (newStatus === "published") {
      updates.page_rows = cmsPageRows;
      updates.draft_page_rows = cmsPageRows;
    }
    // runDbAction normalizes the toast / error path. We update local state
    // only on success so the UI never lies about the page's published flag.
    const result = await runDbAction({
      action: () => supabase.from("cms_pages").update(updates).eq("id", cmsPage.id),
      successMessage: newStatus === "published" ? "Published!" : "Unpublished",
    });
    if (result !== null) setCmsPageStatus(newStatus);
  }, [cmsPage, cmsPageStatus, cmsPageRows]);

  const updateCmsPageMeta = useCallback(async (field: string, value: string) => {
    const next = { ...cmsPageMeta, [field]: value };
    setCmsPageMeta(next);
    if (cmsPage) {
      // Silent save — meta fields persist on every keystroke pause, so a
      // toast for each one would spam the user. Errors are still surfaced.
      await runDbAction({
        action: () => supabase.from("cms_pages").update({ [field]: value } as any).eq("id", cmsPage.id),
        successMessage: null,
      });
    }
  }, [cmsPage, cmsPageMeta]);

  // ── Save / Publish ──
  const saveDraft = useCallback(async () => {
    if (cmsPage) {
      await runDbAction({
        action: () => supabase
          .from("cms_pages")
          .update({ draft_page_rows: cmsPageRows as any } as any)
          .eq("id", cmsPage.id),
        setLoading: setSaving,
        successMessage: "Draft saved",
      });
      return;
    }

    // Multi-section save — we have to upsert each row of site_content
    // independently because they may or may not already exist. We still
    // wrap the whole batch in runDbAction so a failure ANYWHERE aborts
    // with one toast (not N toasts) and saving=false runs in `finally`.
    await runDbAction({
      action: async () => {
        const promises = sections.map(async (s) => {
          const draft = (s.draft_content || s.content) as any;
          const { data: existing } = await supabase
            .from("site_content").select("id").eq("section_key", s.section_key).maybeSingle();
          if (existing) {
            return supabase.from("site_content").update({ draft_content: draft }).eq("section_key", s.section_key);
          }
          return supabase.from("site_content").insert({ section_key: s.section_key, content: draft, draft_content: draft } as any);
        });
        const results = await Promise.all(promises);
        // Surface the first error so runDbAction can toast it.
        const failed = results.find((r) => r.error);
        return failed ?? { data: null, error: null };
      },
      setLoading: setSaving,
      successMessage: "Draft saved",
    });
  }, [sections, cmsPage, cmsPageRows]);

  const publishAll = useCallback(async () => {
    if (cmsPage) {
      const result = await runDbAction({
        action: () => supabase
          .from("cms_pages")
          .update({ page_rows: cmsPageRows as any, draft_page_rows: cmsPageRows as any, status: "published" } as any)
          .eq("id", cmsPage.id),
        setLoading: setPublishing,
        successMessage: "Page published!",
      });
      if (result !== null) setCmsPageStatus("published");
      return;
    }

    // Same multi-section pattern as saveDraft, but writing to BOTH `content`
    // (live) and `draft_content` so the published version reflects what the
    // admin sees in the editor.
    const result = await runDbAction({
      action: async () => {
        const updates = sections.map((s) => {
          const data = (s.draft_content || s.content) as any;
          return supabase
            .from("site_content")
            .upsert({ section_key: s.section_key, content: data, draft_content: data } as any, { onConflict: "section_key" });
        });
        const results = await Promise.all(updates);
        const failed = results.find((r) => r.error);
        return failed ?? { data: null, error: null };
      },
      setLoading: setPublishing,
      successMessage: "All changes published!",
    });

    if (result !== null) {
      // Promote drafts to live in local state so `hasChanges` flips back to false.
      setSections((prev) => prev.map((s) => ({ ...s, content: s.draft_content || s.content })));
      sections.forEach((s) => invalidateSiteContent(s.section_key));
    }
  }, [sections, cmsPage, cmsPageRows]);

  const hasChanges = cmsPage
    ? true // CMS pages always allow save
    : sections.some((s) => JSON.stringify(s.draft_content) !== JSON.stringify(s.content));

  const handleLogout = async () => {
    // Sign-out is best-effort: runDbAction shows an error toast if the
    // request fails, but the auth listener will still tear down the
    // session locally so the user does end up signed out.
    await runDbAction({
      action: () => supabase.auth.signOut(),
      successMessage: "Logged out",
    });
  };

  // ── Section selection ──
  const selectSection = (rowId: string) => {
    setSelectedSectionId(rowId);
    setPropertiesSubTab("content");
    setActiveCol(0);
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

  // ── Filters: search + type + sort over the row rail ──
  // See `useListFilters` for the client-side / debounce / URL-persist rationale.
  // Param prefix `r` keeps row params (?rq, ?rtype, ?rsort) from colliding with
  // any future filter on a different admin tab living in the same SPA.
  const rowFilters = useListFilters<PageRow>({
    items: pageRows,
    paramPrefix: "r",
    defaultSort: "manual",
    searchableText: (r) =>
      `${r.strip_title || ""} ${r.type || ""}`.toLowerCase(),
    categoryOf: (r) => r.type,
    alphaKey: (r) => (r.strip_title || r.type).toLowerCase(),
  });
  const filteredPageRows = rowFilters.filteredItems;
  const friendlyRowType = (raw: string) =>
    ROW_TYPE_OPTIONS.find((o) => o.type === raw)?.label || raw;

  // Drag-to-reorder ONLY makes sense against the unfiltered list — reordering
  // a search-filtered subset would silently scramble the underlying page.
  // We disable the drag handles whenever the user is filtering.
  const isRowListFiltered = rowFilters.state.isFiltering;

  // ── Row content update for properties panel ──
  const updateRowContent = (field: string, value: any) => {
    if (!selectedSectionId) return;
    const newRows = pageRows.map((r) =>
      r.id === selectedSectionId ? { ...r, content: { ...r.content, [field]: value } } : r
    );
    updateRows(newRows);
  };

  const updateColContent = useCallback((field: string, value: any) => {
    if (!selectedSectionId || !selectedRow) return;
    if (activeCol === 0) {
      updateRowContent(field, value);
    } else {
      const colDataIdx = activeCol - 1;
      updateRows(pageRows.map((r) => {
        if (r.id !== selectedSectionId || !r.columns_data) return r;
        const next = [...r.columns_data];
        next[colDataIdx] = { ...next[colDataIdx], [field]: value };
        return { ...r, columns_data: next };
      }));
    }
  }, [selectedSectionId, selectedRow, activeCol, pageRows, updateRows, updateRowContent]);

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
          {/* Profile shortcut → /admin/profile (display name, avatar, email change). */}
          <Link
            to="/admin/profile"
            title="Profile settings"
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 700, color: "hsl(var(--background))",
              textDecoration: "none",
            }}
          >
            R
          </Link>
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
            {/* Search / filter / sort bar — only renders when the row rail
                contains anything worth filtering. Below 2 rows it's just
                visual noise. */}
            {pageRows.length > 1 && (
              <div className="mb-2">
                <ListFilters
                  state={rowFilters.state}
                  searchPlaceholder="Search rows…"
                  formatCategoryLabel={friendlyRowType}
                />
                {isRowListFiltered && (
                  <p className="font-body text-[9px] uppercase tracking-wider mt-1 px-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {filteredPageRows.length} of {pageRows.length} · drag disabled while filtering
                  </p>
                )}
              </div>
            )}

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

            {/* Page rows. DnD is suppressed while filtering — see comment
                near the rowFilters declaration for why. */}
            {isRowListFiltered ? (
              <div>
                {filteredPageRows.map((row) => (
                  <SortableSectionBlock
                    key={row.id}
                    row={row}
                    isSelected={selectedSectionId === row.id}
                    onClick={() => selectSection(row.id)}
                  />
                ))}
                {filteredPageRows.length === 0 && (
                  <div className="text-center py-6 px-2" style={{ color: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "var(--font-body)" }}>
                    No rows match your filters.
                  </div>
                )}
              </div>
            ) : (
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
            )}

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
                  {(() => {
                    const isRow = selectedSectionId !== "__hero__" && selectedSectionId !== "__seo__" && !!selectedRow;
                    const rowColCount = isRow ? 1 + (selectedRow!.columns_data?.length || 0) : 0;
                    return (
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
                        <div style={{ flex: 1 }} />
                        {isRow && rowColCount < 4 && (
                          <button
                            onClick={() => addColumnToRow(selectedRow!.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 4,
                              fontSize: 9, fontFamily: "var(--font-body)", textTransform: "uppercase" as const,
                              letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 14, cursor: "pointer",
                              border: "1px solid hsl(var(--primary) / 0.3)", background: "transparent",
                              color: "hsl(var(--primary))",
                            }}
                          >
                            <Plus size={10} /> Column
                          </button>
                        )}
                        {isRow && (
                          <button
                            onClick={() => deleteRow(selectedRow!.id)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 28, height: 28, borderRadius: 6, cursor: "pointer",
                              border: "1px solid hsl(var(--destructive) / 0.3)", background: "transparent",
                              color: "hsl(var(--destructive))",
                            }}
                            title="Delete Row"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Sub-tabs + Column tabs */}
                  {selectedSectionId !== "__seo__" && (() => {
                    const isRow = selectedSectionId !== "__hero__" && !!selectedRow;
                    const rowColCount = isRow ? 1 + (selectedRow!.columns_data?.length || 0) : 0;
                    const safeActiveCol = Math.min(activeCol, Math.max(rowColCount - 1, 0));
                    return (
                      <div style={{ borderBottom: "1px solid hsl(var(--border))", flexShrink: 0 }}>
                        <div style={{ display: "flex" }}>
                          {(["content", "style"] as PropertiesSubTab[]).map((tab) => (
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
                        {isRow && rowColCount > 1 && propertiesSubTab === "content" && (
                          <div style={{ display: "flex", gap: 2, padding: "6px 12px", borderTop: "1px solid hsl(var(--border) / 0.3)" }}>
                            {Array.from({ length: rowColCount }).map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setActiveCol(i)}
                                style={{
                                  display: "flex", alignItems: "center", gap: 4,
                                  fontSize: 9, fontFamily: "var(--font-body)", letterSpacing: "0.05em",
                                  padding: "3px 10px", borderRadius: 12, cursor: "pointer",
                                  border: `1px solid ${safeActiveCol === i ? "hsl(var(--secondary))" : "hsl(var(--border))"}`,
                                  background: safeActiveCol === i ? "hsl(var(--secondary) / 0.1)" : "transparent",
                                  color: safeActiveCol === i ? "hsl(var(--secondary))" : "hsl(var(--muted-foreground))",
                                }}
                              >
                                Col {i + 1}
                                {rowColCount > 1 && (
                                  <span
                                    onClick={(e) => { e.stopPropagation(); removeColumnFromRow(selectedRow!.id, i); }}
                                    style={{ cursor: "pointer", marginLeft: 2, opacity: 0.6 }}
                                    title={`Remove Column ${i + 1}`}
                                  >
                                    <X size={9} />
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

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
                      ) : null
                    ) : selectedRow ? (
                      propertiesSubTab === "content" ? (
                        (() => {
                          const rowColCount = 1 + (selectedRow.columns_data?.length || 0);
                          const safeCol = Math.min(activeCol, rowColCount - 1);
                          const colContent = safeCol === 0 ? selectedRow.content : (selectedRow.columns_data?.[safeCol - 1] || {});
                          return (
                            <RowContentEditor
                              row={{ ...selectedRow, content: colContent }}
                              onContentChange={updateColContent}
                              onRowMetaChange={updateRowMeta}
                            />
                          );
                        })()
                      ) : propertiesSubTab === "style" ? (
                        <RowStyleTab
                          row={selectedRow}
                          onRowMetaChange={updateRowMeta}
                          onUpdateColumnWidths={(w) => updateColumnWidths(selectedRow.id, w)}
                        />
                      ) : null
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
                {activeTab === "tags" && <TagsManager />}
                {activeTab === "team" && <ManageTeam />}
                {activeTab === "settings" && <GlobalSettings />}
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Style Tab (generic, for hero) ── */
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

/* ── Row Style Tab (with alignment + column widths) ── */
const RowStyleTab = ({
  row, onRowMetaChange, onUpdateColumnWidths,
}: {
  row: PageRow;
  onRowMetaChange: (updates: Partial<PageRow>) => void;
  onUpdateColumnWidths: (widths: number[]) => void;
}) => {
  const colCount = 1 + (row.columns_data?.length || 0);
  const hasInherentSplit = row.type === "image_text" || row.type === "profile";
  const showWidthControl = colCount > 1 || hasInherentSplit;
  const widthColCount = hasInherentSplit && colCount === 1 ? 2 : colCount;
  const columnWidths = row.layout?.column_widths || Array(widthColCount).fill(Math.round(100 / widthColCount));

  const currentGradient = row.layout?.gradient;
  // Pre-populate the gradient editor with the row-type's actual decorative defaults
  // so what the editor shows == what's currently rendering on the page.
  const ROW_DEFAULTS: Record<string, { start: string; end: string }> = {
    hero: { start: "hsl(280 55% 20% / 0.8)", end: "hsl(286 42% 25% / 0.5)" },
    text: { start: "hsl(280 55% 18% / 0.5)", end: "hsl(286 42% 20% / 0.3)" },
    service: { start: "hsl(286 42% 30%)", end: "hsl(280 55% 25%)" },
    boxed: { start: "hsl(280 55% 18% / 0.6)", end: "hsl(286 42% 20% / 0.4)" },
    contact: { start: "hsl(280 55% 24% / 0.3)", end: "transparent" },
    image_text: { start: "hsl(280 55% 20% / 0.5)", end: "hsl(286 42% 25% / 0.3)" },
    profile: { start: "hsl(280 55% 20% / 0.5)", end: "hsl(286 42% 25% / 0.3)" },
    grid: { start: "hsl(280 55% 20% / 0.5)", end: "hsl(286 42% 25% / 0.3)" },
  };
  const rowDefaults = ROW_DEFAULTS[row.type] || { start: "#4D1B5E", end: "#5A2370" };
  const legacyStart = row.layout?.gradientStart || rowDefaults.start;
  const legacyEnd = row.layout?.gradientEnd || rowDefaults.end;
  const currentOverlays = row.layout?.overlays || [];

  const bgColorOpacity = row.layout?.bgColorOpacity ?? 100;
  const bgImageOpacity = row.layout?.bgImageOpacity ?? 100;
  const bgImage = row.layout?.bgImage || "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Background Color + opacity */}
      <div>
        <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>Background Color</label>
        <div className="flex gap-1.5">
          <input type="color" value={row.bg_color || "#FFFFFF"} onChange={(e) => onRowMetaChange({ bg_color: e.target.value })} className="w-10 h-9 rounded border cursor-pointer" style={{ borderColor: "hsl(var(--border))" }} />
          <input value={row.bg_color || ""} onChange={(e) => onRowMetaChange({ bg_color: e.target.value })} placeholder="#FFFFFF" className="flex-1 px-3 py-2 rounded-lg font-body text-sm border" style={{ borderColor: "hsl(var(--border))", backgroundColor: "#FFFFFF", color: "#1a1a1a" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <span className="font-body text-[9px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))", minWidth: 50 }}>Opacity</span>
          <input
            type="range" min={0} max={100} value={bgColorOpacity}
            onChange={(e) => onRowMetaChange({ layout: { ...(row.layout || DEFAULT_ROW_LAYOUT), bgColorOpacity: Number(e.target.value) } })}
            style={{ flex: 1, accentColor: "hsl(var(--secondary))" }}
          />
          <span className="font-body text-[10px]" style={{ color: "hsl(var(--foreground))", minWidth: 32, textAlign: "right" }}>{bgColorOpacity}%</span>
        </div>
      </div>

      {/* Background Image + opacity */}
      <div>
        <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>Background Image URL</label>
        <input
          value={bgImage}
          onChange={(e) => onRowMetaChange({ layout: { ...(row.layout || DEFAULT_ROW_LAYOUT), bgImage: e.target.value } })}
          placeholder="https://..."
          className="w-full px-3 py-2 rounded-lg font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "#FFFFFF", color: "#1a1a1a" }}
        />
        {bgImage && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <span className="font-body text-[9px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))", minWidth: 50 }}>Opacity</span>
            <input
              type="range" min={0} max={100} value={bgImageOpacity}
              onChange={(e) => onRowMetaChange({ layout: { ...(row.layout || DEFAULT_ROW_LAYOUT), bgImageOpacity: Number(e.target.value) } })}
              style={{ flex: 1, accentColor: "hsl(var(--secondary))" }}
            />
            <span className="font-body text-[10px]" style={{ color: "hsl(var(--foreground))", minWidth: 32, textAlign: "right" }}>{bgImageOpacity}%</span>
          </div>
        )}
      </div>

      {row.type !== "hero" && (
        <RowAlignmentSettings
          layout={row.layout || DEFAULT_ROW_LAYOUT}
          onChange={(layout) => onRowMetaChange({ layout })}
        />
      )}
      <ColumnWidthControl
        columnCount={widthColCount}
        widths={columnWidths}
        onChange={onUpdateColumnWidths}
        disabled={!showWidthControl}
      />
      <GradientEditor
        gradient={currentGradient}
        legacyStart={legacyStart}
        legacyEnd={legacyEnd}
        onChange={(gradient) => onRowMetaChange({ layout: { ...(row.layout || DEFAULT_ROW_LAYOUT), gradient } })}
      />
      <OverlayEditor
        overlays={currentOverlays}
        onChange={(overlays) => onRowMetaChange({ layout: { ...(row.layout || DEFAULT_ROW_LAYOUT), overlays } })}
      />
    </div>
  );
};

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
  // The row's own background colour drives the RichTextEditor's surface
  // colour so light-on-light or dark-on-dark text remains legible while
  // editing — see RichField docstring in FieldComponents for details.
  const bg = row.bg_color;

  const commonMeta = (
    <div className="space-y-2 mb-4">
      <Field label="Strip Title" value={row.strip_title} onChange={(v) => onRowMetaChange({ strip_title: v })} />
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
      return <>{commonMeta}<HeroRowFieldsInline content={content} onChange={onContentChange} bgColor={bg} /></>;
    case "text":
      return (
        <>{commonMeta}
          <div className="space-y-3">
            <TitleLinesEditor titleLines={titleLines} onChange={(v) => onContentChange("title_lines", v)} />
            <SubtitleEditor subtitle={content.subtitle || ""} subtitleColor={content.subtitle_color || ""} onSubtitleChange={(v) => onContentChange("subtitle", v)} onColorChange={(v) => onContentChange("subtitle_color", v)} />
            <RichField label="Body" value={content.body || ""} onChange={(v) => onContentChange("body", v)} bgColor={bg} />
            {noteAndButton}
          </div>
        </>
      );
    case "service":
      return (
        <>{commonMeta}
          <PillarEditor pillarContent={content} servicesContent={{ services: content.services || [] }} onPillarChange={onContentChange} onServicesChange={(svcs) => onContentChange("services", svcs)} bgColor={bg} />
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
            <BoxedArrayField content={content} onChange={onContentChange} bgColor={bg} />
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
            <RichField label="Body" value={content.body || ""} onChange={(v) => onContentChange("body", v)} bgColor={bg} />
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
      return <>{commonMeta}<ImageTextEditor content={content} onChange={onContentChange} bgColor={bg} /></>;
    case "profile":
      return <>{commonMeta}<ProfileEditor content={content} onChange={onContentChange} bgColor={bg} /></>;
    case "grid":
      return <>{commonMeta}<GridEditor content={content} onChange={onContentChange} bgColor={bg} /></>;
    default:
      return commonMeta;
  }
};

const HeroRowFieldsInline = ({ content, onChange, bgColor }: { content: Record<string, any>; onChange: (field: string, value: any) => void; bgColor?: string }) => {
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
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} bgColor={bgColor} />
      <SectionBox label="Background">
        <SelectField label="Type" value={content.bg_type || "none"} options={BG_TYPES} onChange={(v) => onChange("bg_type", v)} />
        {content.bg_type === "image" && <ImagePickerField label="Background Image" value={content.bg_url || ""} onChange={(v) => onChange("bg_url", v)} />}
        {content.bg_type === "video" && <Field label="Video URL" value={content.bg_url || ""} onChange={(v) => onChange("bg_url", v)} />}
      </SectionBox>
    </div>
  );
};

/* ── Boxed cards array helper ── */
const BoxedArrayField = ({ content, onChange, bgColor }: { content: Record<string, any>; onChange: (field: string, value: any) => void; bgColor?: string }) => {
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
              <RichField label="Body" value={card.body} onChange={(v) => updateCard(i, "body", v)} bgColor={bgColor} />
            </div>
          </SectionBox>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
