import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTagColors } from "@/hooks/useTagColors";
import SubscribeWidget from "@/components/SubscribeWidget";

const ease = [0.16, 1, 0.3, 1] as const;

interface BlogArticle {
  slug: string; title: string; published_at: string | null; content: string; category: string;
  cover_image: string | null; author_name: string | null; author_image: string | null;
  meta_title: string | null; meta_description: string | null; og_image: string | null; tags: string[] | null;
}

const calculateReadTime = (content: string) => `${Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200))} min read`;
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const { getCategoryColors } = useTagColors();

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) { setLoading(false); return; }
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, title, published_at, content, category, cover_image, author_name, author_image, meta_title, meta_description, og_image, tags")
        .eq("slug", slug).eq("status", "published").maybeSingle();
      setArticle(data as BlogArticle | null);
      setLoading(false);
    };
    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen lg:pl-16">
        <Navbar />
        <div className="pt-36 pb-20 text-center px-8"><p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading...</p></div>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen lg:pl-16">
        <Navbar />
        <div className="pt-36 pb-20 text-center px-8">
          <h1 className="font-display text-2xl font-bold mb-4" style={{ color: "hsl(var(--foreground))" }}>Article not found</h1>
          <Link to="/blog/" className="font-body text-sm underline" style={{ color: "hsl(var(--accent))" }}>← Back to all articles</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const pageTitle = article.meta_title || article.title;
  const pageDesc = article.meta_description || article.content.replace(/<[^>]*>/g, " ").slice(0, 160);
  const pageImage = article.og_image || article.cover_image;

  return (
    <div className="min-h-screen lg:pl-16">
      {typeof document !== "undefined" && (() => {
        document.title = `${pageTitle} | The Magic Coffin for Silly Vampires`;
        const setMeta = (name: string, content: string, property?: boolean) => {
          const attr = property ? "property" : "name";
          let el = document.querySelector(`meta[${attr}="${name}"]`);
          if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
          el.setAttribute("content", content);
        };
        setMeta("description", pageDesc);
        setMeta("og:title", pageTitle, true);
        setMeta("og:description", pageDesc, true);
        if (pageImage) setMeta("og:image", pageImage, true);
        setMeta("og:type", "article", true);
        setMeta("twitter:title", pageTitle);
        setMeta("twitter:description", pageDesc);
        if (pageImage) setMeta("twitter:image", pageImage);
        return null;
      })()}
      <Navbar />
      <article>
        {article.cover_image && (
          <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
            <img src={article.cover_image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, hsl(var(--background)))" }} />
          </div>
        )}

        <header className={`grain relative ${article.cover_image ? "pt-6" : "pt-36"} pb-16 px-8 mesh-hero`}>
          <div className="relative z-10 max-w-[700px] mx-auto">
            <Link to="/blog/" className="inline-flex items-center gap-1.5 font-body text-xs uppercase tracking-[0.15em] mb-8 transition-opacity hover:opacity-70" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
              <ArrowLeft size={14} /> All articles
            </Link>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-5">
                {(() => { const cc = getCategoryColors(article.category); return (<span className="font-body text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full font-medium" style={{ backgroundColor: cc.bgColor, color: cc.textColor }}>{article.category}</span>); })()}
                <span className="font-body text-xs" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
                  {article.published_at ? formatDate(article.published_at) : ""} · {calculateReadTime(article.content)}
                </span>
              </div>
              <h1 className="font-display text-2xl md:text-4xl lg:text-5xl font-black leading-tight" style={{ color: "hsl(var(--foreground))" }}>{article.title}</h1>
              {article.author_name && (
                <div className="flex items-center gap-3 mt-6">
                  {article.author_image && <img src={article.author_image} alt={article.author_name} className="w-10 h-10 rounded-full object-cover" />}
                  <div>
                    <p className="font-body text-[10px] uppercase tracking-[0.14em]" style={{ color: "hsl(var(--foreground) / 0.3)" }}>Written by</p>
                    <p className="text-sm font-bold font-body-heading" style={{ color: "hsl(var(--foreground))" }}>{article.author_name}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </header>

        <div className="section-light py-16 px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease }}
            className="max-w-[700px] mx-auto prose prose-sm md:prose-base prose-headings:font-display prose-headings:text-[hsl(260_20%_10%)] prose-p:text-[hsl(260_20%_10%_/_0.75)] prose-p:leading-[1.8] prose-a:text-[hsl(280_55%_24%)] prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} />

          <div className="max-w-[700px] mx-auto mt-12 pt-8 flex flex-col items-center" style={{ borderTop: "1px solid hsl(var(--light-fg) / 0.1)" }}>
            <SubscribeWidget />
          </div>

          <div className="max-w-[700px] mx-auto mt-8 pt-8" style={{ borderTop: "1px solid hsl(var(--light-fg) / 0.1)" }}>
            <Link to="/blog" className="inline-flex items-center gap-1.5 font-body text-sm font-medium transition-opacity hover:opacity-70" style={{ color: "hsl(var(--primary))" }}>
              <ArrowLeft size={16} /> Back to all articles
            </Link>
          </div>
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default BlogPost;
