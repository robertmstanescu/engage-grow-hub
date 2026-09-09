import * as z from "zod/mini";

/**
 * The article block has no fields of its own: the words live in the
 * post's `content` column and are edited under Posts → Content. The
 * schema exists so the registry contract (schema + defaults + editor)
 * holds for every row type.
 */
export const articleSchema = z.looseObject({});
export type ArticleContent = z.infer<typeof articleSchema>;
export const ARTICLE_DEFAULTS: ArticleContent = articleSchema.parse({});
