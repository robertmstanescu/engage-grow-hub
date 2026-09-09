import { useParams, Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/services/sanitize";
import Navbar from "@/features/site/Navbar";
import Footer from "@/features/site/Footer";
import { useTagColors } from "@/hooks/useTagColors";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import ResourceWidget from "@/features/site/ResourceWidget";
import usePageMeta from "@/hooks/usePageMeta";
import CoverFadeImage from "@/features/site/CoverFadeImage";
import MoreArticles from "@/features/site/MoreArticles";
import { resolveAuthor, type AuthorProfile } from "@/features/site/authorProfile";
import { useSiteContent } from "@/hooks/useSiteContent";
import { transformImageUrl } from "@/services/mediaOptimization";
import { useRedirectLookup } from "@/hooks/useRedirectLookup";
import { readLivePreviewState, subscribeLivePreview } from "@/services/livePreview";
// US 17.x — blog posts can now be composed with the same widget builder
// as the main page and CMS pages. When `page_rows` is non-empty, the
// post body is rendered through RowsRenderer (the public-site widget
// pipeline). When it's empty, we fall back to the legacy HTML body so
// existing posts keep working unchanged.
import { RowsRenderer } from "@/features/site/rows/PageRows";
import { ArticleContext } from "@/features/widgets/article/articleContext";
import { ensureArticleRow } from "@/features/widgets/article/postRows";
import type { PageRow } from "@/types/rows";

interface BlogArticle {
  slug: string; title: string; excerpt: string | null; published_at: string | null; content: string; category: string;
  cover_image: string | null; cover_image_alt: string | null;
  author_name: string | null; author_image: string | null; author_image_alt: string | null;
  updated_at?: string | null;
  meta_title: string | null; meta_description: string | null;
  og_image: string | null; og_image_alt: string | null; tags: string[] | null;
  lead_magnet_asset_id: string | null; lead_magnet_cover_id: string | null;
  page_rows: PageRow[] | null;
  draft_page_rows: PageRow[] | null;
}

const calculateReadTime = (content: string) => `${Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200))} min read`;
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const socialLinks = useSiteContent<Record<string, string>>("social_links", {});
  /* The whole author — name, photo and personal links — comes from the
     Profile screen in the admin, with the post's own stored author as
     the fallback and the company page as the fallback for LinkedIn. */
  const authorProfile = useSiteContent<AuthorProfile>("author_profile", {});
  const authorLinkedin = ((authorProfile.linkedin || "").trim() || (socialLinks.linkedin || "").trim());
  const author = resolveAuthor(authorProfile, article);
  const [loading, setLoading] = useState(true);
  const { getTagColors } = useTagColors();
  // BlogPost has its own bespoke "not found" branch below — it does NOT
  // render <NotFound/>, so it needs its own redirect check (NotFound.tsx's
  // check doesn't cover this route).
  const checkingRedirect = useRedirectLookup();
  const isPreview = searchParams.get("preview") === "draft";
  const previewKey = searchParams.get("previewKey") || slug || "";

  const pageTitle = article?.meta_title || article?.title || undefined;
  const pageDesc = article ? (article.meta_description || article.content.replace(/<[^>]*>/g, " ").slice(0, 160)) : undefined;
  const pageImage = article?.og_image || article?.cover_image || undefined;

  usePageMeta({
    title: pageTitle,
    description: pageDesc,
    ogImage: pageImage,
    ogType: "article",
    breadcrumbs: article
      ? [{ name: "Home", path: "/" }, { name: "Blog", path: "/blog/" }, { name: article.title }]
      : undefined,
  });

  // Inject Article JSON-LD for rich results (headline, datePublished, author, image).
  useEffect(() => {
    if (!article || typeof document === "undefined") return;
    const id = "mc-jsonld-article";
    document.getElementById(id)?.remove();
    const origin = window.location.origin;
    const linkedin = authorLinkedin;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      ...(article.published_at ? { datePublished: article.published_at } : {}),
      ...(article.updated_at ? { dateModified: article.updated_at } : {}),
      ...(author.name ? { author: { "@type": "Person", name: author.name, url: `${origin}/p/about-us/`, ...(linkedin ? { sameAs: [linkedin] } : {}) } } : {}),
      publisher: { "@type": "Organization", name: "The Magic Coffin", url: origin },
      ...(pageImage ? { image: pageImage } : {}),
      ...(pageDesc ? { description: pageDesc } : {}),
      mainEntityOfPage: `${window.location.origin}/blog/${article.slug}/`,
    };
    const s = document.createElement("script");
    s.id = id;
    s.type = "application/ld+json";
    s.text = JSON.stringify(jsonLd);
    document.head.appendChild(s);
    return () => { document.getElementById(id)?.remove(); };
  }, [article, pageImage, pageDesc, authorLinkedin, author.name]);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) { setLoading(false); return; }

      const syncPreview = (state = readLivePreviewState()) => {
        if (!isPreview) return;
        const draft = state.blogPosts[previewKey] || state.blogPosts[slug];
        if (draft) setArticle(draft as BlogArticle);
      };

      syncPreview();

      // `draft_page_rows` is admin-only at the column level, so anonymous
      // readers never request it.
      const baseColumns =
        "slug, title, excerpt, published_at, content, category, cover_image, cover_image_alt, author_name, author_image, author_image_alt, meta_title, meta_description, og_image, og_image_alt, tags, lead_magnet_asset_id, lead_magnet_cover_id, page_rows, updated_at";
      let query = supabase
        .from("blog_posts")
        .select(isPreview ? `${baseColumns}, draft_page_rows` : baseColumns)
        .eq("slug", slug);


      if (!isPreview) query = query.eq("status", "published");

      const { data } = await query.maybeSingle();
      setArticle((current) => current || (data as unknown as BlogArticle | null));
      setLoading(false);

      return isPreview ? subscribeLivePreview(syncPreview) : undefined;
    };

    let cleanup: (() => void) | undefined;
    fetchArticle().then((fn) => { if (fn) cleanup = fn; });
    return () => cleanup?.();
  }, [slug, isPreview, previewKey]);

  if (loading) {
    return (
      <div className="min-h-screen page-shell">
        <Navbar />
        {/* Reserve the article's room so the footer does not jump when the text arrives (layout shift). */}
        <div className="pt-36 pb-20 text-center px-8" style={{ minHeight: "85vh" }}><p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</p></div>
        <Footer />
      </div>
    );
  }

  if (!article) {
    if (checkingRedirect) return null;
    return (
      <div className="min-h-screen page-shell">
        <Navbar />
        <div className="pt-36 pb-20 text-center px-8">
          <h1 className="font-display text-2xl font-bold mb-4" style={{ color: "hsl(var(--foreground))" }}>Article not found</h1>
          <Link to="/blog/" className="font-body text-sm underline" style={{ color: "hsl(var(--accent))" }}>← Back to all blogs &amp; insights</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen page-shell">
      <Navbar />
      <article className={article.cover_image ? "" : "pt-24 md:pt-28"}>
        <div className="relative">
          {article.cover_image && (
            <CoverFadeImage
              src={article.cover_image}
              alt={article.cover_image_alt || `${article.title} — cover image`}
              aspectRatio={16 / 9}
              className="max-h-[70vh]"
            />
          )}


          <header className={`relative z-10 px-8 ${article.cover_image ? "-mt-24 md:-mt-32 pb-6" : "pt-10 pb-12"}`}>
            <div className="relative z-10 max-w-[1100px] mx-auto lg:pr-[352px]">
              <Link to="/blog/" className="inline-flex items-center gap-1.5 font-body text-xs uppercase tracking-[0.15em] mb-4 transition-opacity hover:opacity-70" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
                <ArrowLeft size={14} /> All blogs &amp; insights
              </Link>
              <div>
                <h1 className="font-display text-2xl md:text-4xl lg:text-5xl font-black leading-tight" style={{ color: "hsl(var(--foreground))" }}>{article.title}</h1>

                {/* The author is shown ONCE, in the block under the
                    article (owner's decision); the line here carries the
                    date and the reading time only. */}
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className="font-body text-sm" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
                    {article.published_at ? formatDate(article.published_at) : ""}
                    {article.published_at && <span style={{ color: "hsl(var(--foreground) / 0.3)" }}> · </span>}
                    {calculateReadTime(article.content)}
                  </span>
                </div>

                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {article.tags.map((tag) => {
                      const tc = getTagColors(tag);
                      return (
                        <span
                          key={tag}
                          className="font-body text-[10px] tracking-[0.12em] uppercase px-2.5 py-1 rounded-full font-medium"
                          style={{ backgroundColor: tc.bgColor, color: tc.textColor }}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                )}

                {article.excerpt && (
                  <p className="font-body text-base md:text-lg leading-relaxed mt-3" style={{ color: "hsl(var(--foreground) / 0.72)" }}>
                    {article.excerpt}
                  </p>
                )}
              </div>
            </div>
          </header>
        </div>

        <div className="section-light pt-2 pb-16 px-8">
          <div className="max-w-[1100px] mx-auto lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-[52px] lg:items-start">
          <div className="min-w-0">
          {/* The article is the post. Rows are extras around it: a post
              with no rows renders exactly one article block, and any rows
              the builder saved render with the article block among them.
              The words always come from `content`, never from a copy. */}
          <ArticleContext.Provider value={{ html: sanitizeHtml(article.content) }}>
            <div data-article-rows>
              <RowsRenderer
                rows={ensureArticleRow(((isPreview && article.draft_page_rows) || article.page_rows || []) as PageRow[], 0, article.content)}
                promoteHeading={false}
              />
            </div>
          </ArticleContext.Provider>
          {article.lead_magnet_asset_id && (
            <div className="w-full mt-12">
              <ResourceWidget
                resourceAssetId={article.lead_magnet_asset_id}
                coverAssetId={article.lead_magnet_cover_id}
              />
            </div>
          )}

          {author.name && (
            <div className="w-full mt-10 pt-6 flex items-center gap-4" style={{ borderTop: "1px solid hsl(var(--light-fg) / 0.1)" }} data-author-block>
              {author.photo && (
                <img src={transformImageUrl(author.photo, { width: 112, aspectRatio: 1 })} alt={author.photoAlt} width={56} height={56} loading="lazy" decoding="async" className="w-14 h-14 rounded-full object-cover" style={{ border: "var(--outline-ink-border)" }} />
              )}
              <div className="min-w-0 font-body">
                <p className="font-medium" style={{ color: "hsl(var(--foreground))" }}>{author.name}</p>
                <p className="text-sm" style={{ color: "hsl(var(--foreground) / 0.6)" }}>
                  Founder, The Magic Coffin ·{" "}
                  <Link to="/p/about-us/" className="underline underline-offset-4 hover:opacity-70">About</Link>
                  {authorLinkedin && (<>{" · "}<a href={authorLinkedin} target="_blank" rel="noreferrer me" className="underline underline-offset-4 hover:opacity-70">LinkedIn</a></>)}
                </p>
              </div>
            </div>
          )}

          <div className="w-full mt-10 pt-8 flex flex-col items-start" style={{ borderTop: "1px solid hsl(var(--light-fg) / 0.1)" }}>
            <SubscribeWidget />
          </div>

          <MoreArticles currentSlug={article.slug} category={article.category} className="lg:hidden w-full mt-10 pt-8" />

          <div className="w-full mt-8 pt-8" style={{ borderTop: "1px solid hsl(var(--light-fg) / 0.1)" }}>
            <Link to="/blog/" className="inline-flex items-center gap-1.5 font-body text-sm font-medium transition-opacity hover:opacity-70" style={{ color: "hsl(var(--primary))" }}>
              <ArrowLeft size={16} /> Back to all blogs &amp; insights
            </Link>
          </div>
          </div>
          <aside className="hidden lg:block lg:sticky lg:top-28 pt-2">
            <MoreArticles currentSlug={article.slug} category={article.category} />
          </aside>
          </div>
        </div>
      </article>
      <Footer breadcrumbTrail={[{ name: "Home", path: "/" }, { name: "Blog", path: "/blog/" }, { name: article.title }]} />
    </div>
  );
};

export default BlogPost;
