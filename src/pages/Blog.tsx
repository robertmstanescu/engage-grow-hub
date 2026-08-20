import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/features/site/Navbar";
import Footer from "@/features/site/Footer";
import { useTagColors } from "@/hooks/useTagColors";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";
import { useImageTone } from "@/hooks/useImageTone";
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

const POSTS_PER_PAGE = 5;

const calculateReadTime = (content: string) => {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const BlogCard = ({ post }: { post: BlogPost }) => {
  const { getCategoryColors, getTagColors } = useTagColors();
  const catColors = getCategoryColors(post.category);
  const tone = useImageTone(post.cover_image);

  const hasCover = !!post.cover_image;
  const isLight = tone === "light";

  const textColor = hasCover ? (isLight ? "hsl(var(--foreground))" : "#ffffff") : "hsl(var(--foreground))";
  const mutedColor = hasCover
    ? isLight
      ? "hsl(var(--foreground) / 0.7)"
      : "rgba(255,255,255,0.7)"
    : "hsl(var(--muted-foreground))";
  const excerptColor = hasCover
    ? isLight
      ? "hsl(var(--foreground) / 0.75)"
      : "rgba(255,255,255,0.8)"
    : "hsl(var(--foreground) / 0.5)";

  return (
    <article key={post.slug} className="group">
      <Link
        to={`/blog/${post.slug}`}
        className={`relative block rounded-xl overflow-hidden transition-transform duration-300 hover:scale-[1.01] ${
          hasCover ? "" : "glass p-6 md:p-8 hover:glow-accent"
        }`}
      >
        {hasCover && (
          <>
            <img
              src={post.cover_image!}
              alt={post.cover_image_alt || `${post.title} cover image`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: isLight
                  ? "linear-gradient(to bottom, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.88) 100%)"
                  : "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.78) 100%)",
              }}
            />
          </>
        )}
        <div className="relative z-10 flex flex-col justify-end min-h-[280px] md:min-h-[320px]">
          <div className={hasCover ? "p-6 md:p-8" : ""}>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
              <span
                className="font-body text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full font-medium"
                style={{ backgroundColor: catColors.bgColor, color: catColors.textColor }}
              >
                {post.category}
              </span>
              {post.published_at && (
                <span className="font-body text-xs" style={{ color: mutedColor }}>
                  {formatDate(post.published_at)}
                </span>
              )}
              <span className="font-body text-xs" style={{ color: mutedColor }}>
                · {calculateReadTime(post.content)}
              </span>
            </div>
            <h2
              className="font-display text-lg md:text-xl font-bold leading-tight mb-2 group-hover:opacity-80"
              style={{ color: textColor }}
            >
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="font-body text-sm leading-relaxed line-clamp-2" style={{ color: excerptColor }}>
                {post.excerpt}
              </p>
            )}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {post.tags.map((tag) => {
                  const tc = getTagColors(tag);
                  return (
                    <span
                      key={tag}
                      className="font-body text-[10px] tracking-[0.12em] uppercase px-2 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: hasCover
                          ? isLight
                            ? "hsl(var(--foreground) / 0.1)"
                            : "rgba(255,255,255,0.15)"
                          : tc.bgColor,
                        color: hasCover ? textColor : tc.textColor,
                      }}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
};

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const selectedCategory = searchParams.get("category") || "all";

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
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
    if (selectedCategory === "all") return posts;
    return posts.filter((p) => p.category === selectedCategory);
  }, [posts, selectedCategory]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  return (
    <div className="min-h-screen page-shell">
      <Navbar />
      {pageData.rows_above && pageData.rows_above.length > 0 && (
        <RowsRenderer rows={pageData.rows_above} promoteHeading={false} />
      )}

      <section className="grain relative pt-36 pb-16 text-center">
        <div className="relative z-10 max-w-[800px] mx-auto px-8">
          <h1
            className="font-display text-3xl md:text-5xl font-black leading-tight mb-5"
            style={{ color: "hsl(var(--foreground))" }}
          >
            {pageData.header_title || "Insights & Articles"}
          </h1>
          <p
            className="font-body text-base md:text-lg max-w-[600px] mx-auto"
            style={{ color: "hsl(var(--foreground) / 0.5)" }}
          >
            {pageData.header_subtitle || ""}
          </p>
        </div>
      </section>

      <section className="py-20 px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            <div className="flex-1 min-w-0">
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
                <div className="space-y-6">
                  {paginatedPosts.map((post) => (
                    <BlogCard key={post.slug} post={post} />
                  ))}
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

            <aside className="lg:w-64 flex-shrink-0">
              <div
                className="rounded-xl p-5 sticky top-24"
                style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              >
                <h3
                  className="font-display text-sm font-bold mb-4"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  Categories
                </h3>
                <div className="space-y-1">
                  <CategoryButton
                    label="All"
                    count={posts.length}
                    selected={selectedCategory === "all"}
                    onClick={() => setCategory("all")}
                  />
                  {categories.map((cat) => (
                    <CategoryButton
                      key={cat}
                      label={cat}
                      count={posts.filter((p) => p.category === cat).length}
                      selected={selectedCategory === cat}
                      onClick={() => setCategory(cat)}
                    />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {pageData.rows_below && pageData.rows_below.length > 0 && (
        <RowsRenderer rows={pageData.rows_below} promoteHeading={false} />
      )}
      <Footer />
    </div>
  );
};

const CategoryButton = ({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-body text-sm transition-all"
    style={{
      opacity: selected ? 1 : 0.55,
      fontWeight: selected ? 700 : 400,
      backgroundColor: selected ? "hsl(var(--accent) / 0.12)" : "transparent",
      color: selected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
    }}
  >
    <span>{label}</span>
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: selected ? "hsl(var(--accent) / 0.2)" : "hsl(var(--muted) / 0.5)",
        color: selected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
      }}
    >
      {count}
    </span>
  </button>
);

export default Blog;
