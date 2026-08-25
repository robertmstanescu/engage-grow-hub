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
import type { PageRow } from "@/types/rows";
import { generateRowId, DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import {
  findMissingAltViolations,
  formatAltMissingMessage,
} from "@/services/contentAccessibility";
import PageBuilderShell from "./PageBuilderShell";
import RevisionHistoryPanel from "./RevisionHistoryPanel";
import AdminStatusControl from "../ui/AdminStatusControl";
import { contentState, stateToStatus, type ContentState } from "../naming";
import { useUnloadGuard } from "@/hooks/useUnloadGuard";
import { confirmUnsavedExit } from "@/components/ConfirmDialog";
import { createRedirect } from "@/services/redirects";

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
  publish_at: string | null;
  expiry_at: string | null;
}

interface Props {
  postId: string;
  /** Exit the builder back to the admin dashboard (Blog Posts list). */
  onExit?: () => void;
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

const BlogPostBuilder = ({ postId, onExit }: Props) => {
  const [record, setRecord] = useState<BlogPostRecord | null>(null);
  const [draftRows, setDraftRows] = useState<PageRow[]>([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  // US 2.3 — Page identity edited in the Left Navigator.
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [visibility, setVisibility] = useState<ContentState>("draft");
  const [publishAt, setPublishAt] = useState<string | null>(null);
  const [expiryAt, setExpiryAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, slug, title, status, content, page_rows, draft_page_rows, meta_title, meta_description, publish_at, expiry_at")
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
    setPageTitle(rec.title || "");
    setPageSlug(rec.slug || "");
    setVisibility(contentState(rec.status, rec.publish_at));
    setPublishAt(rec.publish_at);
    setExpiryAt(rec.expiry_at);
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
      title: record.title || "",
      slug: record.slug || "",
      visibility: contentState(record.status, record.publish_at),
      publish_at: record.publish_at,
      expiry_at: record.expiry_at,
    });
  }, [record]);

  const currentSnapshot = useMemo(
    () => JSON.stringify({
      rows: draftRows,
      meta_title: seoTitle,
      meta_description: seoDescription,
      title: pageTitle,
      slug: pageSlug,
      visibility,
      publish_at: publishAt,
      expiry_at: expiryAt,
    }),
    [draftRows, seoTitle, seoDescription, pageTitle, pageSlug, visibility, publishAt, expiryAt],
  );

  const hasChanges = !!record && initialSnapshot !== currentSnapshot;

  // Debug Story 4.2 — block tab close / reload while the local draft
  // hasn't been pushed to the database yet.
  useUnloadGuard(hasChanges);

  /** Guard the exit with the same unsaved-changes confirm used
   *  elsewhere (Debug Story 4.1) before handing off to the dashboard's
   *  own navigation logic. */
  const handleExit = useCallback(async () => {
    if (hasChanges && !(await confirmUnsavedExit())) return;
    onExit?.();
  }, [hasChanges, onExit]);

  /** US 2.3 — Slug uniqueness guard for blog posts. */
  const checkSlugAvailable = useCallback(async (): Promise<boolean> => {
    if (!record) return false;
    if ((pageSlug || "") === (record.slug || "")) return true;
    if (!pageSlug) {
      toast.error("Post URL cannot be empty");
      return false;
    }
    const { data: clash } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", pageSlug)
      .neq("id", record.id)
      .maybeSingle();
    if (clash) {
      toast.error(`The URL "/blog/${pageSlug}" is already in use by another post`);
      return false;
    }
    return true;
  }, [record, pageSlug]);

  const onSaveDraft = useCallback(async () => {
    if (!record) return;
    const slugOk = await checkSlugAvailable();
    if (!slugOk) return;
    if (visibility === "scheduled") {
      if (!publishAt || new Date(publishAt).getTime() <= Date.now()) {
        toast.error("Choose a future date and time for this blog to go live.");
        return;
      }
      if (expiryAt && new Date(expiryAt).getTime() <= new Date(publishAt).getTime()) {
        toast.error("The stop date must be after the go-live date.");
        return;
      }
    }
    setSaving(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({
        draft_page_rows: draftRows as any,
        meta_title: seoTitle,
        meta_description: seoDescription,
        title: pageTitle,
        slug: pageSlug,
        status: stateToStatus(visibility),
        publish_at: visibility === "scheduled" ? publishAt : null,
        expiry_at: visibility === "scheduled" ? expiryAt : null,
      } as any)
      .eq("id", record.id);
    if (error) toast.error(error.message);
    else {
      toast.success(visibility === "scheduled" ? "Blog scheduled" : visibility === "live" ? "Blog saved live" : "Draft saved");
      setRecord({
        ...record,
        draft_page_rows: draftRows,
        meta_title: seoTitle,
        meta_description: seoDescription,
        title: pageTitle,
        slug: pageSlug,
        status: stateToStatus(visibility),
        publish_at: visibility === "scheduled" ? publishAt : null,
        expiry_at: visibility === "scheduled" ? expiryAt : null,
      });
    }
    setSaving(false);
  }, [record, draftRows, seoTitle, seoDescription, pageTitle, pageSlug, visibility, publishAt, expiryAt, checkSlugAvailable]);

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
      .from("blog_posts")
      .update({
        page_rows: draftRows as any,
        draft_page_rows: draftRows as any,
        meta_title: seoTitle,
        meta_description: seoDescription,
        title: pageTitle,
        slug: pageSlug,
        status: "published",
        publish_at: null,
        expiry_at: null,
      } as any)
      .eq("id", record.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Published");
      // Redirects manager — only matters if the OLD slug was already
      // live. A slug change on a post that was still a draft never had
      // a public URL to redirect from.
      if (record.status === "published" && record.slug && pageSlug !== record.slug) {
        createRedirect(`/blog/${record.slug}`, `/blog/${pageSlug}`, "auto");
      }
      setRecord({
        ...record,
        page_rows: draftRows,
        draft_page_rows: draftRows,
        meta_title: seoTitle,
        meta_description: seoDescription,
        title: pageTitle,
        slug: pageSlug,
        status: "published",
        publish_at: null,
        expiry_at: null,
      });
      setVisibility("live");
      setPublishAt(null);
      setExpiryAt(null);
    }
    setPublishing(false);
  }, [record, draftRows, seoTitle, seoDescription, pageTitle, pageSlug, checkSlugAvailable]);

  /** Revert post to draft so it leaves /blog without losing content. */
  const onUnpublish = useCallback(async () => {
    if (!record) return;
    setUnpublishing(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({ status: "draft", publish_at: null, expiry_at: null } as any)
      .eq("id", record.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Unpublished — post is no longer visible to the public");
      setRecord({ ...record, status: "draft" });
      setVisibility("draft");
      setPublishAt(null);
      setExpiryAt(null);
    }
    setUnpublishing(false);
  }, [record]);

  const onPreview = useCallback(() => {
    if (!record) return;
    onSaveDraft().then(() => window.open(`/blog/${pageSlug || record.slug}?preview=1`, "_blank"));
  }, [record, onSaveDraft, pageSlug]);

  if (!record) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground font-body text-xs">
        Loading post…
      </div>
    );
  }

  return (
    <PageBuilderShell
      title={pageTitle || pageSlug || "Untitled post"}
      onExit={onExit ? handleExit : undefined}
      pageTitle={pageTitle}
      onPageTitleChange={setPageTitle}
      pageSlug={pageSlug}
      onPageSlugChange={setPageSlug}
      slugEditable={true}
      slugPrefix="/blog/"
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
      publishStatus={record.status}
      onUnpublish={onUnpublish}
      unpublishing={unpublishing}
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
          entityType="blog_post"
          entityRef={record.id}
          onRestored={load}
        />
      }
    />
  );
};

export default BlogPostBuilder;
