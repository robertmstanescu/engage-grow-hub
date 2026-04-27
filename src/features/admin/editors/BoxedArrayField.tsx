/**
 * BoxedArrayField — manages cards[] on a Boxed-type page row.
 *
 * Each card supports:
 *   - icon       (IconValue)        optional icon shown above the title
 *   - title      (text)
 *   - body       (rich text)
 *   - link_url   (string)           if set, the whole card becomes a link
 *   - cta_label  (string)           optional CTA button under the box
 *   - cta_url    (string)
 */

import { Plus, Trash2 } from "lucide-react";
import { Field, RichField, SectionBox } from "../site-editor/FieldComponents";
import { IconPickerField } from "@/features/icons/IconPicker";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}

interface BoxedCard {
  title: string;
  body: string;
  icon?: string;
  link_url?: string;
  cta_label?: string;
  cta_url?: string;
}

const BoxedArrayField = ({ content, onChange, bgColor }: Props) => {
  const cards: BoxedCard[] = content.cards || [];

  const updateCard = (idx: number, field: keyof BoxedCard, value: string) => {
    const next = [...cards];
    next[idx] = { ...next[idx], [field]: value };
    onChange("cards", next);
  };

  return (
    <div>
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

              <IconPickerField
                label="Icon (above title)"
                value={card.icon}
                onChange={(v) => updateCard(i, "icon", v)}
              />

              <RichField label="Body" value={card.body} onChange={(v) => updateCard(i, "body", v)} bgColor={bgColor} />

              <Field
                label="Hyperlink the box (URL or #section-id)"
                value={card.link_url || ""}
                onChange={(v) => updateCard(i, "link_url", v)}
                hint="Make the whole card a link. e.g. /pricing or #our-services"
              />

              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="CTA button label"
                  value={card.cta_label || ""}
                  onChange={(v) => updateCard(i, "cta_label", v)}
                />
                <Field
                  label="CTA button URL"
                  value={card.cta_url || ""}
                  onChange={(v) => updateCard(i, "cta_url", v)}
                />
              </div>
            </div>
          </SectionBox>
        ))}
      </div>
    </div>
  );
};

export default BoxedArrayField;
