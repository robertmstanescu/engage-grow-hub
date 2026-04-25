/**
 * BlogPostBuilder — page-builder adapter for the `blog_posts` table.
 *
 * BACKWARD COMPAT WITH LEGACY HTML POSTS
 * --------------------------------------
 * The `blog_posts.content` column (rich-text HTML) is preserved. When a
 * post that has NO `page_rows` (or empty rows) is opened here, we seed
 * the builder with a single "text" widget pre-filled with that HTML so
 * editors can immediately start composing visually. Saving writes the
 * widget rows to `draft_page_rows`; the legacy `content` column is left
 * intact until publish.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  generateRowId,
  DEFAULT_ROW_LAYOUT,
  type PageRow,
} from "@/types/rows";
import PageBuilderShell from "./PageBuilderShell";
import RevisionHistoryPanel from "./RevisionHistoryPanel";

interface BlogPostRecord {
  id: string;
  slug: string;
  title: string;
  status: string;
  content: string;
  page_rows: PageRow[] | null;
  draft_page_rows: PageRow[] | null;
  meta_title: string | null;
  meta_description: string | null;
}

interface Props {
  postId: string;
}

/**
 * Build a starter row set from the legacy `content` HTML so editors
 * never see an empty canvas when migrating an existing post.
 */
const seedRowsFromHtml = (html: string): PageRow[] => {
  const safe = (html || "").trim();
  if (!safe) return [];
  return [
    {
      id: generateRowId(),
      type: "text",
      strip_title: "Body",
      bg_color: "#FFFFFF",
      content: { body: safe },
      layout: { ...DEFAULT_ROW_LAYOUT },
    } as PageRow,
  ];
};

const BlogPostBuilder = ({ postId }: Props) => {
  const [record, setRecord] = useState<BlogPostRecord | null>(null);
  const [draftRows, setDraftRows] = useState<PageRow[]>([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, slug, title, status, content, page_rows, draft_page_rows, meta_title, meta_description")
      .eq("id", postId)
      .maybeSingle();
    if (error || !data) {
      toast.error("Failed to load post");
      return;
    }
    const rec = data as unknown as BlogPostRecord;
    setRecord(rec);
    const existing = (rec.draft_page_rows || rec.page_rows || []) as PageRow[];
    setDraftRows(existing.length > 0 ? existing : seedRowsFromHtml(rec.content));
    setSeoTitle(rec.meta_title || "");
    setSeoDescription(rec.meta_description || "");
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const initialSnapshot = useMemo(() => {
    if (!record) return "";
    const baseRows = (record.draft_page_rows || record.page_rows || []) as PageRow[];
    const effective = baseRows.length > 0 ? baseRows : seedRowsFromHtml(record.content);
    return JSON.stringify({
      rows: effective,
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
      .from("blog_posts")
      .update({
        draft_page_rows: draftRows as any,
        meta_title: seoTitle,
        meta_description: seoDescription,
      } as any)
      .eq("id", record.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Draft saved");
      setRecord({ ...record, draft_page_rows: draftRows, meta_title: seoTitle, meta_description: seoDescription });
    }
    setSaving(false);
  }, [record, draftRows, seoTitle, seoDescription]);

  const onPublish = useCallback(async () => {
    if (!record) return;
    setPublishing(true);
    const { error } = await supabase
      .from("blog_posts")
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
    onSaveDraft().then(() => window.open(`/blog/${record.slug}?preview=1`, "_blank"));
  }, [record, onSaveDraft]);

  if (!record) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground font-body text-xs">
        Loading post…
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
      inspectorFooter={
        <RevisionHistoryPanel
          entityType="blog_post"
          entityRef={record.id}
          onRestored={load}
        />
      }
    />
  );
};

export default BlogPostBuilder;
