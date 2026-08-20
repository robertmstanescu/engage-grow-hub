-- Row snippets — reusable page-builder rows saved by name (like WP
-- Gutenberg's "unsynced" reusable blocks). CLONE-ON-INSERT: inserting a
-- snippet deep-clones the stored row with brand-new ids, so pages never
-- share mutable state — editing one page's copy never affects another
-- (unlike global_widgets, which is a live-synced single-widget block).
-- Admin-only: no public SELECT policy needed. Snippets are resolved
-- entirely inside the admin builder; the public site never reads this
-- table.
CREATE TABLE public.row_snippets (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  row_data    jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_row_snippets_updated_at ON public.row_snippets(updated_at DESC);

ALTER TABLE public.row_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage row snippets"
  ON public.row_snippets
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_row_snippets_updated_at
  BEFORE UPDATE ON public.row_snippets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
