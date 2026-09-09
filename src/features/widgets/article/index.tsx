import { lazy } from "react";
import { registerWidget } from "@/lib/WidgetRegistry";
import { FileText } from "lucide-react";
import ArticleRow from "./ArticleRow";
import { articleSchema, ARTICLE_DEFAULTS, type ArticleContent } from "./schema";

const ArticleAdmin = lazy(() => import("./ArticleAdmin"));

registerWidget<ArticleContent>({
  type: "article",
  label: "Article",
  icon: FileText,
  category: "Content",
  schema: articleSchema,
  defaultData: ARTICLE_DEFAULTS,
  adminComponent: ArticleAdmin,
  frontendComponent: ArticleRow,
  render: ({ row }) => <ArticleRow row={row} />,
});

export { articleSchema, ARTICLE_DEFAULTS };
export type { ArticleContent } from "./schema";
