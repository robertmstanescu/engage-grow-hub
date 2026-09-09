import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { transformImageUrl } from "@/services/mediaOptimization";

/**
 * FromTheBlog — three recent posts under a service page, so a pillar
 * links to the writing that supports it and a reader has somewhere to
 * go next. Posts in the matching categories come first; if none match,
 * the newest posts are shown.
 */
interface Lite { slug: string; title: string; excerpt: string | null; cover_image: string | null; cover_image_alt: string | null; published_at: string | null; category: string | null }


const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

const FromTheBlog = ({ categories, limit = 3 }: { categories: string[]; limit?: number }) => {
  const [posts, setPosts] = useState<Lite[]>([]);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("blog_posts")
      .select("slug, title, excerpt, cover_image, cover_image_alt, published_at, category")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(24)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const rows = data as Lite[];
        const same = rows.filter((p) => p.category && categories.includes(p.category));
        const rest = rows.filter((p) => !same.includes(p));
        setPosts([...same, ...rest].slice(0, limit));
      });
    return () => { cancelled = true; };
  }, [categories, limit]);

  if (posts.length === 0) return null;
  const matched = posts.some((p) => p.category && categories.includes(p.category));
  const listHref = matched ? `/blog/?category=${encodeURIComponent(posts[0].category || "")}` : "/blog/";
  return (
    <section aria-labelledby="from-the-blog" className="px-8 py-16" data-from-the-blog>
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 id="from-the-blog" className="font-display font-bold" style={{ color: "hsl(var(--foreground))", fontSize: "var(--fs-card-title)" }}>From the blog</h2>
          <Link to={listHref} className="font-body text-sm font-medium underline underline-offset-4" style={{ color: "hsl(var(--primary))" }}>All articles</Link>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link to={`/blog/${p.slug}/`} className="group block h-full overflow-hidden" style={{ background: "hsl(var(--card))", border: "var(--outline-ink-border)", borderRadius: "var(--radius)" }}>
                {p.cover_image && (
                  <span className="block w-full overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
                    <img src={transformImageUrl(p.cover_image, { width: 640, aspectRatio: 16 / 9, quality: 70 })} alt={p.cover_image_alt || ""} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </span>
                )}
                <span className="block p-5">
                  <span className="block font-body text-[11px] uppercase tracking-[0.16em] mb-2" style={{ color: "hsl(var(--foreground) / 0.55)" }}>{[p.category, fmt(p.published_at)].filter(Boolean).join(" · ")}</span>
                  <span className="block font-display font-bold leading-snug group-hover:underline" style={{ color: "hsl(var(--foreground))", fontSize: "var(--fs-card-title)" }}>{p.title}</span>
                  {p.excerpt && <span className="block font-body mt-2" style={{ color: "hsl(var(--foreground) / 0.7)", fontSize: "var(--fs-card-body)" }}>{p.excerpt}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FromTheBlog;
