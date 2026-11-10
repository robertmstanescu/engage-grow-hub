/**
 * The owner's list of the 36 countries worked in (Robert, 12 Oct 2026),
 * kept in one place: the section-library starter and the redesign's
 * homepage row both read it. Never add or remove a country here without
 * the owner's word.
 *
 * - `hr`: internal comms AND HR (15, purple).
 * - `worked`: internal comms only (21, gold). Hong Kong and Singapore
 *   are drawn as dots.
 * - `main`: main markets today (Cobalt Blue #0047AB). Norway, Finland and
 *   Denmark joined on 10 Nov 2026 (owner). Romania is a market only:
 *   shaded, but not one of the 36 and not counted.
 * - Congo is the Democratic Republic of the Congo (Kinshasa).
 */
export const OWNER_MAP_LIST = {
  hr: [
    "United States", "Colombia", "Mexico", "United Kingdom", "Netherlands",
    "France", "Belgium", "Spain", "Germany", "Switzerland", "Denmark",
    "Sweden", "Finland", "Norway", "Australia",
  ],
  worked: [
    "Canada", "Peru", "Ecuador", "Brazil", "Israel", "Italy", "Austria",
    "Serbia", "Kenya", "South Africa", "Mozambique", "Tanzania",
    "Democratic Republic of the Congo", "Thailand", "China", "India",
    "Cambodia", "Indonesia", "Japan", "Hong Kong", "Singapore",
  ],
  main: ["Sweden", "Norway", "Finland", "Denmark", "Spain", "United Kingdom", "United States", "Romania"],
} as const;

/** Copy for the row, from the homepage artboard and the owner's notes. */
export const OWNER_MAP_COPY = {
  eyebrow: "Where the work has travelled",
  title_lines: ["36 countries.", "One comms function."],
  lede: "Town halls across time zones, onboarding in every office and news that lands the same day wherever people sit. Gold marks internal comms. Purple marks the countries where the work covered HR as well, and blue marks the main markets today.",
  legend_note: "Learning and development: all 36",
} as const;
