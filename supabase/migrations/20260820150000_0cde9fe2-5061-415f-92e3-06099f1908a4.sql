-- Redirects — maps an old public path to a new target so renaming or
-- deleting a CMS page / blog post never silently 404s a live URL.
-- Modeled after WordPress's "Redirection" plugin. Rows are auto-created
-- on slug rename/delete (source='auto'); admins can also add fully
-- manual rows (source='manual') from the Redirects admin panel.
CREATE TABLE public.redirects (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_path   text        NOT NULL,
  to_path     text        NOT NULL,
  status_code integer     NOT NULL DEFAULT 301,
  source      text        NOT NULL DEFAULT 'manual' CHECK (source IN ('auto', 'manual')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT redirects_from_path_unique UNIQUE (from_path)
);

CREATE INDEX idx_redirects_from_path ON public.redirects(from_path);

-- RLS — public must be able to READ: the lookup runs from an anonymous
-- visitor's browser (NotFound.tsx / BlogPost.tsx render on the public
-- site, no admin session involved). Only admins can write.
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read redirects"
  ON public.redirects
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage redirects"
  ON public.redirects
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_redirects_updated_at
  BEFORE UPDATE ON public.redirects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
