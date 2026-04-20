-- ════════════════════════════════════════════════════════════════════
-- VERSION HISTORY FOR site_content
-- ════════════════════════════════════════════════════════════════════
-- Stores immutable snapshots of every section's published content so
-- admins can roll back to any prior state. v1 is seeded from the live
-- `content` column (the version visitors see right now).

CREATE TABLE public.site_content_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key  text NOT NULL,
  version      integer NOT NULL,
  content      jsonb NOT NULL,
  label        text,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  created_by   uuid,
  UNIQUE (section_key, version)
);

CREATE INDEX idx_site_content_versions_key_ver
  ON public.site_content_versions (section_key, version DESC);

ALTER TABLE public.site_content_versions ENABLE ROW LEVEL SECURITY;

-- Only admins can see history. Public site never reads this table.
CREATE POLICY "Admins can read versions"
  ON public.site_content_versions
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert versions"
  ON public.site_content_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete versions"
  ON public.site_content_versions
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ── Auto-snapshot trigger ────────────────────────────────────────────
-- Whenever site_content.content changes (i.e. someone hits Publish),
-- write a new version row. This is the back-up the user asked for.
CREATE OR REPLACE FUNCTION public.snapshot_site_content_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version integer;
BEGIN
  -- Skip if content is unchanged (e.g. only draft_content was touched).
  IF TG_OP = 'UPDATE' AND OLD.content IS NOT DISTINCT FROM NEW.content THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1
    INTO next_version
    FROM public.site_content_versions
   WHERE section_key = NEW.section_key;

  INSERT INTO public.site_content_versions
    (section_key, version, content, created_by, label)
  VALUES
    (NEW.section_key, next_version, NEW.content, auth.uid(),
     CASE WHEN TG_OP = 'INSERT' THEN 'Initial' ELSE NULL END);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_snapshot_site_content_version
  AFTER INSERT OR UPDATE OF content ON public.site_content
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_site_content_version();

-- ── Seed v1 from the CURRENT live `content` for every section ────────
INSERT INTO public.site_content_versions (section_key, version, content, label, created_at)
SELECT section_key, 1, content, 'v1 — live snapshot', now()
FROM public.site_content;

-- ── Force one source of truth: wipe all drafts ───────────────────────
-- Editor will re-open with the live version as the starting draft, so
-- there is no longer a "different in editor vs different in browser"
-- mismatch.
UPDATE public.site_content
   SET draft_content = content;

-- ── Restore RPC: copies a chosen version back into draft_content ─────
-- Admin clicks Restore → draft updates → admin reviews → admin clicks
-- Publish (existing flow) to push it to `content`. Safe by design.
CREATE OR REPLACE FUNCTION public.restore_site_content_version(
  _section_key text,
  _version     integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snapshot jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT content INTO snapshot
    FROM public.site_content_versions
   WHERE section_key = _section_key AND version = _version;

  IF snapshot IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  UPDATE public.site_content
     SET draft_content = snapshot,
         updated_at    = now()
   WHERE section_key = _section_key;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_site_content_version(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_site_content_version(text, integer) TO authenticated;