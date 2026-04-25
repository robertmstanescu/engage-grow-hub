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
import PageBuilderShell from "./PageBuilderShell";

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
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const load = async () => {
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
      setDraftRows((rec.draft_page_rows || rec.page_rows || []) as PageRow[]);
      setSeoTitle(rec.meta_title || "");
      setSeoDescription(rec.meta_description || "");
    };
    load();
  }, [pageId]);

  const initialSnapshot = useMemo(() => {
    if (!record) return "";
    return JSON.stringify({
      rows: record.draft_page_rows || record.page_rows || [],
      meta_title: record.meta_title || "",
      meta_description: record.meta_description || "",
    });
  }, [record]);

  const currentSnapshot = useMemo(
    () => JSON.stringify({ rows: draftRows, meta_title: seoTitle, meta_description: seoDescription }),
    [draftRows, seoTitle, seoDescription],
  );

  const hasChanges = !!record && initialSnapshot !== currentSnapshot;

  const onSaveDraft = useCallback(async () => {
    if (!record) return;
    setSaving(true);
    const { error } = await supabase
      .from("cms_pages")
      .update({
        draft_page_rows: draftRows as any,
        meta_title: seoTitle,
        meta_description: seoDescription,
      } as any)
      .eq("id", record.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Draft saved");
      // Refresh the snapshot so hasChanges resets.
      setRecord({ ...record, draft_page_rows: draftRows, meta_title: seoTitle, meta_description: seoDescription });
    }
    setSaving(false);
  }, [record, draftRows, seoTitle, seoDescription]);

  const onPublish = useCallback(async () => {
    if (!record) return;
    setPublishing(true);
    const { error } = await supabase
      .from("cms_pages")
      .update({
        page_rows: draftRows as any,
        draft_page_rows: draftRows as any,
        meta_title: seoTitle,
        meta_description: seoDescription,
        status: "published",
      } as any)
      .eq("id", record.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Published");
      setRecord({ ...record, page_rows: draftRows, draft_page_rows: draftRows, meta_title: seoTitle, meta_description: seoDescription, status: "published" });
    }
    setPublishing(false);
  }, [record, draftRows, seoTitle, seoDescription]);

  const onPreview = useCallback(() => {
    if (!record) return;
    onSaveDraft().then(() => window.open(`/${record.slug}?preview=1`, "_blank"));
  }, [record, onSaveDraft]);

  if (!record) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground font-body text-xs">
        Loading page…
      </div>
    );
  }

  return (
    <PageBuilderShell
      title={record.title || record.slug}
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
    />
  );
};

export default CmsPageBuilder;
