/**
 * Shared names and the type chip for every Work surface (index, card,
 * case study). One list, so a pillar or type is never spelled two ways.
 *
 * The chip is the page's honesty label (redesign: Work artboard):
 *   CASE      gold, filled   — real past work, anonymised
 *   ARTEFACT  lilac, outline — a real deliverable or a faithful recreation
 *   PLAYBOOK  gold outline   — how we would do it, on a fictional company
 * An unknown type prints nothing: a chip never shows raw data.
 */
export const PILLAR_NAMES: Record<string, string> = {
  ic: "Internal Communications",
  ex: "Employee Experience",
  ops: "People Operations",
  hrbp: "Fractional HRBP",
  pay: "Pay Transparency",
  mgr: "Manager Enablement",
};

export const TYPE_CHIP: Record<string, string> = { case: "Case", artefact: "Artefact", playbook: "Playbook" };
export const TYPE_PLURAL: Record<string, string> = { case: "Cases", artefact: "Artefacts", playbook: "Playbooks" };
export const TYPE_MEANING: Record<string, string> = {
  case: "real past work, anonymised",
  artefact: "a real deliverable, or a faithful recreation",
  playbook: "how we would do it, on a fictional company",
};

/** A known pillar's name, or nothing: unknown keys never reach the page. */
export const pillarName = (key: string | null | undefined): string => (key && PILLAR_NAMES[key]) || "";
