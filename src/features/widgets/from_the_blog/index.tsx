/**
 * From the blog — registry entry point.
 *
 * Recent posts as an editable row (heading, categories, count, link).
 * Replaces the hard-coded section that used to sit under service pages
 * outside the row stack.
 */
import { lazy } from "react";
import { registerWidget } from "@/lib/WidgetRegistry";
import { Newspaper } from "lucide-react";
import FromTheBlogRow from "./FromTheBlogRow";
import { fromTheBlogSchema, FROM_THE_BLOG_DEFAULTS, type FromTheBlogContent } from "./schema";

// Lazy on purpose: this file is imported at boot for the public site.
const FromTheBlogAdmin = lazy(() => import("./FromTheBlogAdmin"));

registerWidget<FromTheBlogContent>({
  type: "from_the_blog",
  label: "From the blog",
  icon: Newspaper,
  category: "Content",
  schema: fromTheBlogSchema,
  defaultData: FROM_THE_BLOG_DEFAULTS,
  adminComponent: FromTheBlogAdmin,
  frontendComponent: FromTheBlogRow,
  render: ({ row }) => <FromTheBlogRow row={row} />,
});

export { fromTheBlogSchema, FROM_THE_BLOG_DEFAULTS };
export type { FromTheBlogContent } from "./schema";
