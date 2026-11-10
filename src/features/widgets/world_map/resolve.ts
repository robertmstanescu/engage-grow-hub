import { MAP_COUNTRIES, type MapCountry } from "./mapData";
import type { WorldMapContent } from "./schema";

export type MapStatus = "worked" | "hr" | "main";

/** Case/space-insensitive lookup of a country name against the map art. */
export const findCountry = (name: string): MapCountry | undefined => {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return MAP_COUNTRIES.find((c) => c.name.toLowerCase() === needle);
};

/** Split a pasted list (one per line, or comma/semicolon-separated). */
export const parseCountryPaste = (text: string): string[] =>
  text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Resolve the three owner-edited lists into a status per country.
 * A country in several groups gets the LAST one's status
 * (worked < hr < main in list order), so moving a country "up" is just
 * adding it to a later list.
 */
export const resolveMapGroups = (c: WorldMapContent): Map<string, MapStatus> => {
  const out = new Map<string, MapStatus>();
  const groups: [string[], MapStatus][] = [
    [c.worked || [], "worked"],
    [c.hr || [], "hr"],
    [c.main || [], "main"],
  ];
  for (const [names, status] of groups) {
    for (const raw of names) {
      const hit = findCountry(raw);
      if (hit) out.set(hit.name, status);
    }
  }
  return out;
};

/** The artboard's built-in shading, used when the owner has set nothing. */
export const defaultMapGroups = (): Map<string, MapStatus> => {
  const out = new Map<string, MapStatus>();
  for (const c of MAP_COUNTRIES) out.set(c.name, c.status);
  return out;
};

export const hasAnyGroup = (c: WorldMapContent): boolean =>
  (c.worked || []).length + (c.hr || []).length + (c.main || []).length > 0;

/** Counter maths: comms = every shaded country; HR = hr + main. */
export const mapCounters = (groups: Map<string, MapStatus>): { comms: number; hr: number } => {
  let comms = 0;
  let hr = 0;
  for (const status of groups.values()) {
    comms += 1;
    if (status === "hr" || status === "main") hr += 1;
  }
  return { comms, hr };
};

/** One-line hover/focus label for a country. */
export const statusLabel = (status: MapStatus, c: WorldMapContent): string =>
  status === "main" ? c.legend_main || "Main markets today"
    : status === "hr" ? c.legend_hr || "Internal comms and HR"
    : c.legend_worked || "Internal comms";
