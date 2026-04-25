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
import { type PageRow, normalizeRowsToV3 } from "@/types/rows";
import {
  findMissingAltViolations,
  formatAltMissingMessage,
} from "@/services/contentAccessibility";
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
}

interface Props {
  pageId: string;
}

const CmsPageBuilder = ({ pageId }: Props) => {
  const [record, setRecord] = useState<CmsPageRecord | null>(null);
  const [draftRows, setDraftRows] = useState<PageRow[]>([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  // US 2.3 — Page identity (title + slug) is now edited in the Left
  // Navigator. We mirror them as local state so users can type freely
  // and Save Draft / Publish persists the change.
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("cms_pages")
      .select("id, slug, title, status, page_rows, draft_page_rows, meta_title, meta_description")
      .eq("id", pageId)
      .maybeSingle();
    if (error || !data) {
      toast.error("Failed to load page");
      return;
    }
    const rec = data as unknown as CmsPageRecord;
    setRecord(rec);
    // US 2.2 — Normalize to v3 on read so the builder + inspector see
    // the Atomic Node Tree exclusively.
    setDraftRows(normalizeRowsToV3(rec.draft_page_rows || rec.page_rows || []) as unknown as PageRow[]);
    setSeoTitle(rec.meta_title || "");
    setSeoDescription(rec.meta_description || "");
    setPageTitle(rec.title || "");
    setPageSlug(rec.slug || "");
  }, [pageId]);

  useEffect(() => {
    load();
  }, [load]);

  const initialSnapshot = useMemo(() => {
    if (!record) return "";
    return JSON.stringify({
      rows: record.draft_page_rows || record.page_rows || [],
      meta_title: record.meta_title || "",
      meta_description: record.meta_description || "",
      title: record.title || "",
      slug: record.slug || "",
    });
  }, [record]);

  const currentSnapshot = useMemo(
    () => JSON.stringify({
      rows: draftRows,
      meta_title: seoTitle,
      meta_description: seoDescription,
      title: pageTitle,
      slug: pageSlug,
    }),
    [draftRows, seoTitle, seoDescription, pageTitle, pageSlug],
  );

  const hasChanges = !!record && initialSnapshot !== currentSnapshot;

  // Debug Story 4.2 — block tab close / reload while the local draft
  // hasn't been pushed to the database yet.
  useUnloadGuard(hasChanges);

  /** US 2.3 — Slug uniqueness guard. The slug is the route, so two CMS
   *  pages can't share one. We check the table for collisions before
   *  writing; on conflict we surface a toast and abort the save. */
  const checkSlugAvailable = useCallback(async (): Promise<boolean> => {
    if (!record) return false;
    if ((pageSlug || "") === (record.slug || "")) return true; // unchanged
    if (!pageSlug) {
      toast.error("Page URL cannot be empty");
      return false;
    }
    const { data: clash } = await supabase
      .from("cms_pages")
      .select("id")
      .eq("slug", pageSlug)
      .neq("id", record.id)
      .maybeSingle();
    if (clash) {
      toast.error(`The URL "/${pageSlug}" is already in use by another page`);
      return false;
    }
    return true;
  }, [record, pageSlug]);

  const onSaveDraft = useCallback(async () => {
    if (!record) return;
    const slugOk = await checkSlugAvailable();
    if (!slugOk) return;
    setSaving(true);
    const { error } = await supabase
      .from("cms_pages")
      .update({
        draft_page_rows: draftRows as any,
        meta_title: seoTitle,
        meta_description: seoDescription,
        title: pageTitle,
        slug: pageSlug,
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
      });
    }
    setSaving(false);
  }, [record, draftRows, seoTitle, seoDescription, pageTitle, pageSlug, checkSlugAvailable]);

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

    const slugOk = await checkSlugAvailable();
    if (!slugOk) return;

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
        status: "published",
      });
    }
    setPublishing(false);
  }, [record, draftRows, seoTitle, seoDescription, pageTitle, pageSlug, checkSlugAvailable]);

  const onPreview = useCallback(() => {
    if (!record) return;
    // Use the latest in-memory slug — typing a new slug and hitting
    // Preview should land on the new URL once the save completes.
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
      title={pageTitle || pageSlug || "Untitled page"}
      pageTitle={pageTitle}
      onPageTitleChange={setPageTitle}
      pageSlug={pageSlug}
      onPageSlugChange={setPageSlug}
      slugEditable={true}
      slugPrefix="/"
      pageRows={draftRows}
      onRowsChange={setDraftRows}
      seoMetaTitle={seoTitle}
      seoMetaDescription={seoDescription}
      onSeoTitleChange={setSeoTitle}
      onSeoDescriptionChange={setSeoDescription}
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
          entityLabel={pageTitle || pageSlug}
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
