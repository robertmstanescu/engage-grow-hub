import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PageRow } from "@/types/rows";
import { supabase } from "@/integrations/supabase/client";
import { transformImageUrl } from "@/services/mediaOptimization";
import { RowEyebrow, RowTitle, RowSection } from "@/features/site/rows/typography";
import AllPostsButton from "@/features/site/AllPostsButton";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { useBuilder } from "@/features/admin/builder/BuilderContext";
import { fromTheBlogSchema } from "./schema";
import { blogLinkFor, pickPosts, type PostLite } from "./postPick";

/**
 * FromTheBlogRow — recent posts as a proper row.
 *
 * A RowSection like every other row, so it stacks with the rows above
 * it (top corners rounded, square feet) instead of sitting outside the
 * page like the old hard-coded section did. Heading, categories, count
 * and link text come from the row's content; the posts come from
 * `blog_posts` when the row renders.
 *
 * With nothing to show the row paints nothing on the public site. In
 * the builder it paints a note instead: a row that renders nothing is
 * a zero-height, unclickable strip, so its settings could never be
 * opened — which is exactly when the owner needs to change the
 * categories it is asking for.
 */
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

const FromTheBlogRow = ({ row }: { row: PageRow }) => {
  const c = fromTheBlogSchema.parse(row.content || {});
  const [posts, setPosts] = useState<PostLite[]>([]);
  const [looked, setLooked] = useState(false);
  const { enabled: builderEnabled } = useBuilder();
  const { ref, isVisible } = useScrollReveal();
  const catKey = c.categories.join("|");

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("blog_posts")
      .select("slug, title, excerpt, cover_image, cover_image_alt, published_at, category")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(24)
      .then(({ data }) => {
        if (cancelled) return;
        setPosts(data ? pickPosts(data as PostLite[], catKey.split("|"), c.limit) : []);
        setLooked(true);
      }, () => { if (!cancelled) setLooked(true); });
    return () => { cancelled = true; };
  }, [catKey, c.limit]);

  if (posts.length === 0) {
    if (!builderEnabled || !looked) return null;
    return (
      <RowSection row={row}>
        <div className="max-w-[1280px] mx-auto row-container">
          {c.title && <RowTitle color={c.color_title}><span className="block">{c.title}</span></RowTitle>}
          <p className="font-body text-sm mt-3" style={{ color: "hsl(var(--foreground) / 0.6)" }}>
            No published post matches this block yet. It stays hidden on the live page until one does.
          </p>
        </div>
      </RowSection>
    );
  }
  const listHref = blogLinkFor(posts, c.categories);

  return (
    <RowSection row={row}>
      <div ref={ref as never} className="max-w-[1280px] mx-auto row-container">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            {c.eyebrow && <RowEyebrow color={c.color_eyebrow} style={revealStyle(isVisible, -0.5)}>{c.eyebrow}</RowEyebrow>}
            {c.title && <RowTitle color={c.color_title} style={revealStyle(isVisible, 0)}><span className="block">{c.title}</span></RowTitle>}
          </div>
          {c.link_label && (
            <span style={revealStyle(isVisible, 0.2)}><AllPostsButton to={listHref} label={c.link_label} /></span>
          )}
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5" style={revealStyle(isVisible, 0.3)}>
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
    </RowSection>
  );
};

export default FromTheBlogRow;
