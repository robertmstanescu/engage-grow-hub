ALTER TABLE public.blog_posts ADD COLUMN cover_image text DEFAULT null;

CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site content"
  ON public.site_content FOR SELECT TO public
  USING (true);

CREATE POLICY "Authenticated users can update site content"
  ON public.site_content FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can insert site content"
  ON public.site_content FOR INSERT TO authenticated
  WITH CHECK (true);

-- Seed default content
INSERT INTO public.site_content (section_key, content) VALUES
('hero', '{"label":"What we do","title_line1":"Your organisation has","title_accent":"vampires.","title_line2":"We bring the coffin.","body":"Dead meetings. Blood-sucking cultures. Communications that say everything while meaning nothing. We bury all of it — and build something with an actual pulse in its place."}'::jsonb),
('intro', '{"text":"We work across two disciplines: <strong>Internal Communications</strong> and <strong>Employee Experience</strong>. Every engagement starts with the same question — where is the life being drained? — and ends with something that actually works."}'::jsonb),
('vows', '{"title_line1":"Before we shake hands,","title_line2":"here is what we vow.","cards":[{"title":"Precision over pomp","body":"Our reports are as clear as a glass prism and as sharp as a stake. No buzzwords. No padding. No synergy."},{"title":"The human trace","body":"Behind every strategy is a handwritten insight. Your people are not capital. They are the life-force."},{"title":"Expansive horizons","body":"We don''t just fix the room. We remove the ceiling. Every engagement is a door to something bigger."}]}'::jsonb),
('contact', '{"title_line1":"Not sure where to start?","title_line2":"Lift the lid first.","body":"Book a free 30-minute consultation. We''ll identify your biggest vampire moment and tell you honestly whether we''re the right fit to bury it."}'::jsonb),
('pillar_comms', '{"pillar_number":"Pillar 01","title":"Internal Communications","description":"Most internal comms is noise dressed up as signal. We help you cut through it — designing communication systems that actually reach people, move them, and mean something."}'::jsonb),
('pillar_ex', '{"pillar_number":"Pillar 02","title":"Employee Experience","description":"The modern workplace is haunted by zombie journeys — onboarding processes that disappear after week one, surveys nobody acts on, and employees who feel invisible by month three."}'::jsonb);