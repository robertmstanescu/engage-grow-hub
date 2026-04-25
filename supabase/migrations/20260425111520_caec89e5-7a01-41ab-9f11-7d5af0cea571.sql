-- ════════════════════════════════════════════════════════════════════
-- EPIC 10 / US 10.2 — Scheduled Publishing
-- ════════════════════════════════════════════════════════════════════
-- Adds publish_at + expiry_at to every schedulable entity:
--   site_content, cms_pages, blog_posts, email_campaigns
--
-- A cron-driven edge function ("publish-scheduled") will call the
-- public.run_scheduled_publishing() procedure every 5 minutes to:
--   • promote drafts whose publish_at <= now()
--   • unpublish entities whose expiry_at <= now()
-- ════════════════════════════════════════════════════════════════════

-- 1) Schema: timestamp columns + indexes
ALTER TABLE public.site_content
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS expiry_at  timestamptz;

ALTER TABLE public.cms_pages
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS expiry_at  timestamptz;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS expiry_at  timestamptz;

ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,  -- "send_at"
  ADD COLUMN IF NOT EXISTS expiry_at  timestamptz;  -- unused for emails but kept consistent

-- Partial indexes — only rows actually scheduled. Tiny + fast.
CREATE INDEX IF NOT EXISTS idx_site_content_publish_at
  ON public.site_content (publish_at) WHERE publish_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_site_content_expiry_at
  ON public.site_content (expiry_at) WHERE expiry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cms_pages_publish_at
  ON public.cms_pages (publish_at) WHERE publish_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cms_pages_expiry_at
  ON public.cms_pages (expiry_at) WHERE expiry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blog_posts_publish_at
  ON public.blog_posts (publish_at) WHERE publish_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_expiry_at
  ON public.blog_posts (expiry_at) WHERE expiry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_campaigns_publish_at
  ON public.email_campaigns (publish_at) WHERE publish_at IS NOT NULL;

-- 2) Promoter procedure
-- Called by the edge function every 5 min. Idempotent — re-running is safe.
-- Returns a small JSON summary so the caller (and admins) can see what happened.
CREATE OR REPLACE FUNCTION public.run_scheduled_publishing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sc_pub  integer := 0;
  sc_exp  integer := 0;
  cms_pub integer := 0;
  cms_exp integer := 0;
  bp_pub  integer := 0;
  bp_exp  integer := 0;
BEGIN
  -- ── site_content ────────────────────────────────────────
  -- Publish: copy draft into live, clear publish_at.
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

  -- Expire: revert live to empty draft. We keep draft intact so editor
  -- can re-publish later if needed; just blank the live `content`.
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

  -- NOTE: email_campaigns publish_at is read by the promoter but the
  -- actual send is handled by the existing email infra (separate
  -- flow). We just expose the field; sending logic stays where it is.

  RETURN jsonb_build_object(
    'site_content', jsonb_build_object('published', sc_pub,  'expired', sc_exp),
    'cms_pages',    jsonb_build_object('published', cms_pub, 'expired', cms_exp),
    'blog_posts',   jsonb_build_object('published', bp_pub,  'expired', bp_exp),
    'ran_at', now()
  );
END;
$$;