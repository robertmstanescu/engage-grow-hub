/**
 * ─────────────────────────────────────────────────────────────────────────
 * BoxedArrayField.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Manages the `cards[]` array on a Boxed-type page row. Each card has a
 * plain-text title and a rich-text body; the admin may have between 0 and
 * 6 cards per row (the cap matches what the front-end Boxed renderer can
 * fit on a single grid).
 *
 * PROPS
 * ─────
 *   content : Record<string, any>             — row's full content object;
 *                                                cards live at content.cards
 *   onChange: (field, value) => void          — same pattern as every other
 *                                                editor: write back to the
 *                                                row's content slice
 *   bgColor?: string                          — forwarded to RichField so
 *                                                the editor surface tracks
 *                                                the row's chosen colour
 *
 * WHY IT WAS EXTRACTED
 * ────────────────────
 * Originally a small in-file helper inside AdminDashboard.tsx. We lifted
 * it into editors/ because (a) it's purely about boxed-card content, and
 * (b) it isolates the 6-item cap and add/delete logic from the dashboard.
 *
 * STYLES — INLINE → TAILWIND
 * ──────────────────────────
 * Two leftover `style={{ color: "hsl(var(--…))" }}` blocks were converted
 * to `text-muted-foreground`, `text-primary`, `text-destructive`, and the
 * `border-primary/30` border colour utility. Visual output unchanged
 * because these classes resolve to the very same CSS tokens.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { Plus, Trash2 } from "lucide-react";
import { Field, RichField, SectionBox } from "../site-editor/FieldComponents";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}

const BoxedArrayField = ({ content, onChange, bgColor }: Props) => {
  /** Tolerate older rows that might have no `cards` field at all. */
  const cards: { title: string; body: string }[] = content.cards || [];

  /**
   * Update a single card's field. We deliberately spread the existing
   * card object so untouched fields (e.g. `body` when editing `title`)
   * don't get clobbered.
   */
  const updateCard = (idx: number, field: string, value: string) => {
    const next = [...cards];
    next[idx] = { ...next[idx], [field]: value };
    onChange("cards", next);
  };

  return (
    <div>
      {/* Header row: label + add button. The button disables itself once
          we hit the 6-card cap so the admin can't push past the design. */}
      <div className="flex items-center justify-between mb-1">
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
          Cards (max 6)
        </label>
        <button
          type="button"
          onClick={() => onChange("cards", [...cards, { title: "", body: "" }])}
          disabled={cards.length >= 6}
          className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 disabled:opacity-30 text-primary border border-primary/30"
        >
          <Plus size={10} /> Add Card
        </button>
      </div>

      {/* One SectionBox per card. Title + delete on row 1, RichField on row 2. */}
      <div className="space-y-2">
        {cards.map((card, i) => (
          <SectionBox key={i} label={`Card ${i + 1}`}>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field label="Title" value={card.title} onChange={(v) => updateCard(i, "title", v)} />
                </div>
                <button
                  type="button"
                  onClick={() => onChange("cards", cards.filter((_, j) => j !== i))}
                  className="self-start p-2 rounded hover:opacity-70 mt-5 text-destructive"
                  aria-label={`Delete card ${i + 1}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <RichField label="Body" value={card.body} onChange={(v) => updateCard(i, "body", v)} bgColor={bgColor} />
            </div>
          </SectionBox>
        ))}
      </div>
    </div>
  );
};

export default BoxedArrayField;
