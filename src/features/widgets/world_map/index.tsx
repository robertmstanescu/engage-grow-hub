/**
 * World map — registry entry point.
 *
 * The "where the work has travelled" map from the redesign: countries
 * shaded by how far the work went, with counters, a legend and a
 * replayable draw-on animation.
 */
import { lazy } from "react";
import { registerWidget } from "@/lib/WidgetRegistry";
import { Globe2 } from "lucide-react";
import WorldMapRow from "./WorldMapRow";
import { worldMapSchema, WORLD_MAP_DEFAULTS, type WorldMapContent } from "./schema";

// Lazy on purpose: this file is imported at boot for the public site.
const WorldMapEditor = lazy(() => import("./WorldMapEditor"));

registerWidget<WorldMapContent>({
  type: "world_map",
  label: "World map",
  icon: Globe2,
  category: "Content",
  schema: worldMapSchema,
  defaultData: WORLD_MAP_DEFAULTS,
  adminComponent: WorldMapEditor,
  frontendComponent: WorldMapRow,
  render: ({ row }) => <WorldMapRow row={row} />,
});

export { worldMapSchema, WORLD_MAP_DEFAULTS };
export type { WorldMapContent } from "./schema";
