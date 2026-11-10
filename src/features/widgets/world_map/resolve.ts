import { MAP_COUNTRIES, MAP_DOTS } from "./mapData";
import type { WorldMapContent } from "./schema";

export type MapStatus = "worked" | "hr" | "main";

/** Every place the map can shade: country shapes, then the small-place dots. */
export const MAP_PLACES: { name: string; status: MapStatus }[] = [...MAP_COUNTRIES, ...MAP_DOTS];

/** Names people type that mean a place on the map under another name. */
const ALIASES: Record<string, string> = {
  "usa": "United States",
  "united states of america": "United States",
  "uk": "United Kingdom",
  "great britain": "United Kingdom",
  "drc": "Democratic Republic of the Congo",
  "dr congo": "Democratic Republic of the Congo",
  "congo (kinshasa)": "Democratic Republic of the Congo",
  "congo-kinshasa": "Democratic Republic of the Congo",
  "hong kong (dot)": "Hong Kong",
  "singapore (dot)": "Singapore",
};

/** Case/space-insensitive lookup of a place name against the map art. */
export const findCountry = (name: string): { name: string; status: MapStatus } | undefined => {
  const typed = (typeof name === "string" ? name : "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!typed) return undefined;
  const needle = (ALIASES[typed] || typed).toLowerCase();
  return MAP_PLACES.find((c) => c.name.toLowerCase() === needle);
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
  for (const c of MAP_PLACES) out.set(c.name, c.status);
  return out;
};

export const hasAnyGroup = (c: WorldMapContent): boolean =>
  (c.worked || []).length + (c.hr || []).length + (c.main || []).length > 0;

/**
 * The places that count as "worked in": everything in the comms list or
 * the HR list. A main market that is in neither (Romania) is shaded but
 * is a market only, so it is left out of the counters. It still names
 * itself on hover (owner, 10 Nov 2026).
 */
export const workedPlaces = (c: WorldMapContent): { comms: Set<string>; hr: Set<string> } => {
  const comms = new Set<string>();
  const hr = new Set<string>();
  for (const raw of c.worked || []) { const hit = findCountry(raw); if (hit) comms.add(hit.name); }
  for (const raw of c.hr || []) { const hit = findCountry(raw); if (hit) { comms.add(hit.name); hr.add(hit.name); } }
  return { comms, hr };
};

/** Counter maths: comms = every worked place; HR = the HR list. */
export const mapCounters = (c: WorldMapContent): { comms: number; hr: number } => {
  const { comms, hr } = workedPlaces(c);
  return { comms: comms.size, hr: hr.size };
};

/** One-line hover/focus label for a country. */
export const statusLabel = (status: MapStatus, c: WorldMapContent): string =>
  status === "main" ? c.legend_main || "Main markets today"
    : status === "hr" ? c.legend_hr || "Internal comms and HR"
    : c.legend_worked || "Internal comms";
