/**
 * Work teaser — content schema.
 *
 * A row of work cards (homepage, service pages). The row stores only
 * what the owner decides; the items themselves come from `work_items`
 * at render time. `auto` takes the newest published items of a pillar
 * (or featured items when no pillar is set); `picked` uses the row's
 * own list in order. Any override left empty falls back to the item's
 * field at render time, so fixing a typo on the item fixes every page
 * that did not override it.
 *
 * `zod/mini` because this schema ships in the PUBLIC bundle.
 */
import * as z from "zod/mini";

const str = (fallback = "") => z._default(z.string(), fallback);

const overridesSchema = z.looseObject({
  title: str(),
  summary: str(),
  metric: str(),
  metric_label: str(),
  pull_line: str(),
  image: str(),
  image_alt: str(),
  link_text: str(),
  hide_image: z._default(z.boolean(), false),
});

const itemSchema = z.looseObject({
  work_item_id: str(),
  /** Per-card style override; empty = the row's default_style, then the item's. */
  style: str(),
  overrides: z._default(overridesSchema, () => overridesSchema.parse({})),
});

export const workTeaserSchema = z.looseObject({
  /** Small label above the heading. */
  eyebrow: str(),
  /** The heading. */
  title: str("Selected work"),
  /** Text on the button that leads to /work; empty hides it. */
  link_label: str("All work"),
  /** auto = newest of the pillar (or featured); picked = the list below. */
  mode: z._default(z.enum(["auto", "picked"]), "auto"),
  /** Pillar short key (ic/ex/ops/hrbp/pay/mgr); empty = featured items. */
  pillar: str(),
  /** Limit to these item types (case/artefact/playbook); empty = all. */
  types: z._default(z.array(z.string()), [] as string[]),
  /** How many cards. */
  limit: z._default(z.number(), 3),
  /** Row-level card style; empty = each item's own style. */
  default_style: str(),
  /** Picked cards, in order. */
  items: z._default(z.array(itemSchema), [] as z.infer<typeof itemSchema>[]),
  color_eyebrow: str(),
  color_title: str(),
});

export type WorkTeaserContent = z.infer<typeof workTeaserSchema>;
export type WorkTeaserItem = z.infer<typeof itemSchema>;
export const WORK_TEASER_DEFAULTS: WorkTeaserContent = workTeaserSchema.parse({});
