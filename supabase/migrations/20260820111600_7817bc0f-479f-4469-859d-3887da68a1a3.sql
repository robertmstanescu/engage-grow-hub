
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.blog_posts;
CREATE POLICY "Anon can read published posts"
  ON public.blog_posts FOR SELECT TO anon
  USING (status = 'published');
CREATE POLICY "Authenticated can read published posts"
  ON public.blog_posts FOR SELECT TO authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Public can read published cms pages" ON public.cms_pages;
CREATE POLICY "Anon can read published cms pages"
  ON public.cms_pages FOR SELECT TO anon
  USING (status = 'published');
CREATE POLICY "Authenticated can read published cms pages"
  ON public.cms_pages FOR SELECT TO authenticated
  USING (status = 'published');
