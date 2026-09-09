import type { PageRow } from "@/types/rows";
import RowSection from "@/features/site/rows/typography/RowSection";
import { useArticle } from "./articleContext";

/**
 * ArticleRow — the post's own words as a centred reading column.
 *
 * Renders the HTML provided by the surrounding post (see articleContext)
 * with the same body rules as every other row (`data-row-part="body"`
 * gives paragraphs, lists and headings their styles). No card, no
 * background of its own; the row's Style tab still applies if wanted.
 */
const ArticleRow = ({ row }: { row: PageRow }) => {
  const article = useArticle();
  if (!article || !article.html.trim()) return null;
  return (
    <RowSection row={row} grain={false} className="">
      <div className="relative z-10 w-full">
        <div
          className="measure mx-auto font-body font-medium leading-[var(--lh-body)] [&_p]:my-[var(--para-space)]"
          data-row-part="body"
          data-article-body
          style={{ fontSize: "var(--fs-body)", color: "hsl(var(--foreground) / 0.78)" }}
          dangerouslySetInnerHTML={{ __html: article.html }}
        />
      </div>
    </RowSection>
  );
};

export default ArticleRow;
