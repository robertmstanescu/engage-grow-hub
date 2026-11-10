/**
 * BoxedArrayField — manages cards[] on a Boxed-type page row.
 *
 * Each card supports:
 *   - icon         (IconValue)      optional icon shown above the title
 *   - title        (text)
 *   - body         (rich text)
 *   - accent_color (hex)            optional per-card colour for the icon,
 *                                   title and a 3px top border; overrides
 *                                   the row's "Card Title Color". A card
 *                                   linking to a service pillar uses that
 *                                   pillar's colour instead (BoxedRow.tsx)
 *   - link_url     (string)         if set, the whole card becomes a link
 *   - cta_label    (string)         optional CTA button under the box
 *   - cta_url      (string)
 */

import { Plus, Trash2 } from "lucide-react";
import { Field, RichField, SectionBox, ColorField, SelectField } from "../site-editor/FieldComponents";
import { IconPickerField } from "@/features/icons/IconPicker";
import { PILLAR_COLORS, PILLAR_KEY_TO_SLUG } from "@/lib/constants/pillarColors";
import type { BoxedCard } from "@/features/widgets/boxed/schema";

const PILLAR_OPTIONS = [
  { label: "None", value: "" },
  ...Object.keys(PILLAR_COLORS).map((slug) => ({
    label: Object.entries(PILLAR_KEY_TO_SLUG).find(([, s]) => s === slug)?.[0]?.toUpperCase() || slug,
    value: slug,
  })),
];

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
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
          className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md hover:opacity-70 disabled:opacity-30 text-primary border border-primary/30"
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

              <div className="grid grid-cols-2 gap-2">
                <SelectField
                  label="Card look"
                  value={card.variant || ""}
                  onChange={(v) => updateCard(i, "variant", v)}
                  options={[
                    { label: "Default", value: "" },
                    { label: "Glass", value: "glass" },
                    { label: "Dark", value: "dark" },
                    { label: "Pillar", value: "pillar" },
                  ]}
                />
                {(card.variant === "pillar" || content.layout_mode === "list") && (
                  <SelectField
                    label="Pillar"
                    value={card.pillar || ""}
                    onChange={(v) => updateCard(i, "pillar", v)}
                    options={PILLAR_OPTIONS}
                  />
                )}
              </div>

              {content.layout_mode === "list" && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Small line under the title" value={card.meta || ""} onChange={(v) => updateCard(i, "meta", v)} />
                  <Field label="Price (right side)" value={card.price || ""} onChange={(v) => updateCard(i, "price", v)} />
                </div>
              )}

              <ColorField
                label="Accent colour"
                description="Icon, title and top border for this card only. Leave empty to use the row's Card Title Color."
                value={card.accent_color || ""}
                fallback=""
                onChange={(v) => updateCard(i, "accent_color", v)}
              />

              <Field
                label="Link the whole card"
                value={card.link_url || ""}
                onChange={(v) => updateCard(i, "link_url", v)}
                hint="Make the whole card a link. e.g. /pricing or #our-services"
              />

              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Button text"
                  value={card.cta_label || ""}
                  onChange={(v) => updateCard(i, "cta_label", v)}
                />
                <Field
                  label="Button link"
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
