/**
 * Work teaser — registry entry point.
 *
 * Work cards as an editable row (heading, mode, pillar, count, link),
 * beside `from_the_blog`. The items come from `work_items` at render
 * time; the row hides itself when it resolves to nothing.
 */
import { lazy } from "react";
import { registerWidget } from "@/lib/WidgetRegistry";
import { Briefcase } from "lucide-react";
import WorkTeaserRow from "./WorkTeaserRow";
import { workTeaserSchema, WORK_TEASER_DEFAULTS, type WorkTeaserContent } from "./schema";

// Lazy on purpose: this file is imported at boot for the public site.
const WorkTeaserAdmin = lazy(() => import("./WorkTeaserAdmin"));

registerWidget<WorkTeaserContent>({
  type: "work_teaser",
  label: "Work teaser",
  icon: Briefcase,
  category: "Content",
  schema: workTeaserSchema,
  defaultData: WORK_TEASER_DEFAULTS,
  adminComponent: WorkTeaserAdmin,
  frontendComponent: WorkTeaserRow,
  render: ({ row }) => <WorkTeaserRow row={row} />,
});

export { workTeaserSchema, WORK_TEASER_DEFAULTS };
export type { WorkTeaserContent };
