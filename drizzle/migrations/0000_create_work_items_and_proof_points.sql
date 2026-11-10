-- Portfolio groundwork (redesign spec §5.1): work_items + proof_points.
-- Both tables are created EMPTY — no seeds. RLS mirrors blog_posts:
-- visitors read published/approved rows only; all writes need is_admin().

CREATE TABLE public.proof_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  source_note text NOT NULL DEFAULT '', -- admin-only provenance note
  approved boolean NOT NULL DEFAULT false,
  pillars text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.proof_points TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proof_points TO authenticated;
GRANT ALL ON public.proof_points TO service_role;

ALTER TABLE public.proof_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read approved proof points"
  ON public.proof_points FOR SELECT TO anon
  USING (approved = true);
CREATE POLICY "Authenticated can read approved proof points"
  ON public.proof_points FOR SELECT TO authenticated
  USING (approved = true);
CREATE POLICY "Admins can read all proof points"
  ON public.proof_points FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert proof points"
  ON public.proof_points FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update proof points"
  ON public.proof_points FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can delete proof points"
  ON public.proof_points FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE TABLE public.work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'case' CHECK (type IN ('case', 'artefact', 'playbook')),
  pillar text NOT NULL DEFAULT 'ops' CHECK (pillar IN ('ic', 'ex', 'ops', 'hrbp', 'pay', 'mgr')),
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 72),
  summary text NOT NULL DEFAULT '' CHECK (char_length(summary) <= 140),
  metric text NOT NULL DEFAULT '',
  metric_label text NOT NULL DEFAULT '',
  proof_point_id uuid REFERENCES public.proof_points(id) ON DELETE SET NULL,
  card_style text NOT NULL DEFAULT 'photo' CHECK (card_style IN ('photo', 'number', 'dark', 'quote')),
  pull_line text NOT NULL DEFAULT '',
  honesty_label text NOT NULL DEFAULT '',
  role_title text NOT NULL DEFAULT '',
  year text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  cover_image text NOT NULL DEFAULT '',
  cover_image_alt text NOT NULL DEFAULT '',
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  link_out text NOT NULL DEFAULT '',
  has_case_study boolean NOT NULL DEFAULT false,
  case_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  draft_case_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  case_proof_ids uuid[] NOT NULL DEFAULT '{}',
  featured_home boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  publish_at timestamptz,
  expiry_at timestamptz,
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  og_image text NOT NULL DEFAULT '',
  ai_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_items_gallery_max_10 CHECK (jsonb_typeof(gallery) = 'array' AND jsonb_array_length(gallery) <= 10)
);

CREATE INDEX work_items_status_sort ON public.work_items (status, sort_order);
CREATE INDEX work_items_pillar ON public.work_items (pillar);

GRANT SELECT ON public.work_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_items TO authenticated;
GRANT ALL ON public.work_items TO service_role;

ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read published work items"
  ON public.work_items FOR SELECT TO anon
  USING (status = 'published');
CREATE POLICY "Authenticated can read published work items"
  ON public.work_items FOR SELECT TO authenticated
  USING (status = 'published');
CREATE POLICY "Admins can read all work items"
  ON public.work_items FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert work items"
  ON public.work_items FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update work items"
  ON public.work_items FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can delete work items"
  ON public.work_items FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- Scheduled publishing: work_items join the same promoter as cms_pages
-- and blog_posts (publish_at goes live, expiry_at reverts to draft).
CREATE OR REPLACE FUNCTION public.run_scheduled_publishing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sc_pub  integer := 0;
  sc_exp  integer := 0;
  cms_pub integer := 0;
  cms_exp integer := 0;
  bp_pub  integer := 0;
  bp_exp  integer := 0;
  wi_pub  integer := 0;
  wi_exp  integer := 0;
BEGIN
  -- ── site_content ────────────────────────────────────────
  WITH due AS (
    SELECT section_key, COALESCE(draft_content, content) AS payload
      FROM public.site_content
     WHERE publish_at IS NOT NULL AND publish_at <= now()
  ), upd AS (
    UPDATE public.site_content sc
       SET content       = d.payload,
           draft_content = d.payload,
           publish_at    = NULL,
           updated_at    = now()
      FROM due d
     WHERE sc.section_key = d.section_key
    RETURNING 1
  )
  SELECT COUNT(*) INTO sc_pub FROM upd;

  WITH upd AS (
    UPDATE public.site_content
       SET content    = '{}'::jsonb,
           expiry_at  = NULL,
           updated_at = now()
     WHERE expiry_at IS NOT NULL AND expiry_at <= now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO sc_exp FROM upd;

  -- ── cms_pages ───────────────────────────────────────────
  WITH due AS (
    SELECT id, COALESCE(draft_page_rows, page_rows) AS payload
      FROM public.cms_pages
     WHERE publish_at IS NOT NULL AND publish_at <= now()
  ), upd AS (
    UPDATE public.cms_pages cp
       SET page_rows       = d.payload,
           draft_page_rows = d.payload,
           status          = 'published',
           publish_at      = NULL,
           updated_at      = now()
      FROM due d
     WHERE cp.id = d.id
    RETURNING 1
  )
  SELECT COUNT(*) INTO cms_pub FROM upd;

  WITH upd AS (
    UPDATE public.cms_pages
       SET status     = 'draft',
           expiry_at  = NULL,
           updated_at = now()
     WHERE expiry_at IS NOT NULL AND expiry_at <= now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO cms_exp FROM upd;

  -- ── blog_posts ──────────────────────────────────────────
  WITH due AS (
    SELECT id, COALESCE(draft_page_rows, page_rows) AS payload
      FROM public.blog_posts
     WHERE publish_at IS NOT NULL AND publish_at <= now()
  ), upd AS (
    UPDATE public.blog_posts bp
       SET page_rows       = d.payload,
           draft_page_rows = d.payload,
           status          = 'published',
           published_at    = COALESCE(bp.published_at, now()),
           publish_at      = NULL,
           updated_at      = now()
      FROM due d
     WHERE bp.id = d.id
    RETURNING 1
  )
  SELECT COUNT(*) INTO bp_pub FROM upd;

  WITH upd AS (
    UPDATE public.blog_posts
       SET status     = 'draft',
           expiry_at  = NULL,
           updated_at = now()
     WHERE expiry_at IS NOT NULL AND expiry_at <= now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO bp_exp FROM upd;

  -- ── work_items ──────────────────────────────────────────
  WITH due AS (
    SELECT id, COALESCE(draft_case_rows, case_rows) AS payload
      FROM public.work_items
     WHERE publish_at IS NOT NULL AND publish_at <= now()
  ), upd AS (
    UPDATE public.work_items wi
       SET case_rows       = d.payload,
           draft_case_rows = d.payload,
           status          = 'published',
           published_at    = COALESCE(wi.published_at, now()),
           publish_at      = NULL,
           updated_at      = now()
      FROM due d
     WHERE wi.id = d.id
    RETURNING 1
  )
  SELECT COUNT(*) INTO wi_pub FROM upd;

  WITH upd AS (
    UPDATE public.work_items
       SET status     = 'draft',
           expiry_at  = NULL,
           updated_at = now()
     WHERE expiry_at IS NOT NULL AND expiry_at <= now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO wi_exp FROM upd;

  RETURN jsonb_build_object(
    'site_content', jsonb_build_object('published', sc_pub,  'expired', sc_exp),
    'cms_pages',    jsonb_build_object('published', cms_pub, 'expired', cms_exp),
    'blog_posts',   jsonb_build_object('published', bp_pub,  'expired', bp_exp),
    'work_items',   jsonb_build_object('published', wi_pub,  'expired', wi_exp),
    'ran_at', now()
  );
END;
$function$;