/**
 * CmsPageBuilder — page-builder adapter for the `cms_pages` table.
 *
 * MOUNTED FROM AdminDashboard when an admin opens a CMS page in the
 * "Pages" tab. Uses the same PageBuilderShell as the main page and the
 * blog-post editor — only the data-loading code is different.
 *
 * DRAFT/PUBLISH SEMANTICS
 * -----------------------
 *   • `cms_pages.draft_page_rows` is the working copy (what we write to
 *     on every Save Draft).
 *   • `cms_pages.page_rows` is the live copy that the public site
 *     reads. Publish copies draft → live.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type PageRow } from "@/types/rows";
import {
  findMissingAltViolations,
  formatAltMissingMessage,
} from "@/services/contentAccessibility";
import { RESERVED_SLUGS } from "@/services/cmsPages";
import PageBuilderShell from "./PageBuilderShell";
import RevisionHistoryPanel from "./RevisionHistoryPanel";
import SchedulePublishPanel from "./SchedulePublishPanel";
import { useUnloadGuard } from "@/hooks/useUnloadGuard";

interface CmsPageRecord {
  id: string;
  slug: string;
  title: string;
  status: string;
  page_rows: PageRow[] | null;
  draft_page_rows: PageRow[] | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
}

interface Props {
  pageId: string;
  /**
   * US 3.4 — notify the parent (AdminDashboard) whenever the editor
   * renames the page so the topbar label ("Editing: <Page Name>") and
   * the cached `cmsPage` ref stay in sync without waiting for a save.
   */
  onPageInfoChange?: (info: { title: string; slug: string }) => void;
}

const CmsPageBuilder = ({ pageId, onPageInfoChange }: Props) => {
  const [record, setRecord] = useState<CmsPageRecord | null>(null);
  const [draftRows, setDraftRows] = useState<PageRow[]>([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  // US 3.4 — page-level fields live in their own state because they are
  // editable from the Inspector AND must round-trip through the topbar
  // label / public URL on save. They diff against `record` for
  // hasChanges and are written in the same UPDATE as draft_page_rows.
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("cms_pages")
      .select("id, slug, title, status, page_rows, draft_page_rows, meta_title, meta_description, og_image")
      .eq("id", pageId)
      .maybeSingle();
    if (error || !data) {
      toast.error("Failed to load page");
      return;
    }
    const rec = data as unknown as CmsPageRecord;
    setRecord(rec);
    setDraftRows((rec.draft_page_rows || rec.page_rows || []) as PageRow[]);
    setSeoTitle(rec.meta_title || "");
    setSeoDescription(rec.meta_description || "");
    setPageTitle(rec.title || "");
    setPageSlug(rec.slug || "");
    setOgImage(rec.og_image || "");
  }, [pageId]);

  useEffect(() => {
    load();
  }, [load]);

  // US 3.4 — push the live page name + slug up to the dashboard so the
  // topbar reads "Editing: <new name>" the moment the editor blurs the
  // input (no need to save first). The dashboard owns its `cmsPage` ref
  // and is responsible for stitching this back into its state.
  useEffect(() => {
    if (!record) return;
    onPageInfoChange?.({ title: pageTitle, slug: pageSlug });
  }, [pageTitle, pageSlug, record, onPageInfoChange]);

  const initialSnapshot = useMemo(() => {
    if (!record) return "";
    return JSON.stringify({
      rows: record.draft_page_rows || record.page_rows || [],
      meta_title: record.meta_title || "",
      meta_description: record.meta_description || "",
      title: record.title || "",
      slug: record.slug || "",
      og_image: record.og_image || "",
    });
  }, [record]);

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        rows: draftRows,
        meta_title: seoTitle,
        meta_description: seoDescription,
        title: pageTitle,
        slug: pageSlug,
        og_image: ogImage,
      }),
    [draftRows, seoTitle, seoDescription, pageTitle, pageSlug, ogImage],
  );

  const hasChanges = !!record && initialSnapshot !== currentSnapshot;

  // Debug Story 4.2 — block tab close / reload while the local draft
  // hasn't been pushed to the database yet.
  useUnloadGuard(hasChanges);

  /**
   * Validate the slug before any DB write. We refuse to persist:
   *   • empty strings (would orphan the page from the public router)
   *   • reserved slugs that collide with built-in routes (`admin`,
   *     `blog`, etc.) — see services/cmsPages.RESERVED_SLUGS
   *   • slugs already taken by another row in cms_pages
   * Returns null when the slug is OK to save.
   */
  const validateSlug = useCallback(async (): Promise<string | null> => {
    const trimmed = (pageSlug || "").trim();
    if (!trimmed) return "Slug cannot be empty.";
    if (RESERVED_SLUGS.includes(trimmed)) return `"${trimmed}" is a reserved slug.`;
    if (!record) return null;
    if (trimmed === record.slug) return null;
    const { data, error } = await supabase
      .from("cms_pages")
      .select("id")
      .eq("slug", trimmed)
      .neq("id", record.id)
      .maybeSingle();
    if (error) return null; // network blip — let the UPDATE surface it.
    if (data) return `Slug "${trimmed}" is already taken.`;
    return null;
  }, [pageSlug, record]);

  const onSaveDraft = useCallback(async () => {
    if (!record) return;
    const slugError = await validateSlug();
    if (slugError) {
      toast.error(slugError);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("cms_pages")
      .update({
        draft_page_rows: draftRows as any,
        meta_title: seoTitle,
        meta_description: seoDescription,
        title: pageTitle,
        slug: pageSlug,
        og_image: ogImage || null,
      } as any)
      .eq("id", record.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Draft saved");
      // Refresh the snapshot so hasChanges resets.
      setRecord({
        ...record,
        draft_page_rows: draftRows,
        meta_title: seoTitle,
        meta_description: seoDescription,
        title: pageTitle,
        slug: pageSlug,
        og_image: ogImage,
      });
    }
    setSaving(false);
  }, [record, draftRows, seoTitle, seoDescription, pageTitle, pageSlug, ogImage, validateSlug]);

  const onPublish = useCallback(async () => {
    if (!record) return;

    // EPIC 13 / US 13.1 — block publish on missing alt text.
    const violations = findMissingAltViolations(draftRows);
    const message = formatAltMissingMessage(violations);
    if (message) {
      toast.error(message, {
        description: violations
          .map((v) => `• ${v.label} — “${v.stripTitle}”`)
          .join("\n"),
      });
      return;
    }

    const slugError = await validateSlug();
    if (slugError) {
      toast.error(slugError);
      return;
    }

    setPublishing(true);
    const { error } = await supabase
      .from("cms_pages")
      .update({
        page_rows: draftRows as any,
        draft_page_rows: draftRows as any,
        meta_title: seoTitle,
        meta_description: seoDescription,
        title: pageTitle,
        slug: pageSlug,
        og_image: ogImage || null,
        status: "published",
      } as any)
      .eq("id", record.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Published");
      setRecord({
        ...record,
        page_rows: draftRows,
        draft_page_rows: draftRows,
        meta_title: seoTitle,
        meta_description: seoDescription,
        title: pageTitle,
        slug: pageSlug,
        og_image: ogImage,
        status: "published",
      });
    }
    setPublishing(false);
  }, [record, draftRows, seoTitle, seoDescription, pageTitle, pageSlug, ogImage, validateSlug]);

  const onPreview = useCallback(() => {
    if (!record) return;
    // We use the in-memory draft slug (could differ from saved). After
    // saveDraft completes the route below resolves to the new slug.
    onSaveDraft().then(() => window.open(`/${pageSlug || record.slug}?preview=1`, "_blank"));
  }, [record, onSaveDraft, pageSlug]);

  if (!record) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground font-body text-xs">
        Loading page…
      </div>
    );
  }

  return (
    <PageBuilderShell
      title={pageTitle || pageSlug || record.slug}
      pageRows={draftRows}
      onRowsChange={setDraftRows}
      seoMetaTitle={seoTitle}
      seoMetaDescription={seoDescription}
      onSeoTitleChange={setSeoTitle}
      onSeoDescriptionChange={setSeoDescription}
      pageName={pageTitle}
      onPageNameChange={setPageTitle}
      pageSlug={pageSlug}
      onPageSlugChange={setPageSlug}
      ogImage={ogImage}
      onOgImageChange={setOgImage}
      onSaveDraft={onSaveDraft}
      onPublish={onPublish}
      onPreview={onPreview}
      saving={saving}
      publishing={publishing}
      hasChanges={hasChanges}
      schedulePanel={
        <SchedulePublishPanel
          entityType="cms_pages"
          entityId={record.id}
          entityLabel={pageTitle || record.slug}
          hasUnsavedChanges={hasChanges}
        />
      }
      inspectorFooter={
        <RevisionHistoryPanel
          entityType="cms_page"
          entityRef={record.id}
          onRestored={load}
        />
      }
    />
  );
};

export default CmsPageBuilder;
