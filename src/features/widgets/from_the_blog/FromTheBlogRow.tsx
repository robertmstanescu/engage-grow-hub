import { parseContent } from "@/lib/parseContent";
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
import { shortDate } from "@/lib/shortDate";
import { useTagColors } from "@/hooks/useTagColors";
import { useArticle } from "@/features/widgets/article/articleContext";
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

const FromTheBlogRow = ({ row }: { row: PageRow }) => {
  const c = parseContent(fromTheBlogSchema, row.content);
  const [posts, setPosts] = useState<PostLite[]>([]);
  const [looked, setLooked] = useState(false);
  const { enabled: builderEnabled } = useBuilder();
  const { ref, isVisible } = useScrollReveal();
  const catKey = c.categories.join("|");
  // On a post page the row never offers the post being read.
  const currentSlug = useArticle()?.slug || "";
  const { getCategoryColors } = useTagColors();

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
        setPosts(data ? pickPosts((data as PostLite[]).filter((p) => p.slug !== currentSlug), catKey.split("|"), c.limit) : []);
        setLooked(true);
      }, () => { if (!cancelled) setLooked(true); });
    return () => { cancelled = true; };
  }, [catKey, c.limit, currentSlug]);

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
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div>
            {c.eyebrow && <RowEyebrow color={c.color_eyebrow} style={revealStyle(isVisible, -0.5)}>{c.eyebrow}</RowEyebrow>}
            {c.title && <RowTitle color={c.color_title} className="!mb-0" style={revealStyle(isVisible, 0)}><span className="block">{c.title}</span></RowTitle>}
          </div>
          {c.link_label && (
            <span style={revealStyle(isVisible, 0.2)}><AllPostsButton to={listHref} label={c.link_label} /></span>
          )}
        </div>
        {/* Cards follow the artboards: 180px picture, category chip in its
            own colour beside the date, 20px title, three lines of excerpt. */}
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6" style={revealStyle(isVisible, 0.3)}>
          {posts.map((p) => {
            const chip = p.category ? getCategoryColors(p.category) : null;
            return (
              <li key={p.slug}>
                <Link to={`/blog/${p.slug}/`} className="glass rounded-3xl group flex flex-col h-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
                  {p.cover_image && (
                    <img src={transformImageUrl(p.cover_image, { width: 640, aspectRatio: 16 / 9, quality: 70 })} alt={p.cover_image_alt || ""} loading="lazy" decoding="async" className="block w-full h-[180px] object-cover" />
                  )}
                  <span className="flex flex-col flex-1 gap-3 p-6">
                    <span className="flex flex-wrap items-center gap-2.5">
                      {p.category && chip && (
                        <span className="font-body text-[11px] font-bold tracking-[0.14em] uppercase px-3 py-1.5 rounded-full" style={{ backgroundColor: chip.bgColor, color: chip.textColor }}>{p.category}</span>
                      )}
                      {p.published_at && <span className="font-body text-[13px]" style={{ color: "hsl(var(--body))" }}>{shortDate(p.published_at)}</span>}
                    </span>
                    <span className="block font-display font-bold leading-[1.22] flex-grow group-hover:opacity-80" style={{ color: "hsl(var(--heading))", fontSize: "var(--fs-grid-card-title)", overflowWrap: "anywhere" }}>{p.title}</span>
                    {p.excerpt && <span className="font-body text-[15px] leading-[1.6] line-clamp-3" style={{ color: "hsl(var(--body))" }}>{p.excerpt}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </RowSection>
  );
};

export default FromTheBlogRow;
