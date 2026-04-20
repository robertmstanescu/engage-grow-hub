/**
 * ─────────────────────────────────────────────────────────────────────────
 * AdminDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Top-level orchestration shell for the admin panel. Lays out the three
 * primary regions:
 *
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │ TOPBAR  (logo · page title · preview/save/publish · profile)  │
 *   ├──────────┬───────────────────────┬──────────────────────────┤
 *   │ Sidebar  │ Page Structure rail   │ Properties / editor body │
 *   │ (icon)   │ (selected-section list│ (sub-tabs, fields, foot) │
 *   │          │  for the Site Editor) │                          │
 *   └──────────┴───────────────────────┴──────────────────────────┘
 *
 * Mobile (<768px) collapses the sidebar into an off-canvas drawer and
 * makes the page-structure rail full-width when no section is selected.
 *
 * REFACTOR NOTES (for future maintainers)
 * ───────────────────────────────────────
 * 1.  Six editor sub-components used to live inline at the bottom of this
 *     file: StyleTab, RowStyleTab, TitleLinesEditor, RowContentEditor,
 *     HeroRowFieldsInline, BoxedArrayField. They now live one-per-file in
 *     `src/features/admin/editors/`. Search there if you're hunting a
 *     field-set definition.
 *
 * 2.  Every STATIC inline `style={{ … }}` rule has been migrated to
 *     Tailwind utility classes referencing semantic tokens
 *     (`text-muted-foreground`, `bg-card`, `border-border`, etc.) per the
 *     project's Core memory rule "components MUST use design tokens".
 *
 *     Inline styles still appear here in three legitimate cases:
 *       (a) DYNAMIC values that depend on runtime state — e.g. the
 *           sidebar's `width` (animates between 58/220/260 depending on
 *           hover state and viewport), `transform` on the off-canvas
 *           drawer, `opacity` driven by `saving` / `publishing`.
 *       (b) The `linear-gradient(...)` brand swatch, which mixes two HSL
 *           tokens that have no Tailwind utility equivalent.
 *       (c) `accentColor` on `<input type="range">` — Tailwind has no
 *           default `accent-secondary` utility for CSS-variable colours.
 *
 *     Anything else that looks inline is a bug; please convert it to a
 *     class.
 *
 * 3.  Hover states that previously lived in `onMouseOver` / `onMouseOut`
 *     handlers have been replaced with `hover:` Tailwind variants where
 *     possible (Tailwind hover never works on `style`, so the handlers
 *     were unavoidable when colours came from inline rules).
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runDbAction } from "@/services/db-helpers";
import { invalidateSiteContent, useSiteContent } from "@/hooks/useSiteContent";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import {
  LayoutDashboard, FileText, Compass, BookOpen,
  Users, Mail, Image, Palette, Settings, LogOut,
  Save, Send, Tag, UserCog,
  GripVertical, Plus, Trash2, ArrowLeft, X, Sparkles, Menu,
  Loader2, Check, Search,
} from "lucide-react";
import { Link } from "react-router-dom";
// (Sheet/Drawer rollback: properties editor stays as a 3rd column.)

/**
 * useIsAdminMobile
 * Local hook (NOT the global useIsMobile, which uses a 1024px tablet
 * breakpoint). The admin panel only needs to switch into drawer mode on
 * actual phones (< 768px), so we listen on our own media query.
 */
const useIsAdminMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isMobile;
};

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
import TagsManager from "./TagsManager";
import PagesManager from "./PagesManager";
import NavigationManager from "./NavigationManager";
import GlobalSettings from "./GlobalSettings";
import MediaGallery from "./MediaGallery";
import BrandSettings from "./BrandSettings";
import SeoMaster from "./SeoMaster";
import HeroEditor from "./site-editor/HeroEditor";
import SeoFields from "./site-editor/SeoFields";
import { DEFAULT_ROWS, type PageRow, DEFAULT_ROW_LAYOUT } from "@/types/rows";
import { useListFilters } from "@/hooks/useListFilters";
import ListFilters from "@/components/ui/list-filters";

// ── Extracted editor components (see ./editors/ for each file) ──
import StyleTab from "./editors/StyleTab";
import RowStyleTab from "./editors/RowStyleTab";
import RowContentEditor from "./editors/RowContentEditor";

type Tab = "site" | "pages" | "navigation" | "blog" | "contacts" | "emails" | "media" | "brand" | "tags" | "settings" | "team" | "seo_master";
type PropertiesSubTab = "content" | "style" | "seo";
interface Props { session: any; }

/* ── Helpers ── */
const SECTION_EMOJI: Record<string, string> = {
  hero: "🎭", text: "✦", service: "💀", boxed: "✦", contact: "📬",
  image_text: "🖼", profile: "👤", grid: "📊", lead_magnet: "🎁",
  testimonial: "💬", logo_cloud: "🏷", faq: "❓",
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
  { type: "lead_magnet", label: "Lead Magnet", emoji: "🎁" },
  { type: "testimonial", label: "Testimonials", emoji: "💬" },
  { type: "logo_cloud", label: "Logo Cloud", emoji: "🏷" },
  { type: "faq", label: "FAQ Accordion", emoji: "❓" },
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
      { key: "seo_master" as Tab, icon: Search, label: "SEO Master" },
      { key: "team" as Tab, icon: UserCog, label: "Manage Team" },
      { key: "insights" as const, icon: Sparkles, label: "Insights" },
      { key: "settings" as Tab, icon: Settings, label: "Settings" },
    ] as Array<{ key: Tab | "insights"; icon: typeof LayoutDashboard; label: string }>,
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
   One row in the page-structure rail. Wraps a row's emoji + label and
   exposes a drag handle. Only the colour swatches that depend on the
   current selection (`isSelected`) remain inline because they switch
   between `secondary` and `transparent` per-instance.
   ═══════════════════════════════════════════════ */
const SortableSectionBlock = ({
  row, isSelected, onClick,
}: {
  row: PageRow; isSelected: boolean; onClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  // `transform`/`transition` are dynamic per drag-frame; opacity goes to
  // 0.5 while being dragged. These MUST stay inline.
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
      className="flex items-center gap-2 px-3 rounded-lg cursor-pointer transition-all md:py-2 py-3"
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`Section: ${row.strip_title || row.type}`}
    >
      {/* Selection indicator: a 4px-tall vertical bar that turns secondary
          when the row is selected. Colour is dynamic → stays inline. */}
      <span
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: isSelected ? "hsl(var(--secondary))" : "transparent" }}
      />
      <span className="text-base md:text-sm flex-shrink-0">{sectionEmoji(row.type)}</span>
      <div className="min-w-0 flex-1">
        <div
          className="font-body text-[13px] md:text-[11px] font-medium truncate"
          style={{ color: isSelected ? "hsl(var(--secondary))" : "hsl(var(--foreground))" }}
        >
          {row.strip_title || row.type}
        </div>
        <div className="font-body text-[10px] md:text-[9px] uppercase tracking-wider text-muted-foreground">
          {row.type}
        </div>
      </div>
      <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
    </div>
  );
};

/* ═══════════════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════════════ */
const AdminDashboard = ({ session }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>("site");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const isAdminMobile = useIsAdminMobile();
  // MobileAdminDrawer open/close state. We toggle this with the
  // hamburger in the header on screens < 768px.
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  /**
   * toggleMobileDrawer — wrapped in try/catch per spec because state
   * mutations during fast taps occasionally throw in React strict mode.
   */
  const toggleMobileDrawer = useCallback(() => {
    try {
      setMobileDrawerOpen((open) => !open);
    } catch (err) {
      console.error("[AdminDashboard] failed to toggle drawer", err);
    }
  }, []);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [propertiesSubTab, setPropertiesSubTab] = useState<PropertiesSubTab>("content");
  const [showAddRow, setShowAddRow] = useState(false);
  const [activeCol, setActiveCol] = useState(0);

  // ── CMS page editing ──
  const [cmsPage, setCmsPage] = useState<CmsPageRef | null>(null);
  const [cmsPageRows, setCmsPageRows] = useState<PageRow[]>([]);
  const [cmsPageStatus, setCmsPageStatus] = useState<string>("draft");
  const [cmsPageMeta, setCmsPageMeta] = useState<{ meta_title: string; meta_description: string; ai_summary: string }>({ meta_title: "", meta_description: "", ai_summary: "" });

  // ── Site content state (main page) ──
  const [sections, setSections] = useState<SectionData[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  /**
   * ─────────────────────────────────────────────────────────────
   * UNSAVED CHANGES TRACKING — for the junior developer
   * ─────────────────────────────────────────────────────────────
   * The save indicator in the topbar must answer ONE question reliably:
   *   "Has the admin edited something that has not yet been written
   *    back to the database?"
   *
   * For the MAIN PAGE we have a draft/published split: every section
   * row has a `content` (published) and a `draft_content` (in-flight)
   * blob. If those two JSON blobs differ for ANY section, we still owe
   * the database a write. We compare with `JSON.stringify` because the
   * blobs are tree-shaped and `===` would only catch reference changes.
   *
   * For a CMS PAGE we keep a separate `cmsPageDirty` flag that's flipped
   * to `true` every time `updateRows` mutates `cmsPageRows`, and reset
   * to `false` after a successful save/publish. We don't have an "old"
   * snapshot to diff against (we only loaded one row), so a manual flag
   * is the simplest path.
   *
   * The boolean below is the single source of truth the topbar reads.
   */
  const [cmsPageDirty, setCmsPageDirty] = useState(false);
  const hasUnsavedChanges = useMemo(() => {
    if (cmsPage) return cmsPageDirty;
    return sections.some((s) => {
      const draft = s.draft_content ?? s.content;
      return JSON.stringify(draft) !== JSON.stringify(s.content);
    });
  }, [sections, cmsPage, cmsPageDirty]);

  /**
   * ─────────────────────────────────────────────────────────────────────
   * SILENT AUTO-SAVE TO DRAFT — for the junior developer
   * ─────────────────────────────────────────────────────────────────────
   *
   * Goal: behave like Google Docs. The admin types, and 500ms after the
   * last edit we silently push the working copy to the database — to the
   * DRAFT columns only. The live site does not change.
   *
   * STRICT INVARIANT (do not break this):
   *   Auto-save writes ONLY to:
   *     • site_content.draft_content
   *     • cms_pages.draft_page_rows
   *   It NEVER touches `content` or `page_rows`. Those columns are the
   *   live site and are exclusively the domain of the "Publish" button.
   *
   * WHY SILENT (no toast)?
   *   A toast every 500ms would spam the screen and feel broken. Instead
   *   we surface progress with a subtle topbar pill that swaps between
   *   three states: "Saving…", "Saved to Draft ✓", and "Unsaved draft"
   *   (when draft has been auto-saved but differs from the live site).
   *
   * HOW THE PIECES FIT TOGETHER:
   *   1. Editors (TitleLineEditor, RichTextEditor, SubtitleEditor) keep
   *      typed text in local state/refs and DEBOUNCE their `onChange`
   *      push by ~300ms. So typing doesn't immediately bubble up.
   *   2. When the debounced `onChange` finally fires, it mutates the
   *      `sections` / `cmsPageRows` state here in the dashboard.
   *   3. THIS effect watches those state blobs. It fires its own 500ms
   *      debounce and writes the draft to the DB.
   *   4. The status pill goes "Saving…" while the request is in-flight,
   *      then "Saved to Draft ✓". If publish hasn't happened yet,
   *      `hasUnsavedChanges` is still true so the pill stays in the
   *      amber "draft" tone — the user knows the live site is out of date.
   *
   * RACE-CONDITION NOTE:
   *   We compare a JSON snapshot of what we last saved against what's
   *   currently in state. That stops us from sending duplicate writes
   *   when another effect causes a re-render but the data is unchanged.
   *
   *   We also bail out while `publishing` or `saving` is true, so the
   *   manual buttons always win and we don't fight them mid-write.
   * ─────────────────────────────────────────────────────────────────────
   */
  type AutoSaveStatus = "idle" | "saving" | "saved";
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const lastAutoSavedRef = useRef<string>("");
  const isInitialLoadRef = useRef(true);

  /**
   * Reset the "what was last saved" snapshot whenever we switch
   * between the main page and a CMS page. Without this, switching pages
   * would auto-save the new page's content as a "diff" against the
   * previous page's snapshot on first edit. Worse, the very first
   * render after switching would think everything changed and trigger
   * an immediate save of unmodified data.
   */
  useEffect(() => {
    isInitialLoadRef.current = true;
    lastAutoSavedRef.current = "";
    setAutoSaveStatus("idle");
  }, [cmsPage?.id]);

  // Compute the "current draft snapshot" each render — cheap because
  // JSON.stringify on small content blobs is fast and only runs when
  // state changes.
  const currentDraftSnapshot = useMemo(() => {
    if (cmsPage) {
      return JSON.stringify({ rows: cmsPageRows, meta: cmsPageMeta });
    }
    return JSON.stringify(sections.map((s) => ({ k: s.section_key, d: s.draft_content })));
  }, [cmsPage, cmsPageRows, cmsPageMeta, sections]);

  /**
   * Debounced silent auto-save. 500ms after the last change to the draft
   * snapshot, we write to draft columns. The save itself is awaited so
   * we can flip the status pill from "saving" → "saved".
   */
  const autoSaveDraft = useDebouncedCallback(async () => {
    // Don't fight a manual save / publish that's in flight.
    if (saving || publishing) return;
    // Skip if nothing actually changed since last successful auto-save.
    if (currentDraftSnapshot === lastAutoSavedRef.current) return;

    setAutoSaveStatus("saving");
    try {
      if (cmsPage) {
        const { error } = await supabase
          .from("cms_pages")
          .update({ draft_page_rows: cmsPageRows as any } as any)
          .eq("id", cmsPage.id);
        if (error) throw error;
      } else {
        // Only touch sections whose draft actually differs from `content`.
        // Keeps us from doing unnecessary writes for sections the user
        // didn't actually touch this session.
        const dirty = sections.filter(
          (s) => JSON.stringify(s.draft_content ?? s.content) !== JSON.stringify(s.content),
        );
        await Promise.all(
          dirty.map(async (s) => {
            const draft = (s.draft_content ?? s.content) as any;
            const { data: existing } = await supabase
              .from("site_content").select("id").eq("section_key", s.section_key).maybeSingle();
            if (existing) {
              return supabase.from("site_content")
                .update({ draft_content: draft })
                .eq("section_key", s.section_key);
            }
            return supabase.from("site_content").insert({
              section_key: s.section_key,
              content: s.content ?? draft,
              draft_content: draft,
            } as any);
          }),
        );
      }
      lastAutoSavedRef.current = currentDraftSnapshot;
      setAutoSaveStatus("saved");
    } catch (err) {
      // Auto-save errors should NOT shout at the user (they didn't ask
      // for the save). We log + leave the pill in "saving" so the next
      // tick will retry. The manual Save button is still available as
      // an escape hatch.
      console.error("[AdminDashboard] auto-save failed", err);
      setAutoSaveStatus("idle");
    }
  }, 500);

  useEffect(() => {
    // Skip the very first render after a load — we don't want to "save"
    // data we just fetched.
    if (isInitialLoadRef.current) {
      // Only consider the initial load complete once we actually have data.
      if (cmsPage ? cmsPageRows.length >= 0 : sections.length > 0) {
        isInitialLoadRef.current = false;
        lastAutoSavedRef.current = currentDraftSnapshot;
      }
      return;
    }
    // If snapshot matches what we last persisted, nothing to do.
    if (currentDraftSnapshot === lastAutoSavedRef.current) return;
    autoSaveDraft();
  }, [currentDraftSnapshot, cmsPage, cmsPageRows.length, sections.length, autoSaveDraft]);

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
        setCmsPageMeta({ meta_title: data.meta_title || "", meta_description: data.meta_description || "", ai_summary: data.ai_summary || "" });
        // Fresh load = clean state. Without this the dirty flag would
        // carry over from a previously-edited page.
        setCmsPageDirty(false);
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
          : s,
      ),
    );
  };

  const updateFullDraft = (sectionKey: string, draft: Record<string, any>) => {
    setSections((prev) =>
      prev.map((s) => (s.section_key === sectionKey ? { ...s, draft_content: draft } : s)),
    );
  };

  // Unified rows: main page or CMS page
  const pageRows: PageRow[] = cmsPage
    ? cmsPageRows
    : (getDraft("page_rows") as any)?.rows || [];

  const selectedRow = pageRows.find((r) => r.id === selectedSectionId) || null;

  // Unified row update. Junior dev note: any path that mutates rows
  // must flow through here so the dirty flag stays in sync. If you add
  // a direct `setCmsPageRows(...)` call somewhere else, also flip
  // `setCmsPageDirty(true)` or the topbar indicator will lie.
  const updateRows = useCallback((newRows: PageRow[]) => {
    if (cmsPage) {
      setCmsPageRows(newRows);
      setCmsPageDirty(true);
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
        : type === "lead_magnet" ? { resource_asset_id: null, cover_asset_id: null, title: "", description: "" }
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
    const defaultContent = { title_lines: [], body: "" };
    const existingExtra = row.columns_data || [];
    const newColumnsData = [...existingExtra, defaultContent];
    const colCount = 1 + newColumnsData.length;
    const equalWidth = Math.round(100 / colCount);
    const widths = Array(colCount).fill(equalWidth);
    widths[widths.length - 1] = 100 - equalWidth * (colCount - 1);
    updateRows(pageRows.map((r) =>
      r.id === rowId
        ? { ...r, columns_data: newColumnsData, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
        : r,
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
          : r,
      ));
    } else if (colIndex > 0 && row.columns_data) {
      const newExtra = row.columns_data.filter((_, i) => i !== colIndex - 1);
      const colCount = 1 + newExtra.length;
      const widths = colCount > 1 ? Array(colCount).fill(Math.round(100 / colCount)) : undefined;
      updateRows(pageRows.map((r) =>
        r.id === rowId
          ? { ...r, columns_data: newExtra.length > 0 ? newExtra : undefined, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
          : r,
      ));
    }
    setActiveCol(0);
  }, [pageRows, updateRows]);

  const updateColumnWidths = useCallback((rowId: string, widths: number[]) => {
    updateRows(pageRows.map((r) =>
      r.id === rowId
        ? { ...r, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
        : r,
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
    const result = await runDbAction({
      action: () => supabase.from("cms_pages").update(updates).eq("id", cmsPage.id),
      successMessage: newStatus === "published" ? "Published!" : "Unpublished",
    });
    if (result !== null) setCmsPageStatus(newStatus);
  }, [cmsPage, cmsPageStatus, cmsPageRows]);

  const updateCmsPageMeta = useCallback(async (field: string, value: string) => {
    const next = { ...cmsPageMeta, [field]: value };
    setCmsPageMeta(next);
    setCmsPageDirty(true);
    if (cmsPage) {
      await runDbAction({
        action: () => supabase.from("cms_pages").update({ [field]: value } as any).eq("id", cmsPage.id),
        successMessage: null,
      });
      // Meta saves immediately on blur, so the dirty flag flips back.
      setCmsPageDirty(false);
    }
  }, [cmsPage, cmsPageMeta]);

  // ── Save / Publish ──
  const saveDraft = useCallback(async () => {
    if (cmsPage) {
      const result = await runDbAction({
        action: () => supabase
          .from("cms_pages")
          .update({ draft_page_rows: cmsPageRows as any } as any)
          .eq("id", cmsPage.id),
        setLoading: setSaving,
        successMessage: "Draft saved",
      });
      // Successful save → no more pending edits.
      if (result !== null) setCmsPageDirty(false);
      return;
    }

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
        const failed = results.find((r) => r.error);
        return failed ?? { data: null, error: null };
      },
      setLoading: setSaving,
      successMessage: "Draft saved",
    });
    // For the main page, "Save draft" doesn't promote draft → published,
    // so `hasUnsavedChanges` (which compares the two blobs) stays true
    // until Publish runs. That's intentional: a draft is still "unsaved
    // relative to the live site".
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
      // Promote drafts to live content locally — that flips
      // `hasUnsavedChanges` to false because content === draft_content.
      setSections((prev) => prev.map((s) => ({ ...s, content: s.draft_content || s.content })));
      sections.forEach((s) => invalidateSiteContent(s.section_key));
      setCmsPageDirty(false);
    }
  }, [sections, cmsPage, cmsPageRows]);

  const handleLogout = async () => {
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
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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

  // Drag-to-reorder ONLY makes sense against the unfiltered list.
  const isRowListFiltered = rowFilters.state.isFiltering;

  // ── Row content update for properties panel ──
  const updateRowContent = (field: string, value: any) => {
    if (!selectedSectionId) return;
    const newRows = pageRows.map((r) =>
      r.id === selectedSectionId ? { ...r, content: { ...r.content, [field]: value } } : r,
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
      r.id === selectedSectionId ? { ...r, ...updates } : r,
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

  // ── Dynamic style helpers ────────────────────────────────────────
  // Sidebar width depends on three flags (mobile / hover-expanded / drawer).
  // Tailwind can't express this conditional value, so the resulting object
  // stays inline. We collect it here once for readability.
  const sidebarStyle: React.CSSProperties = {
    width: isAdminMobile ? 260 : (sidebarExpanded ? 220 : 58),
    transform: isAdminMobile && !mobileDrawerOpen ? "translateX(-100%)" : "translateX(0)",
    boxShadow: isAdminMobile && mobileDrawerOpen ? "8px 0 24px -8px hsl(0 0% 0% / 0.2)" : "none",
  };
  // Page-structure rail width: on mobile the rail owns the full
  // screen until the user picks a section (then the properties
  // column takes over). On desktop it stays at a fixed 340px so the
  // properties column always sits alongside.
  const pageStructureWidth = isAdminMobile
    ? (isSiteTab && !selectedSectionId ? "100%" : 0)
    : (isSiteTab ? 340 : 0);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* ═══ TOPBAR ═══ */}
      {/*
        Mobile: 12px horizontal padding (room for hamburger).
        Desktop: 16px right padding, but the LEFT padding is `58px + 16px`
        so the topbar text doesn't slide under the always-visible icon rail.
      */}
      <header
        className={[
          "h-[52px] flex-shrink-0 flex items-center justify-between bg-card border-b border-border gap-2",
          isAdminMobile ? "px-3" : "pl-[calc(58px+1rem)] pr-4",
        ].join(" ")}
      >
        {isAdminMobile && (
          /* Hamburger trigger — only rendered on mobile (< 768px). */
          <button
            onClick={toggleMobileDrawer}
            aria-label="Open admin menu"
            className="w-9 h-9 rounded-lg border border-border bg-card text-foreground flex items-center justify-center cursor-pointer flex-shrink-0"
          >
            <Menu size={18} />
          </button>
        )}
        {/* Brand wordmark — hidden on mobile to save horizontal space. */}
        {!isAdminMobile && (
          <span className="font-display text-[11px] font-bold text-secondary tracking-[0.15em] whitespace-nowrap">
            THE MAGIC COFFIN
          </span>
        )}
        <span className="text-[11px] text-muted-foreground font-body flex-1 text-center overflow-hidden text-ellipsis whitespace-nowrap">
          {isSiteTab ? pageLabel : tabLabel}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(cmsPage ? `/p/${cmsPage.slug}` : "/", "_blank")}
            className="text-[10px] font-body text-muted-foreground bg-transparent border-none cursor-pointer uppercase tracking-[0.1em]"
          >
            Preview live →
          </button>
          {isSiteTab && (
            <>
              {cmsPage && (
                <button
                  onClick={toggleCmsPagePublish}
                  className={[
                    "text-[10px] font-body uppercase tracking-[0.1em] px-3.5 py-1.5 rounded-full cursor-pointer border bg-transparent",
                    cmsPageStatus === "published"
                      ? "border-destructive/40 text-destructive"
                      : "border-border text-foreground",
                  ].join(" ")}
                >
                  {cmsPageStatus === "published" ? "Unpublish" : "Set Published"}
                </button>
              )}
              {/*
                ─────────────────────────────────────────────────
                SAVE STATUS INDICATOR — for the junior developer
                ─────────────────────────────────────────────────
                Two pieces of state drive this pill:

                  • autoSaveStatus  → "saving" | "saved" | "idle"
                                      reflects the SILENT debounced
                                      auto-save effect above.
                  • hasUnsavedChanges → draft ≠ published copy.
                                      True even after a successful
                                      auto-save, because draft and
                                      live still differ.

                The label priority is:
                  1. Saving…                — request in flight.
                  2. Saved to Draft ✓       — auto-save just finished
                                              AND the draft still differs
                                              from the live site (i.e.
                                              waiting for Publish).
                  3. Saved                  — draft and live match.

                There is intentionally NO toast on auto-save — that
                would spam the screen every 500ms while typing.
              */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-[10px] uppercase tracking-[0.1em]"
                aria-live="polite"
              >
                {autoSaveStatus === "saving" ? (
                  <>
                    <Loader2 size={11} className="animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Saving…</span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <Check size={11} className="text-amber-500" />
                    <span className="text-amber-500">Saved to Draft</span>
                  </>
                ) : (
                  <>
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                    />
                    <span className="text-muted-foreground">Saved</span>
                  </>
                )}
              </div>
              <button
                onClick={saveDraft}
                disabled={saving || !hasUnsavedChanges}
                style={{ opacity: saving ? 0.5 : (hasUnsavedChanges ? 1 : 0.5) }}
                className="text-[10px] font-body uppercase tracking-[0.1em] px-3.5 py-1.5 rounded-full cursor-pointer border border-border bg-transparent text-foreground"
              >
                <Save size={11} className="inline -translate-y-px mr-1" />
                {saving ? "Saving…" : "Save draft"}
              </button>
              {/*
                Publish — visually distinct so it's impossible to miss.
                Solid PRIMARY background, bolder weight, slightly larger
                padding, and a soft glow when there are unsaved changes.
              */}
              <button
                onClick={publishAll}
                disabled={publishing}
                style={{
                  opacity: publishing ? 0.4 : 1,
                  boxShadow: hasUnsavedChanges ? "0 0 0 2px hsl(var(--primary) / 0.25)" : "none",
                }}
                className="text-[11px] font-body font-bold uppercase tracking-[0.12em] px-4 py-1.5 rounded-full cursor-pointer border-none bg-primary text-primary-foreground"
              >
                <Send size={12} className="inline -translate-y-px mr-1" />
                {publishing ? "Publishing…" : "Publish"}
              </button>
            </>
          )}
          {/* Profile shortcut → /admin/profile (display name, avatar). */}
          <Link
            to="/admin/profile"
            title="Profile settings"
            className="w-7 h-7 rounded-full flex items-center justify-center font-display text-[9px] font-bold text-background no-underline"
            // Brand gradient — uses both HSL tokens, kept inline.
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
          >
            R
          </Link>
        </div>
      </header>

      {/* ═══ MAIN ROW ═══ */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── MobileAdminDrawer overlay ── only on mobile when open. */}
        {isAdminMobile && mobileDrawerOpen && (
          <div
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden
            className="absolute inset-0 z-40 backdrop-blur-[2px]"
            style={{ background: "hsl(var(--foreground) / 0.4)" }}
          />
        )}

        {/* ──────────────────────────────────────────────────────
         * SIDEBAR / MobileAdminDrawer
         * Desktop (>= 768px): permanent rail that expands on hover.
         * Mobile  (<  768px): off-canvas drawer that slides in.
         * width / transform / shadow are all runtime-dependent.
         * ────────────────────────────────────────────────────── */}
        <nav
          onMouseEnter={() => !isAdminMobile && setSidebarExpanded(true)}
          onMouseLeave={() => !isAdminMobile && setSidebarExpanded(false)}
          className={[
            "top-0 bottom-0 left-0 bg-card border-r border-border flex-shrink-0 overflow-hidden flex flex-col",
            // The transition curve is bespoke; declared as an arbitrary
            // value to avoid polluting tailwind.config.
            "[transition:width_0.3s_cubic-bezier(0.16,1,0.3,1),transform_0.3s_cubic-bezier(0.16,1,0.3,1)]",
            isAdminMobile ? "absolute z-50" : "relative",
          ].join(" ")}
          style={sidebarStyle}
        >
          {/* On mobile show a labelled close button at the top of the drawer */}
          {isAdminMobile && (
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
              <span className="font-display text-[11px] font-bold tracking-[0.15em] text-secondary">
                MENU
              </span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close admin menu"
                className="w-8 h-8 rounded-lg border-none bg-transparent text-muted-foreground flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pt-2">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <div
                  className={[
                    "text-[8px] uppercase whitespace-nowrap transition-opacity",
                    "px-[1.1rem] pt-3 pb-[0.35rem]",
                    // Label opacity is the only thing toggling here; the
                    // hover-expand state isn't a CSS hover so we can't use
                    // group-hover. Keep it inline.
                  ].join(" ")}
                  style={{
                    color: "hsl(var(--muted-foreground) / 0.5)",
                    letterSpacing: "0.3em",
                    opacity: isAdminMobile || sidebarExpanded ? 1 : 0,
                  }}
                >
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const active = activeTab === item.key;
                  // `insights` navigates to a separate route, not a tab.
                  const isExternalRoute = item.key === "insights";
                  const handleClick = () => {
                    if (isExternalRoute) {
                      window.location.href = "/admin/insights";
                      return;
                    }
                    setActiveTab(item.key as Tab);
                    setSelectedSectionId(null);
                    if (item.key !== "site") setCmsPage(null);
                    if (isAdminMobile) setMobileDrawerOpen(false);
                  };
                  return (
                    <button
                      key={item.key}
                      onClick={handleClick}
                      className={[
                        "flex items-center gap-2.5 w-full border-none cursor-pointer text-left transition-[background] duration-150",
                        isAdminMobile ? "px-4 py-3.5" : "px-4 py-2",
                        // Active vs inactive look. The 2px left border
                        // collapses to transparent when inactive so layout
                        // doesn't shift.
                        active
                          ? "bg-secondary/[0.07] text-secondary border-l-2 border-secondary"
                          : "bg-transparent text-muted-foreground border-l-2 border-transparent hover:bg-foreground/[0.04]",
                      ].join(" ")}
                    >
                      <item.icon size={16} className="flex-shrink-0" />
                      <span
                        className={[
                          "font-body whitespace-nowrap transition-opacity",
                          isAdminMobile ? "text-[13px]" : "text-[11px]",
                        ].join(" ")}
                        style={{ opacity: isAdminMobile || sidebarExpanded ? 1 : 0 }}
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
          <div className="border-t border-border p-1">
            <button
              onClick={handleLogout}
              className={[
                "flex items-center gap-2.5 w-full border-none cursor-pointer text-left bg-transparent text-muted-foreground",
                isAdminMobile ? "px-4 py-3.5" : "px-4 py-2",
              ].join(" ")}
            >
              <LogOut size={16} className="flex-shrink-0" />
              <span
                className={[
                  "font-body whitespace-nowrap transition-opacity",
                  isAdminMobile ? "text-[13px]" : "text-[11px]",
                ].join(" ")}
                style={{ opacity: isAdminMobile || sidebarExpanded ? 1 : 0 }}
              >
                Sign out
              </span>
            </button>
          </div>
        </nav>

        {/* ── PAGE STRUCTURE PANEL ── full-width on mobile, 240px on desktop. */}
        <div
          className={[
            "bg-card flex-shrink-0 overflow-hidden flex flex-col",
            "[transition:width_0.3s_cubic-bezier(0.16,1,0.3,1)]",
            isSiteTab && !isAdminMobile ? "border-r border-border" : "",
          ].join(" ")}
          style={{ width: pageStructureWidth }}
        >
          <div className="h-11 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
            {cmsPage ? (
              <button
                onClick={() => setCmsPage(null)}
                className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-muted-foreground font-body text-[10px]"
              >
                <ArrowLeft size={12} /> Back to Main Page
              </button>
            ) : (
              <span className="font-display text-[10px] font-bold text-foreground whitespace-nowrap">
                Page Structure
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
            {/* Search / filter / sort bar — only renders when the row rail
                contains anything worth filtering. */}
            {pageRows.length > 1 && (
              <div className="mb-2">
                <ListFilters
                  state={rowFilters.state}
                  searchPlaceholder="Search rows…"
                  formatCategoryLabel={friendlyRowType}
                />
                {isRowListFiltered && (
                  <p className="font-body text-[9px] uppercase tracking-wider mt-1 px-1 text-muted-foreground">
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
                // Selection background is dynamic per click → inline.
                style={{ background: selectedSectionId === "__hero__" ? "hsl(var(--secondary) / 0.07)" : "transparent" }}
              >
                <span
                  className="w-1 self-stretch rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedSectionId === "__hero__" ? "hsl(var(--secondary))" : "transparent" }}
                />
                <span className="text-sm flex-shrink-0">🎭</span>
                <div className="min-w-0 flex-1">
                  <div
                    className="font-body text-[11px] font-medium truncate"
                    style={{ color: selectedSectionId === "__hero__" ? "hsl(var(--secondary))" : "hsl(var(--foreground))" }}
                  >
                    Hero
                  </div>
                  <div className="font-body text-[9px] uppercase tracking-wider text-muted-foreground">hero</div>
                </div>
              </div>
            )}

            {/* Page rows. DnD is suppressed while filtering. */}
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
                  <div className="text-center py-6 px-2 text-muted-foreground text-[10px] font-body">
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
                className="flex items-center gap-1.5 w-full justify-center py-2 rounded-lg border border-dashed border-border text-muted-foreground text-[10px] font-body transition-all hover:opacity-70"
              >
                <Plus size={12} /> Add Row
              </button>
              {showAddRow && (
                <div className="absolute left-3 right-3 mt-1 rounded-lg border border-border shadow-lg overflow-hidden z-10 bg-card">
                  {ROW_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => addRow(opt.type)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left transition-all text-[11px] font-body text-foreground bg-transparent border-none cursor-pointer hover:bg-secondary/[0.07]"
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {pageRows.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-[11px] font-body">
                No rows yet. Click '+ Add Row' above.
              </div>
            )}

            {/* SEO block */}
            <div
              onClick={() => { setSelectedSectionId("__seo__"); setPropertiesSubTab("seo"); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all mt-1"
              style={{ background: selectedSectionId === "__seo__" ? "hsl(var(--secondary) / 0.07)" : "transparent" }}
            >
              <span
                className="w-1 self-stretch rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedSectionId === "__seo__" ? "hsl(var(--secondary))" : "transparent" }}
              />
              <span className="text-sm flex-shrink-0">🔍</span>
              <div className="min-w-0 flex-1">
                <div
                  className="font-body text-[11px] font-medium truncate"
                  style={{ color: selectedSectionId === "__seo__" ? "hsl(var(--secondary))" : "hsl(var(--foreground))" }}
                >
                  SEO & Metadata
                </div>
                <div className="font-body text-[9px] uppercase tracking-wider text-muted-foreground">meta</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT AREA ── on mobile, hidden when no section is
         * selected so the page-structure list owns the screen. */}
        <div
          className={[
            "flex-1 min-w-0 flex flex-col overflow-hidden",
            isAdminMobile && isSiteTab && !selectedSectionId ? "hidden" : "",
          ].join(" ")}
        >
          {isSiteTab ? (
            <div className="flex-1 bg-card overflow-hidden flex flex-col">
              {!selectedSectionId ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-[11px] text-muted-foreground font-body">
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
                      // ── STICKY PROPERTIES HEADER ──────────────────────────
                      // The row title + Delete button must remain visible no
                      // matter how far the user scrolls inside the editor body
                      // below. We use `sticky top-0 z-10` (instead of fixed)
                      // so the header still flows in the column layout and
                      // shrinks gracefully on mobile. The translucent
                      // `bg-card/95 backdrop-blur` keeps it readable when the
                      // scrolled content slides underneath.
                      <div className="sticky top-0 z-10 h-11 flex items-center gap-2 px-4 border-b border-border flex-shrink-0 bg-card/95 backdrop-blur">
                        {isAdminMobile && (
                          <button
                            onClick={() => setSelectedSectionId(null)}
                            aria-label="Back to section list"
                            className="w-8 h-8 -ml-1.5 rounded-lg border-none bg-transparent text-muted-foreground flex items-center justify-center cursor-pointer"
                          >
                            <ArrowLeft size={16} />
                          </button>
                        )}
                        <span className="font-display text-[10px] font-bold text-foreground whitespace-nowrap">
                          {selectedSectionId === "__hero__"
                            ? "Hero"
                            : selectedSectionId === "__seo__"
                            ? "SEO & Metadata"
                            : selectedRow?.strip_title || "Section"}
                        </span>
                        {selectedSectionId !== "__seo__" && (
                          <span className="text-[8px] uppercase tracking-[0.1em] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-sm">
                            {selectedSectionId === "__hero__" ? "hero" : selectedRow?.type}
                          </span>
                        )}
                        <div className="flex-1" />
                        {isRow && rowColCount < 4 && (
                          <button
                            onClick={() => addColumnToRow(selectedRow!.id)}
                            className="flex items-center gap-1 text-[9px] font-body uppercase tracking-[0.08em] px-2.5 py-1 rounded-[14px] cursor-pointer border border-primary/30 bg-transparent text-primary"
                          >
                            <Plus size={10} /> Column
                          </button>
                        )}
                        {isRow && (
                          <button
                            onClick={() => deleteRow(selectedRow!.id)}
                            className="flex items-center justify-center w-7 h-7 rounded-md cursor-pointer border border-destructive/30 bg-transparent text-destructive"
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
                      <div className="border-b border-border flex-shrink-0">
                        <div className="flex">
                          {(["content", "style"] as PropertiesSubTab[]).map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setPropertiesSubTab(tab)}
                              className={[
                                "flex-1 p-2 text-[9px] tracking-[0.1em] uppercase border-none cursor-pointer bg-transparent font-body",
                                propertiesSubTab === tab
                                  ? "text-secondary border-b-2 border-secondary"
                                  : "text-muted-foreground border-b-2 border-transparent",
                              ].join(" ")}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>
                        {isRow && rowColCount > 1 && propertiesSubTab === "content" && (
                          <div
                            className="flex gap-0.5 px-3 py-1.5 border-t"
                            style={{ borderTopColor: "hsl(var(--border) / 0.3)" }}
                          >
                            {Array.from({ length: rowColCount }).map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setActiveCol(i)}
                                className={[
                                  "flex items-center gap-1 text-[9px] font-body tracking-[0.05em] px-2.5 py-[3px] rounded-xl cursor-pointer border",
                                  safeActiveCol === i
                                    ? "border-secondary bg-secondary/10 text-secondary"
                                    : "border-border bg-transparent text-muted-foreground",
                                ].join(" ")}
                              >
                                Col {i + 1}
                                {rowColCount > 1 && (
                                  <span
                                    onClick={(e) => { e.stopPropagation(); removeColumnFromRow(selectedRow!.id, i); }}
                                    className="cursor-pointer ml-0.5 opacity-60"
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
                  <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
                    {selectedSectionId === "__seo__" ? (
                      cmsPage ? (
                        <SeoFields
                          metaTitle={cmsPageMeta.meta_title}
                          metaDescription={cmsPageMeta.meta_description}
                          onTitleChange={(v) => updateCmsPageMeta("meta_title", v)}
                          onDescriptionChange={(v) => updateCmsPageMeta("meta_description", v)}
                          aiSummary={cmsPageMeta.ai_summary}
                          onAiSummaryChange={(v) => updateCmsPageMeta("ai_summary", v)}
                        />
                      ) : (
                        // Main page — ai_summary lives inside the main_page_seo JSON blob.
                        <SeoFields
                          metaTitle={(getDraft("main_page_seo") as any)?.meta_title || ""}
                          metaDescription={(getDraft("main_page_seo") as any)?.meta_description || ""}
                          onTitleChange={(v) => updateField("main_page_seo", "meta_title", v)}
                          onDescriptionChange={(v) => updateField("main_page_seo", "meta_description", v)}
                          aiSummary={(getDraft("main_page_seo") as any)?.ai_summary || ""}
                          onAiSummaryChange={(v) => updateField("main_page_seo", "ai_summary", v)}
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
                </>
              )}
            </div>
          ) : (
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-[1000px] mx-auto">
                {activeTab === "pages" && <PagesManager onEditPage={handleEditPage} />}
                {activeTab === "navigation" && <NavigationManager />}
                {activeTab === "blog" && <BlogEditor />}
                {activeTab === "contacts" && <ContactsList />}
                {activeTab === "emails" && <EmailCampaigns />}
                {activeTab === "media" && <MediaGallery />}
                {activeTab === "brand" && <BrandSettings />}
                {activeTab === "tags" && <TagsManager />}
                {activeTab === "team" && <ManageTeam />}
                {activeTab === "seo_master" && <SeoMaster />}
                {activeTab === "settings" && <GlobalSettings />}
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
