import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/features/site/Navbar";
import Footer from "@/features/site/Footer";
import { useTagColors } from "@/hooks/useTagColors";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";
import type { PageRow } from "@/types/rows";
import { RowsRenderer } from "@/features/site/rows/PageRows";

interface BlogPost {
  slug: string; title: string; excerpt: string | null; published_at: string | null; content: string; category: string;
}

const calculateReadTime = (content: string) => {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { getCategoryColors } = useTagColors();

  const pageData = useSiteContent<{ rows_above: PageRow[]; rows_below: PageRow[]; header_title: string; header_subtitle: string; meta_title: string; meta_description: string }>("blog_page", {
    rows_above: [], rows_below: [],
    header_title: "Insights & Articles",
    header_subtitle: "Sharp thinking on internal communications, employee experience, and the culture vampires lurking in your organisation.",
    meta_title: "", meta_description: "",
  });

  usePageMeta({
    title: pageData.meta_title || pageData.header_title || "Blog",
    description: pageData.meta_description || pageData.header_subtitle || undefined,
  });

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, title, excerpt, published_at, content, category")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (data) setPosts(data);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen page-shell">
      <Navbar />
      {pageData.rows_above && pageData.rows_above.length > 0 && (
        <RowsRenderer rows={pageData.rows_above} />
      )}

      <section className="grain relative pt-36 pb-16 text-center mesh-hero">
        <div className="relative z-10 max-w-[800px] mx-auto px-8">
          <h1 className="font-display text-3xl md:text-5xl font-black leading-tight mb-5" style={{ color: "hsl(var(--foreground))" }}>
            {pageData.header_title || "Insights & Articles"}
          </h1>
          <p className="font-body-heading text-base md:text-lg max-w-[600px] mx-auto" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
            {pageData.header_subtitle || ""}
          </p>
        </div>
      </section>

      <section className="py-20 px-8" style={{ backgroundColor: "hsl(var(--background))" }}>
        <div className="max-w-[800px] mx-auto">
          {loading ? (
            <p className="font-body text-sm text-center py-12" style={{ color: "hsl(var(--muted-foreground))" }}>Loading articles...</p>
          ) : posts.length === 0 ? (
            <p className="font-body text-sm text-center py-12" style={{ color: "hsl(var(--muted-foreground))" }}>No articles published yet.</p>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <article key={post.slug}>
                  <Link to={`/blog/${post.slug}`}
                    className="block glass rounded-xl p-6 md:p-8 hover:glow-accent group">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                      {(() => {
                        const catColors = getCategoryColors(post.category);
                        return (<span className="font-body text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full font-medium"
                          style={{ backgroundColor: catColors.bgColor, color: catColors.textColor }}>{post.category}</span>);
                      })()}
                      {post.published_at && <span className="font-body text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{formatDate(post.published_at)}</span>}
                      <span className="font-body text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>· {calculateReadTime(post.content)}</span>
                    </div>
                    <h2 className="font-display text-lg md:text-xl font-bold leading-tight mb-2 group-hover:opacity-80" style={{ color: "hsl(var(--foreground))" }}>{post.title}</h2>
                    {post.excerpt && <p className="font-body text-sm leading-relaxed" style={{ color: "hsl(var(--foreground) / 0.5)" }}>{post.excerpt}</p>}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {pageData.rows_below && pageData.rows_below.length > 0 && (
        <RowsRenderer rows={pageData.rows_below} />
      )}
      <Footer />
    </div>
  );
};

export default Blog;
