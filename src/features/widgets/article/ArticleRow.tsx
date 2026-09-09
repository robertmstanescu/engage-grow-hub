import type { PageRow } from "@/types/rows";
import { useArticle } from "./articleContext";

/**
 * ArticleRow — the post's own words.
 *
 * Deliberately NOT a RowSection: the article sits in the post's own
 * reading column, flush with the headline above it, with no row padding,
 * card or background of its own. `data-row-part="body"` gives
 * paragraphs, lists and headings their styles; the section attributes
 * keep the builder and the screenshot suite able to find it.
 */
const ArticleRow = ({ row }: { row: PageRow }) => {
  const article = useArticle();
  if (!article || !article.html.trim()) return null;
  return (
    <section data-row-type="article" data-row-id={row.id} className="w-full pt-2 pb-6">
      <div
        className="measure font-body font-medium leading-[var(--lh-body)] [&_p]:my-[var(--para-space)]"
        data-row-part="body"
        data-article-body
        style={{ fontSize: "var(--fs-body)", color: "hsl(var(--foreground) / 0.78)" }}
        dangerouslySetInnerHTML={{ __html: article.html }}
      />
    </section>
  );
};

export default ArticleRow;
