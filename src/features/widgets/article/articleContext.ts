import { createContext, useContext } from "react";

/**
 * The post an article block belongs to. `BlogPost` (public) and
 * `BlogPostBuilder` (canvas) provide it; `ArticleRow` reads it. Outside a
 * post there is nothing to show, so the block renders nothing.
 */
export interface ArticleSource {
  /** Sanitised HTML of the post body. */
  html: string;
}

export const ArticleContext = createContext<ArticleSource | null>(null);
export const useArticle = () => useContext(ArticleContext);
