import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ease = [0.16, 1, 0.3, 1] as const;

interface BlogArticle {
  slug: string;
  title: string;
  published_at: string | null;
  content: string;
  category: string;
}

const calculateReadTime = (content: string) => {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) { setLoading(false); return; }
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, title, published_at, content, category")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      setArticle(data);
      setLoading(false);
    };
    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen mt-[20px]">
        <Navbar />
        <div className="pt-32 pb-20 text-center px-6">
          <p className="font-body text-sm text-muted-foreground">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen mt-[20px]">
        <Navbar />
        <div className="pt-32 pb-20 text-center px-6">
          <h1 className="font-display text-2xl font-bold mb-4" style={{ color: "hsl(var(--secondary))" }}>Article not found</h1>
          <Link to="/blog" className="font-body text-sm underline" style={{ color: "hsl(var(--primary))" }}>← Back to all articles</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const paragraphs = article.content.split(/\n\n+/).filter(p => p.trim());

  return (
    <div className="min-h-screen mt-[20px]">
      <Navbar />
      <article>
        <header
          className="pt-32 pb-12 px-6"
          style={{ backgroundColor: "hsl(var(--primary))" }}>
          <div className="max-w-[700px] mx-auto">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 font-body text-xs uppercase tracking-[0.12em] mb-6 transition-opacity hover:opacity-70"
              style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>
              <ArrowLeft size={14} />
              All articles
            </Link>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
                <span
                  className="font-body text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 md:px-2.5 md:py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: "hsl(var(--accent) / 0.2)",
                    color: "hsl(var(--accent))"
                  }}>
                  {article.category}
                </span>
                <span className="font-body text-xs" style={{ color: "hsl(var(--primary-foreground) / 0.5)" }}>
                  {article.published_at ? formatDate(article.published_at) : ""} · {calculateReadTime(article.content)}
                </span>
              </div>
              <h1
                className="font-display text-2xl md:text-3xl lg:text-4xl font-black leading-tight"
                style={{ color: "hsl(var(--primary-foreground))" }}>
                {article.title}
              </h1>
            </motion.div>
          </div>
        </header>

        <div className="py-12 px-6" style={{ backgroundColor: "hsl(var(--background))" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease }}
            className="max-w-[700px] mx-auto space-y-6">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="font-body text-base text-foreground/80 leading-[1.8]">
                {paragraph}
              </p>
            ))}
          </motion.div>

          <div className="max-w-[700px] mx-auto mt-12 pt-8" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 font-body text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: "hsl(var(--primary))" }}>
              <ArrowLeft size={16} />
              Back to all articles
            </Link>
          </div>
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default BlogPost;
