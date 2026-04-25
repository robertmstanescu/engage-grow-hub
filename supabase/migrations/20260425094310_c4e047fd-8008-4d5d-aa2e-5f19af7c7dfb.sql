-- Global Widgets — reusable "Global Blocks" library (US 8.1).
-- A global widget is a widget configuration saved once and referenced
-- by many pages. When the global widget changes, every page that
-- references it picks up the new content automatically (single source
-- of truth — the same model WP Gutenberg's Reusable Blocks uses).
CREATE TABLE public.global_widgets (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  type        text        NOT NULL,
  data        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_global_widgets_type ON public.global_widgets(type);
CREATE INDEX idx_global_widgets_updated_at ON public.global_widgets(updated_at DESC);

-- RLS — public can READ (so the frontend can resolve references on
-- anonymously-rendered pages) but only admins can mutate.
ALTER TABLE public.global_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read global widgets"
  ON public.global_widgets
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage global widgets"
  ON public.global_widgets
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Reuse the existing timestamp helper from public schema.
CREATE TRIGGER update_global_widgets_updated_at
  BEFORE UPDATE ON public.global_widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();