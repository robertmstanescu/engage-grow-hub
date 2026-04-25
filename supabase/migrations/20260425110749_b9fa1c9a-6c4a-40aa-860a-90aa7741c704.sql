-- ════════════════════════════════════════════════════════════════════
-- EPIC 10 / US 10.1 — Unified page_revisions
-- ════════════════════════════════════════════════════════════════════
-- One revisions table covering site_content sections, cms_pages and
-- blog_posts. Triggered ONLY on Publish (i.e. when the live `content`
-- column changes), not on every draft save.
--
-- entity_type ∈ {'site_content','cms_page','blog_post'}
-- entity_ref  = section_key (for site_content) or id::text (for the
--               other two). TEXT so we can mix UUID ids and string keys
--               in one column.
-- content     = the full JSON state that just went live.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE public.page_revisions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  text NOT NULL CHECK (entity_type IN ('site_content','cms_page','blog_post')),
  entity_ref   text NOT NULL,
  version      integer NOT NULL,
  content      jsonb NOT NULL,
  label        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid,
  UNIQUE (entity_type, entity_ref, version)
);

CREATE INDEX idx_page_revisions_entity
  ON public.page_revisions (entity_type, entity_ref, version DESC);

ALTER TABLE public.page_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read revisions"
  ON public.page_revisions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert revisions"
  ON public.page_revisions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete revisions"
  ON public.page_revisions FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Service role bypass for system writes (e.g. triggers running as definer).
CREATE POLICY "Service role manages revisions"
  ON public.page_revisions FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────────────
-- 1) Backfill from existing site_content_versions
-- ────────────────────────────────────────────────────────────────────
INSERT INTO public.page_revisions
  (entity_type, entity_ref, version, content, label, created_at, created_by)
SELECT 'site_content', section_key, version, content, label, created_at, created_by
FROM public.site_content_versions
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- 2) Generic snapshot helper used by per-table triggers
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.snapshot_page_revision(
  _entity_type text,
  _entity_ref  text,
  _content     jsonb,
  _label       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_v integer;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1
    INTO next_v
    FROM public.page_revisions
   WHERE entity_type = _entity_type AND entity_ref = _entity_ref;

  INSERT INTO public.page_revisions
    (entity_type, entity_ref, version, content, label, created_by)
  VALUES
    (_entity_type, _entity_ref, next_v, _content, _label, auth.uid());
END;
$$;

-- ────────────────────────────────────────────────────────────────────
-- 3) Per-table triggers — fire only when LIVE content changes
-- ────────────────────────────────────────────────────────────────────

-- site_content: trigger fires when `content` (live) changes
CREATE OR REPLACE FUNCTION public.trg_snapshot_site_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.content IS NOT DISTINCT FROM NEW.content THEN
    RETURN NEW;
  END IF;
  PERFORM public.snapshot_page_revision(
    'site_content',
    NEW.section_key,
    NEW.content,
    CASE WHEN TG_OP = 'INSERT' THEN 'Initial' ELSE NULL END
  );
  RETURN NEW;
END;
$$;

-- Replace the old trigger
DROP TRIGGER IF EXISTS trg_snapshot_site_content_version ON public.site_content;
CREATE TRIGGER trg_snapshot_site_content
AFTER INSERT OR UPDATE ON public.site_content
FOR EACH ROW EXECUTE FUNCTION public.trg_snapshot_site_content();

-- cms_pages: snapshot when `page_rows` (live) changes OR status flips to published
CREATE OR REPLACE FUNCTION public.trg_snapshot_cms_page()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.page_rows IS NOT DISTINCT FROM NEW.page_rows THEN
    RETURN NEW;
  END IF;
  PERFORM public.snapshot_page_revision(
    'cms_page',
    NEW.id::text,
    jsonb_build_object(
      'page_rows', NEW.page_rows,
      'meta_title', NEW.meta_title,
      'meta_description', NEW.meta_description,
      'title', NEW.title,
      'slug', NEW.slug
    ),
    CASE WHEN TG_OP = 'INSERT' THEN 'Initial' ELSE NULL END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_cms_page ON public.cms_pages;
CREATE TRIGGER trg_snapshot_cms_page
AFTER INSERT OR UPDATE ON public.cms_pages
FOR EACH ROW EXECUTE FUNCTION public.trg_snapshot_cms_page();

-- blog_posts: snapshot when `page_rows` (live) changes
CREATE OR REPLACE FUNCTION public.trg_snapshot_blog_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.page_rows IS NOT DISTINCT FROM NEW.page_rows
     AND OLD.content IS NOT DISTINCT FROM NEW.content THEN
    RETURN NEW;
  END IF;
  PERFORM public.snapshot_page_revision(
    'blog_post',
    NEW.id::text,
    jsonb_build_object(
      'page_rows', NEW.page_rows,
      'content', NEW.content,
      'title', NEW.title,
      'slug', NEW.slug,
      'meta_title', NEW.meta_title,
      'meta_description', NEW.meta_description,
      'cover_image', NEW.cover_image,
      'excerpt', NEW.excerpt
    ),
    CASE WHEN TG_OP = 'INSERT' THEN 'Initial' ELSE NULL END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_blog_post ON public.blog_posts;
CREATE TRIGGER trg_snapshot_blog_post
AFTER INSERT OR UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.trg_snapshot_blog_post();

-- ────────────────────────────────────────────────────────────────────
-- 4) Restore RPC — writes the snapshot back to the entity's DRAFT.
--    For site_content: draft_content. For cms_page/blog_post: draft_page_rows.
--    Editor must hit Publish to make it live.
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.restore_page_revision(_revision_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rev public.page_revisions%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO rev FROM public.page_revisions WHERE id = _revision_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revision not found';
  END IF;

  IF rev.entity_type = 'site_content' THEN
    UPDATE public.site_content
       SET draft_content = rev.content,
           updated_at = now()
     WHERE section_key = rev.entity_ref;

  ELSIF rev.entity_type = 'cms_page' THEN
    UPDATE public.cms_pages
       SET draft_page_rows = rev.content -> 'page_rows',
           updated_at = now()
     WHERE id = rev.entity_ref::uuid;

  ELSIF rev.entity_type = 'blog_post' THEN
    UPDATE public.blog_posts
       SET draft_page_rows = rev.content -> 'page_rows',
           updated_at = now()
     WHERE id = rev.entity_ref::uuid;

  ELSE
    RAISE EXCEPTION 'Unknown entity_type: %', rev.entity_type;
  END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────────────
-- 5) Retire old versioning system
-- ────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.restore_site_content_version(text, integer);
DROP FUNCTION IF EXISTS public.snapshot_site_content_version();
DROP TABLE IF EXISTS public.site_content_versions;