import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/features/site/Navbar";
import Footer from "@/features/site/Footer";
import { useTagColors } from "@/hooks/useTagColors";
import { useSiteContent } from "@/hooks/useSiteContent";
import usePageMeta from "@/hooks/usePageMeta";
import type { PageRow } from "@/types/rows";
import TextRow from "@/features/site/rows/TextRow";
import ServiceRow from "@/features/site/rows/ServiceRow";
import BoxedRow from "@/features/site/rows/BoxedRow";
import ContactRow from "@/features/site/rows/ContactRow";
import HeroRow from "@/features/site/rows/HeroRow";
import ImageTextRow from "@/features/site/rows/ImageTextRow";
import ProfileRow from "@/features/site/rows/ProfileRow";
import GridRow from "@/features/site/rows/GridRow";

const ease = [0.16, 1, 0.3, 1] as const;

interface BlogPost {
  slug: string; title: string; excerpt: string | null; published_at: string | null; content: string; category: string;
}

const calculateReadTime = (content: string) => {
  const words = content.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const RowRenderer = ({ row, rowIndex }: { row: PageRow; rowIndex: number }) => {
  try {
    if (!row || !row.type) return null;
    const id = row.scope || slugify(row.strip_title || "section");
    const wrapper = (children: React.ReactNode) => (<div id={id} style={{ scrollMarginTop: "4rem" }}>{children}</div>);
    switch (row.type) {
      case "hero": return wrapper(<HeroRow row={row} />);
      case "text": return wrapper(<TextRow row={row} rowIndex={rowIndex} />);
      case "service": return wrapper(<ServiceRow row={row} rowIndex={rowIndex} />);
      case "boxed": return wrapper(<BoxedRow row={row} rowIndex={rowIndex} />);
      case "contact": return wrapper(<ContactRow row={row} />);
      case "image_text": return wrapper(<ImageTextRow row={row} rowIndex={rowIndex} />);
      case "profile": return wrapper(<ProfileRow row={row} rowIndex={rowIndex} />);
      case "grid": return wrapper(<GridRow row={row} rowIndex={rowIndex} />);
      default: return null;
    }
  } catch { return null; }
};

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
    <div className="min-h-screen lg:pl-16">
      <Navbar />
      {(pageData.rows_above || []).map((row, i) => <RowRenderer key={row.id} row={row} rowIndex={i} />)}

      <section className="grain relative pt-36 pb-16 text-center mesh-hero">
        <div className="relative z-10 max-w-[800px] mx-auto px-8">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}
            className="font-display text-3xl md:text-5xl font-black leading-tight mb-5" style={{ color: "hsl(var(--foreground))" }}>
            {pageData.header_title || "Insights & Articles"}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease }}
            className="font-body-heading text-base md:text-lg max-w-[600px] mx-auto" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
            {pageData.header_subtitle || ""}
          </motion.p>
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
              {posts.map((post, i) => (
                <motion.article key={post.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease }}>
                  <Link to={`/blog/${post.slug}`}
                    className="block glass rounded-xl p-6 md:p-8 transition-all duration-500 hover:glow-accent group">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                      {(() => {
                        const catColors = getCategoryColors(post.category);
                        return (<span className="font-body text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full font-medium"
                          style={{ backgroundColor: catColors.bgColor, color: catColors.textColor }}>{post.category}</span>);
                      })()}
                      {post.published_at && <span className="font-body text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{formatDate(post.published_at)}</span>}
                      <span className="font-body text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>· {calculateReadTime(post.content)}</span>
                    </div>
                    <h2 className="font-display text-lg md:text-xl font-bold leading-tight mb-2 group-hover:opacity-80 transition-opacity" style={{ color: "hsl(var(--foreground))" }}>{post.title}</h2>
                    {post.excerpt && <p className="font-body text-sm leading-relaxed" style={{ color: "hsl(var(--foreground) / 0.5)" }}>{post.excerpt}</p>}
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      {(pageData.rows_below || []).map((row, i) => <RowRenderer key={row.id} row={row} rowIndex={i} />)}
      <Footer />
    </div>
  );
};

export default Blog;
