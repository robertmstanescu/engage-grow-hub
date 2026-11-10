import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildImageSrcSet, transformImageUrl } from "@/services/mediaOptimization";
import Navbar from "@/features/site/Navbar";
import Footer from "@/features/site/Footer";
import { useTagColors } from "@/hooks/useTagColors";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";
import type { PageRow } from "@/types/rows";
import { RowsRenderer } from "@/features/site/rows/PageRows";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  content: string;
  category: string;
  cover_image: string | null;
  cover_image_alt: string | null;
  tags: string[] | null;
}

const POSTS_PER_PAGE = 7; // one wide lead card + six grid cards

const calculateReadTime = (content: string) => {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const CategoryPill = ({ category }: { category: string }) => {
  const { getCategoryColors } = useTagColors();
  const catColors = getCategoryColors(category);
  return (
    <span
      className="font-body text-[11px] font-bold tracking-[0.14em] uppercase px-3 py-1.5 rounded-full"
      style={{ backgroundColor: catColors.bgColor, color: catColors.textColor }}
    >
      {category}
    </span>
  );
};

const TagButtons = ({
  post,
  onTag,
}: {
  post: BlogPost;
  onTag?: (tag: string) => void;
}) => {
  const { getTagColors } = useTagColors();
  if (!post.tags || post.tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {post.tags.map((tag) => {
        const tc = getTagColors(tag);
        return (
          <button
            type="button"
            key={tag}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTag?.(tag); }}
            title={`Show every article tagged ${tag}`}
            className="font-body text-[10px] tracking-[0.12em] uppercase px-2 py-1 rounded-full font-medium hover:underline"
            style={{ backgroundColor: tc.bgColor, color: tc.textColor }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
};

const CardCover = ({ post, heightClass }: { post: BlogPost; heightClass: string }) => {
  if (!post.cover_image) return null;
  return (
    <img
      src={transformImageUrl(post.cover_image, { width: 960, quality: 70, aspectRatio: 16 / 9 })}
      srcSet={buildImageSrcSet(post.cover_image, [480, 960, 1440], 70, 16 / 9)}
      sizes="(min-width: 1024px) 720px, 100vw"
      alt={post.cover_image_alt || `${post.title} cover image`}
      className={`w-full object-cover block ${heightClass}`}
      loading="lazy"
      decoding="async"
    />
  );
};

const LeadCard = ({ post, onTag }: { post: BlogPost; onTag?: (tag: string) => void }) => (
  <article className="group">
    <Link
      to={`/blog/${post.slug}`}
      className="glass rounded-3xl overflow-hidden grid lg:grid-cols-12 transition-all duration-300 hover:-translate-y-0.5 hover:glow-accent"
    >
      <div className="lg:col-span-7">
        <CardCover post={post} heightClass="h-64 md:h-80 lg:h-[440px] lg:min-h-full" />
      </div>
      <div className="lg:col-span-5 p-6 md:p-10 flex flex-col gap-4 justify-center">
        <div className="flex flex-wrap items-center gap-3">
          <CategoryPill category={post.category} />
          {post.published_at && (
            <span className="font-body text-[13px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              {formatDate(post.published_at)}
            </span>
          )}
          <span className="font-body text-[13px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            · {calculateReadTime(post.content)}
          </span>
        </div>
        <h2
          className="font-display font-extrabold leading-[1.08] group-hover:opacity-80"
          style={{ color: "hsl(var(--deep))", fontSize: "var(--fs-h2)" }}
        >
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="font-body text-[17px] leading-[1.7]" style={{ color: "hsl(var(--muted-foreground))" }}>
            {post.excerpt}
          </p>
        )}
        <TagButtons post={post} onTag={onTag} />
        <span className="font-body font-semibold text-base" style={{ color: "hsl(var(--primary))" }}>
          Read the article <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  </article>
);

const GridCard = ({ post, onTag }: { post: BlogPost; onTag?: (tag: string) => void }) => (
  <article className="group h-full">
    <Link
      to={`/blog/${post.slug}`}
      className="glass rounded-3xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:-translate-y-0.5 hover:glow-accent"
    >
      <CardCover post={post} heightClass="h-[200px]" />
      <div className="p-6 flex flex-col gap-3 flex-grow">
        <div className="flex flex-wrap items-center gap-3">
          <CategoryPill category={post.category} />
          {post.published_at && (
            <span className="font-body text-[13px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              {formatDate(post.published_at)}
            </span>
          )}
        </div>
        <h3
          className="font-display font-bold leading-[1.22] flex-grow group-hover:opacity-80"
          style={{ color: "hsl(var(--deep))", fontSize: "var(--fs-h3, 20px)" }}
        >
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="font-body text-[15px] leading-[1.6] line-clamp-3" style={{ color: "hsl(var(--muted-foreground))" }}>
            {post.excerpt}
          </p>
        )}
        <TagButtons post={post} onTag={onTag} />
      </div>
    </Link>
  </article>
);

const CategoryChip = ({
  label,
  dotColor,
  selected,
  onClick,
}: {
  label: string;
  dotColor?: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className="inline-flex items-center gap-2 h-11 px-[18px] rounded-full font-body text-sm transition-colors"
    style={{
      border: selected ? "1px solid hsl(var(--deep))" : "1px solid hsl(var(--border))",
      backgroundColor: selected ? "hsl(var(--deep))" : "hsl(var(--background))",
      color: selected ? "hsl(var(--deep-fg))" : "hsl(var(--deep))",
      fontWeight: selected ? 600 : 500,
    }}
  >
    {dotColor && (
      <span
        aria-hidden="true"
        className="w-[9px] h-[9px] rounded-full"
        style={{
          backgroundColor: dotColor,
          boxShadow: selected ? "0 0 0 2px hsl(0 0% 100%)" : undefined,
        }}
      />
    )}
    {label}
  </button>
);

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const { getCategoryColors } = useTagColors();

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const selectedCategory = searchParams.get("category") || "all";
  const selectedTag = searchParams.get("tag") || "";

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    setSearchParams(params, { replace: true });
  };

  const setTag = (tag: string) => {
    const params = new URLSearchParams(searchParams);
    if (tag) params.set("tag", tag); else params.delete("tag");
    params.set("page", "1");
    setSearchParams(params, { replace: true });
  };

  const setCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("category", cat);
    params.set("page", "1");
    setSearchParams(params, { replace: true });
  };

  const pageData = useSiteContent<{
    rows_above: PageRow[];
    rows_below: PageRow[];
    header_title: string;
    header_subtitle: string;
    meta_title: string;
    meta_description: string;
  }>("blog_page", {
    rows_above: [],
    rows_below: [],
    header_title: "Blog",
    header_subtitle: "Articles, updates and ideas.",
    meta_title: "",
    meta_description: "",
  });

  usePageMeta({
    title: pageData.meta_title || pageData.header_title || "Blog",
    description: pageData.meta_description || pageData.header_subtitle || undefined,
    breadcrumbs: [{ name: "Home", path: "/" }, { name: "Blog" }],
  });

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, title, excerpt, published_at, content, category, cover_image, cover_image_alt, tags")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (data) setPosts(data as BlogPost[]);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(posts.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (selectedCategory !== "all") list = list.filter((p) => p.category === selectedCategory);
    if (selectedTag) list = list.filter((p) => (p.tags || []).some((t) => t.toLowerCase() === selectedTag.toLowerCase()));
    return list;
  }, [posts, selectedCategory, selectedTag]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );
  const leadPost = currentPage === 1 ? paginatedPosts[0] : undefined;
  const gridPosts = currentPage === 1 ? paginatedPosts.slice(1) : paginatedPosts;

  return (
    <div className="min-h-screen page-shell">
      <Navbar />
      {pageData.rows_above && pageData.rows_above.length > 0 && (
        <RowsRenderer rows={pageData.rows_above} promoteHeading={false} />
      )}

      <section className="grain relative pt-28 pb-8">
        <div className="relative z-10 max-w-[1280px] mx-auto px-8">
          <h1
            className="font-display font-black leading-tight mb-5"
            style={{ color: "hsl(var(--foreground))", fontSize: "var(--fs-title)" }}
          >
            {pageData.header_title || "Insights & Articles"}
          </h1>
          <p
            className="font-body text-base md:text-lg max-w-[720px]"
            style={{ color: "hsl(var(--foreground) / 0.6)" }}
          >
            {pageData.header_subtitle || ""}
          </p>
        </div>
      </section>

      <section aria-label="Filter articles" className="px-8">
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center gap-2.5">
          <CategoryChip
            label="All articles"
            selected={selectedCategory === "all"}
            onClick={() => setCategory("all")}
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat}
              label={cat}
              dotColor={getCategoryColors(cat).bgColor}
              selected={selectedCategory === cat}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>
      </section>

      <section className="pt-8 pb-20 px-8">
        <div className="max-w-[1280px] mx-auto">
          {selectedTag && (
            <p className="font-body text-sm mb-4" style={{ color: "hsl(var(--foreground) / 0.6)" }}>
              Tagged <strong style={{ color: "hsl(var(--foreground))" }}>{selectedTag}</strong> ·{" "}
              <button type="button" className="underline underline-offset-4" onClick={() => setTag("")}>Show all</button>
            </p>
          )}
          {loading ? (
            <p
              className="font-body text-sm text-center py-12"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Loading articles…
            </p>
          ) : paginatedPosts.length === 0 ? (
            <p
              className="font-body text-sm text-center py-12"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              No articles published yet.
            </p>
          ) : (
            <div className="space-y-8">
              {leadPost && <LeadCard post={leadPost} onTag={setTag} />}
              {gridPosts.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gridPosts.map((post) => (
                    <GridCard key={post.slug} post={post} onTag={setTag} />
                  ))}
                </div>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-12" aria-label="Blog pagination">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-2 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-80"
                style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-9 h-9 rounded-lg font-body text-sm transition-opacity"
                  style={{
                    backgroundColor: p === currentPage ? "hsl(var(--primary))" : "transparent",
                    color: p === currentPage ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                    opacity: p === currentPage ? 1 : 0.7,
                  }}
                  aria-current={p === currentPage ? "page" : undefined}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-80"
                style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </nav>
          )}
        </div>
      </section>

      {pageData.rows_below && pageData.rows_below.length > 0 && (
        <RowsRenderer rows={pageData.rows_below} promoteHeading={false} />
      )}
      <Footer breadcrumbTrail={[{ name: "Home", path: "/" }, { name: "Blog" }]} />
    </div>
  );
};

export default Blog;
