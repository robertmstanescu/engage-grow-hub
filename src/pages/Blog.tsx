import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTagColors } from "@/hooks/useTagColors";

const ease = [0.16, 1, 0.3, 1] as const;

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string | null;
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

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { getCategoryColors } = useTagColors();

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
    <div className="min-h-screen mt-[20px]">
      <Navbar />
      <section
        className="pt-32 pb-12 text-center"
        style={{ backgroundColor: "hsl(var(--primary))" }}>
        <div className="max-w-[800px] mx-auto px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="font-display text-3xl md:text-4xl font-black leading-tight mb-4"
            style={{ color: "hsl(var(--primary-foreground))" }}>
            Insights & Articles
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="font-body-heading text-base max-w-[600px] mx-auto"
            style={{ color: "hsl(var(--primary-foreground) / 0.75)" }}>
            Sharp thinking on internal communications, employee experience, and the culture vampires lurking in your organisation.
          </motion.p>
        </div>
      </section>

      <section className="py-16 px-6" style={{ backgroundColor: "hsl(var(--background))" }}>
        <div className="max-w-[800px] mx-auto">
          {loading ? (
            <p className="font-body text-sm text-muted-foreground text-center py-12">Loading articles...</p>
          ) : posts.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-12">No articles published yet. Check back soon!</p>
          ) : (
            <div className="space-y-8">
              {posts.map((post, i) => (
                <motion.article
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease }}>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="block rounded-lg p-6 md:p-8 transition-all duration-200 hover:shadow-lg group"
                    style={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border) / 0.5)"
                    }}>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                      <span
                        className="font-body text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 md:px-2.5 md:py-1 rounded-full font-medium"
                        style={{
                          backgroundColor: "hsl(var(--accent) / 0.15)",
                          color: "hsl(var(--accent-foreground))"
                        }}>
                        {post.category}
                      </span>
                      {post.published_at && (
                        <span className="font-body text-xs text-muted-foreground">{formatDate(post.published_at)}</span>
                      )}
                      <span className="font-body text-xs text-muted-foreground">· {calculateReadTime(post.content)}</span>
                    </div>
                    <h2
                      className="font-display text-lg md:text-xl font-bold leading-tight mb-2 group-hover:opacity-80 transition-opacity"
                      style={{ color: "hsl(var(--secondary))" }}>
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="font-body text-sm text-foreground/70 leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Blog;
