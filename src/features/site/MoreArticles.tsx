import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { transformImageUrl } from "@/services/mediaOptimization";
import AllPostsButton from "@/features/site/AllPostsButton";

/**
 * MoreArticles — the next things to read, beside an article on wide
 * screens and below it on phones. Same category first, then the newest.
 */
interface Lite { slug: string; title: string; cover_image: string | null; cover_image_alt: string | null; published_at: string | null; category: string | null }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

const MoreArticles = ({ currentSlug, category, limit = 5, className = "" }: { currentSlug: string; category?: string | null; limit?: number; className?: string }) => {
  const [posts, setPosts] = useState<Lite[]>([]);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("blog_posts")
      .select("slug, title, cover_image, cover_image_alt, published_at, category")
      .eq("status", "published")
      .neq("slug", currentSlug)
      .order("published_at", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const rows = data as Lite[];
        const same = category ? rows.filter((p) => p.category === category) : [];
        const rest = rows.filter((p) => !same.includes(p));
        setPosts([...same, ...rest].slice(0, limit));
      });
    return () => { cancelled = true; };
  }, [currentSlug, category, limit]);

  if (posts.length === 0) return null;
  return (
    <nav aria-label="More articles" className={className} data-more-articles>
      <h2 className="font-body text-[11px] uppercase tracking-[0.18em] mb-4" style={{ color: "hsl(var(--foreground) / 0.55)" }}>More to read</h2>
      <ul className="space-y-4">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link to={`/blog/${p.slug}/`} className="group flex gap-3 items-start">
              <span className="block w-16 h-16 shrink-0 overflow-hidden rounded-md" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                {p.cover_image && (
                  <img src={transformImageUrl(p.cover_image, { width: 128, aspectRatio: 1, quality: 70 })} alt={p.cover_image_alt || ""} width={64} height={64} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block font-body font-medium leading-snug group-hover:underline" style={{ color: "hsl(var(--foreground))", fontSize: "var(--fs-card-body)" }}>{p.title}</span>
                <span className="block font-body text-xs mt-1" style={{ color: "hsl(var(--foreground) / 0.5)" }}>{[p.category, fmt(p.published_at)].filter(Boolean).join(" · ")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end"><AllPostsButton /></div>
    </nav>
  );
};

export default MoreArticles;
