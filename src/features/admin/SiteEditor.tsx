/**
 * SiteEditor — page-builder adapter for the main page (`site_content`
 * table, "page_rows" + "main_page_seo" sections).
 *
 * Renders through the SAME <PageBuilderShell/> as CmsPageBuilder and
 * BlogPostBuilder — this file used to hand-roll its own copy of the
 * three-pane shell, its own AdminBuilderToolbar wiring, and its own
 * (older, incomplete) drag-and-drop handleDragEnd. That copy was
 * missing the cell-drop branch, the layout-drop branch, and the
 * toast.error feedback for unresolved widget types that
 * PageBuilderShell's shared handler already has. Only the DATA layer
 * (site_content's draft/live split across two rows, instead of one
 * cms_pages row) differs now — everything else is shared.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { confirmUnsavedExit } from "@/components/ConfirmDialog";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import type { PageRow } from "@/types/rows";
import { DEFAULT_ROWS } from "@/lib/constants/rowDefaults";
import { normalizeRowsToV3 } from "@/lib/migrations/rowMigrations";
import {
  findMissingAltViolations,
  formatAltMissingMessage,
} from "@/services/contentAccessibility";
import PageBuilderShell from "./builder/PageBuilderShell";
import RevisionHistoryPanel from "./builder/RevisionHistoryPanel";
import AdminStatusControl from "./ui/AdminStatusControl";
import type { ContentState } from "./naming";

interface SectionData {
  id: string;
  section_key: string;
  content: Record<string, any>;
  draft_content: Record<string, any> | null;
  publish_at: string | null;
  expiry_at: string | null;
}

interface Props {
  /** Exit the builder back to the admin dashboard overview. */
  onExit?: () => void;
  /**
   * Reports this editor's own hasChanges up to AdminDashboard, whose
   * useBlocker guard has no other way to see it — `sections` here is
   * local state, not lifted into AdminDashboard's props.
   */
  onDirtyChange?: (dirty: boolean) => void;
}

const SiteEditor = ({ onExit, onDirtyChange }: Props) => {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [visibility, setVisibility] = useState<ContentState>("live");
  const [savedVisibility, setSavedVisibility] = useState<ContentState>("live");
  const [publishAt, setPublishAt] = useState<string | null>(null);
  const [expiryAt, setExpiryAt] = useState<string | null>(null);

  const reloadSections = useCallback(async () => {
    const { data } = await supabase
      .from("site_content")
      .select("id, section_key, content, draft_content, publish_at, expiry_at")
      .in("section_key", ["page_rows", "main_page_seo"]) as any;
    if (data) {
      const mapped = data.map((s: any) => ({
        section_key: s.section_key,
        id: s.id,
        content: s.content,
        draft_content: s.draft_content || s.content,
        publish_at: s.publish_at,
        expiry_at: s.expiry_at,
      }));
      setSections(mapped);
      const rows = mapped.find((s: SectionData) => s.section_key === "page_rows");
      setPublishAt(rows?.publish_at ?? null);
      setExpiryAt(rows?.expiry_at ?? null);
      const loadedVisibility: ContentState = rows?.publish_at && new Date(rows.publish_at).getTime() > Date.now() ? "scheduled" : "live";
      setVisibility(loadedVisibility);
      setSavedVisibility(loadedVisibility);
    }
  }, []);

  useEffect(() => {
    reloadSections();
  }, [reloadSections]);

  // Ensure page_rows and main_page_seo sections exist in state.
  useEffect(() => {
    if (sections.length === 0) return;
    const toAdd: SectionData[] = [];
    if (!sections.some((s) => s.section_key === "page_rows")) {
      toAdd.push({ id: "", section_key: "page_rows", content: { rows: DEFAULT_ROWS }, draft_content: { rows: DEFAULT_ROWS }, publish_at: null, expiry_at: null });
    }
    if (!sections.some((s) => s.section_key === "main_page_seo")) {
      toAdd.push({ id: "", section_key: "main_page_seo", content: { meta_title: "", meta_description: "" }, draft_content: { meta_title: "", meta_description: "" }, publish_at: null, expiry_at: null });
    }
    if (toAdd.length) setSections((prev) => [...prev, ...toAdd]);
  }, [sections]);

  const getSection = (key: string) => sections.find((s) => s.section_key === key);
  const getDraft = (key: string): Record<string, any> => getSection(key)?.draft_content || getSection(key)?.content || {};

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

  // US 2.2 — Normalize draft to v3 on every read so the builder + the
  // inspector operate on the Atomic Node Tree exclusively.
  const pageRows: PageRow[] = normalizeRowsToV3((getDraft("page_rows") as any)?.rows || []) as unknown as PageRow[];
  const onRowsChange = useCallback((rows: PageRow[]) => updateFullDraft("page_rows", { rows }), []);

  const rowsSection = getSection("page_rows");
  const hasTimingChanges = visibility !== savedVisibility || publishAt !== (rowsSection?.publish_at ?? null) || expiryAt !== (rowsSection?.expiry_at ?? null);
  const hasChanges = hasTimingChanges || sections.some((s) => JSON.stringify(s.draft_content) !== JSON.stringify(s.content));
  useEffect(() => { onDirtyChange?.(hasChanges); }, [hasChanges, onDirtyChange]);
  // Clear the parent's dirty flag on unmount so switching away from a
  // clean state never leaves a stale "unsaved changes" guard armed.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  /** Guard the exit with the same unsaved-changes confirm used
   *  elsewhere (Debug Story 4.1) before handing off to the dashboard's
   *  own navigation logic. */
  const handleExit = useCallback(async () => {
    if (hasChanges && !(await confirmUnsavedExit())) return;
    onExit?.();
  }, [hasChanges, onExit]);

  /**
   * US 16.2 — Global Save Draft. There is one save action in the
   * toolbar. It writes draft_content for EVERY dirty section in a
   * single batch — the only path from in-memory edits to the database.
   */
  const onSaveDraft = useCallback(async () => {
    const dirty = sections.filter((s) => JSON.stringify(s.draft_content) !== JSON.stringify(s.content));
    if (dirty.length === 0 && !hasTimingChanges) {
      toast.info("Nothing to save");
      return;
    }
    setSaving(true);
    if (visibility === "scheduled" && (!publishAt || new Date(publishAt).getTime() <= Date.now())) {
      toast.error("Choose a future date and time for the homepage to go live.");
      setSaving(false);
      return;
    }
    if (visibility === "scheduled" && expiryAt && publishAt && new Date(expiryAt).getTime() <= new Date(publishAt).getTime()) {
      toast.error("The stop date must be after the go-live date.");
      setSaving(false);
      return;
    }
    const targets = sections.filter(
      (s) => dirty.includes(s) || (hasTimingChanges && s.section_key === "page_rows"),
    );
    // Choosing "Live" and saving is an explicit publish: promote the
    // draft content into the live `content` column in the same write,
    // otherwise the homepage would flip to published while visitors
    // still see the old content. Draft/scheduled saves keep `content`
    // untouched.
    const goingLive = visibility === "live";
    const updates = targets.map((s) => {
      const draft = (s.draft_content || s.content) as any;
      const isPageRows = s.section_key === "page_rows";
      return supabase.from("site_content").upsert(
        {
          section_key: s.section_key,
          content: goingLive ? draft : s.content,
          draft_content: draft,
          publish_at: isPageRows && visibility === "scheduled" ? publishAt : null,
          expiry_at: isPageRows && visibility === "scheduled" ? expiryAt : null,
        } as any,
        { onConflict: "section_key" },
      );
    });
    const results = await Promise.all(updates);
    const err = results.find((r) => r.error);
    if (err?.error) toast.error((err.error as any).message);
    else {
      setSections((prev) => prev.map((s) => targets.includes(s)
        ? {
            ...s,
            content: goingLive ? ((s.draft_content || s.content) as any) : s.content,
            publish_at: s.section_key === "page_rows" && visibility === "scheduled" ? publishAt : null,
            expiry_at: s.section_key === "page_rows" && visibility === "scheduled" ? expiryAt : null,
          }
        : s));
      setSavedVisibility(visibility);
      toast.success(
        goingLive
          ? "Homepage published"
          : visibility === "scheduled"
            ? "Homepage schedule saved"
            : "Homepage draft saved",
      );
    }
    setSaving(false);
  }, [sections, hasTimingChanges, visibility, publishAt, expiryAt]);

  const onPublish = useCallback(async () => {
    // EPIC 13 / US 13.1 — gate publish on accessibility (alt text). Pull
    // rows from the live draft snapshot — the source of truth about
    // what is ABOUT to go live.
    const draftRowsForCheck =
      ((sections.find((s) => s.section_key === "page_rows")?.draft_content as any)?.rows ||
        (sections.find((s) => s.section_key === "page_rows")?.content as any)?.rows ||
        []) as PageRow[];
    const violations = findMissingAltViolations(draftRowsForCheck);
    const message = formatAltMissingMessage(violations);
    if (message) {
      toast.error(message, {
        description: violations.map((v) => `• ${v.label} — “${v.stripTitle}”`).join("\n"),
      });
      return;
    }

    setPublishing(true);
    const updates = sections.map((s) => {
      const data = (s.draft_content || s.content) as any;
      return supabase
        .from("site_content")
        .upsert({ section_key: s.section_key, content: data, draft_content: data, publish_at: null, expiry_at: null } as any, { onConflict: "section_key" });
    });
    const results = await Promise.all(updates);
    const err = results.find((r) => r.error);
    if (err?.error) {
      toast.error((err.error as any).message);
    } else {
      setSections((prev) => prev.map((s) => ({ ...s, content: s.draft_content || s.content })));
      setVisibility("live");
      setSavedVisibility("live");
      setPublishAt(null);
      setExpiryAt(null);
      sections.forEach((s) => invalidateSiteContent(s.section_key));
      toast.success("All changes published!");
    }
    setPublishing(false);
  }, [sections]);

  const onPreview = useCallback(() => {
    const saveAll = sections.map((s) =>
      supabase.from("site_content").update({ draft_content: (s.draft_content || s.content) as any }).eq("section_key", s.section_key)
    );
    Promise.all(saveAll).then(() => window.open("/?preview=1", "_blank"));
  }, [sections]);

  const seoTitle = (getDraft("main_page_seo") as any)?.meta_title || "";
  const seoDescription = (getDraft("main_page_seo") as any)?.meta_description || "";

  if (sections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground font-body text-xs">
        Loading page…
      </div>
    );
  }

  return (
    <PageBuilderShell
      title="Main Page"
      onExit={onExit ? handleExit : undefined}
      // Homepage's slug is fixed at "/" — the page title mirrors
      // main_page_seo.meta_title so editors edit it in one place.
      pageTitle={seoTitle}
      onPageTitleChange={(v) => updateField("main_page_seo", "meta_title", v)}
      pageSlug=""
      slugEditable={false}
      slugPrefix="/"
      pageRows={pageRows}
      onRowsChange={onRowsChange}
      seoMetaTitle={seoTitle}
      seoMetaDescription={seoDescription}
      onSeoTitleChange={(v) => updateField("main_page_seo", "meta_title", v)}
      onSeoDescriptionChange={(v) => updateField("main_page_seo", "meta_description", v)}
      onSaveDraft={onSaveDraft}
      onPublish={onPublish}
      onPreview={onPreview}
      saving={saving}
      publishing={publishing}
      hasChanges={hasChanges}
      schedulePanel={
        <AdminStatusControl
          state={visibility}
          onStateChange={setVisibility}
          publishAt={publishAt}
          expiryAt={expiryAt}
          onPublishAtChange={setPublishAt}
          onExpiryAtChange={setExpiryAt}
        />
      }
      inspectorFooter={
        <RevisionHistoryPanel
          entityType="site_content"
          entityRef="page_rows"
          onRestored={reloadSections}
        />
      }
    />
  );
};

export default SiteEditor;
