import type { PageRow } from "@/types/rows";
import { useArticle } from "./articleContext";

/**
 * ArticleRow — the post's own words.
 *
 * Deliberately NOT a RowSection: no card or background of its own. It is
 * the 720px reading column of the BlogPost artboard, centred under the
 * cover (`.article-column` in index.css). `data-row-part="body"` gives
 * paragraphs, lists and headings their styles; the section attributes
 * keep the builder and the screenshot suite able to find it.
 */
const ArticleRow = ({ row }: { row: PageRow }) => {
  const article = useArticle();
  if (!article || !article.html.trim()) return null;
  return (
    <section data-row-type="article" data-row-id={row.id} className="article-column w-full">
      <div
        className="font-body"
        data-row-part="body"
        data-article-body
        dangerouslySetInnerHTML={{ __html: article.html }}
      />
    </section>
  );
};

export default ArticleRow;
