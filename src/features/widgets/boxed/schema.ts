/**
 * Boxed row — content schema.
 *
 * The ONE description of what a "boxed" row stores. `BoxedContent` is
 * inferred from it and used by the renderer (BoxedRow.tsx) and the
 * editor (BoxedRowEditor.tsx / BoxedArrayField.tsx), so a field renamed
 * or mistyped in one is a compile error in the other, not a silently
 * blank card. `defaultData` in the registry is `boxedSchema.parse({})`,
 * so there is no second hand-written defaults object to drift.
 *
 * Every field is optional with a default: stored rows were written by
 * many admin versions and by hand, and the public site must render all
 * of them. `looseObject` lets the engine's meta keys (`__design`,
 * `__slug`, `__global_ref`) pass through untouched.
 *
 * `zod/mini`, not `zod`: this schema is imported by the PUBLIC bundle
 * (the renderer validates at the render boundary). The classic zod API
 * added ~70 kB to the vendor chunk; the mini build is tree-shakable and
 * costs a few kB. Same inferred types, functional call style
 * (`z.optional(z.string())` instead of `z.string().optional()`).
 */
import * as z from "zod/mini";

const str = (fallback = "") => z._default(z.string(), fallback);
/** Optional hex/CSS colour; "" means "use the row's/theme's default". */
const color = () => str("");

export const boxedCardSchema = z.looseObject({
  title: str(),
  /** Rich text (sanitised HTML). */
  body: str(),
  /** IconValue for the icon shown above the title. */
  icon: z.optional(z.string()),
  /** Per-card colour for icon, title and 3px top border. */
  accent_color: z.optional(z.string()),
  /** If set, the whole card becomes a link. */
  link_url: z.optional(z.string()),
  /** Optional CTA button under the card body. */
  cta_label: z.optional(z.string()),
  cta_url: z.optional(z.string()),
});

export const boxedSchema = z.looseObject({
  /* ── Section header (shared vocabulary with every other row) ── */
  eyebrow: str(),
  color_eyebrow: color(),
  /** Title lines: plain strings or `<p>…</p>` HTML, one per visual line. */
  title_lines: z._default(z.array(z.string()), []),
  /** Optional icon (IconValue) rendered next to the title. */
  icon: z.optional(z.string()),
  color_title: color(),
  subtitle: str(),
  subtitle_color: color(),
  subtitle_handwritten: z._default(z.boolean(), false),

  /* ── The cards ── */
  cards: z._default(z.array(boxedCardSchema), []),
  color_card_title: color(),
  color_card_body: color(),

  /* ── Footer bits ── */
  note: str(),
  color_note: color(),
  cta_label: str(),
  cta_url: str(),
  show_subscribe: z._default(z.boolean(), false),

  /* ── Optional cover image (RowCoverCard) ── */
  cover_image: str(),
  cover_image_alt: str(),
  cover_image_ratio: z.optional(z.string()),
  cover_image_focal_x: z.optional(z.number()),
  cover_image_focal_y: z.optional(z.number()),
});

export type BoxedCard = z.infer<typeof boxedCardSchema>;
export type BoxedContent = z.infer<typeof boxedSchema>;

export const BOXED_DEFAULTS: BoxedContent = boxedSchema.parse({});
