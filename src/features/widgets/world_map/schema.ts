import * as z from "zod/mini";

const str = (fallback = "") => z._default(z.string(), fallback);
const strList = () => z._default(z.array(z.string()), [] as string[]);

/**
 * World map row (redesign Main artboard): a glass card with a world map
 * where countries are shaded by how far the work went there. Countries
 * are grouped by the owner pasting names into three lists; the LAST
 * group a country appears in wins (resolveMapGroups).
 */
export const worldMapSchema = z.looseObject({
  eyebrow: str(),
  title_lines: strList(),
  lede: str(),
  /** Country names, one per line or comma-separated. Last group wins. */
  worked: strList(),
  hr: strList(),
  main: strList(),
  worked_label: str("countries in internal comms"),
  hr_label: str("with HR as well"),
  main_label: str("main markets today"),
  legend_worked: str("Internal comms"),
  legend_hr: str("Internal comms and HR"),
  legend_main: str("Main markets today"),
  legend_note: str(),
});

export type WorldMapContent = z.infer<typeof worldMapSchema>;
export const WORLD_MAP_DEFAULTS: WorldMapContent = worldMapSchema.parse({});
