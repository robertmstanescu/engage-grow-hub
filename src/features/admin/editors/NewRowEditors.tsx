/**
 * ─────────────────────────────────────────────────────────────────────────
 * NewRowEditors.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Admin editor blocks for the three new row types:
 *   • TestimonialEditor — manages an array of `TestimonialItem`
 *   • LogoCloudEditor   — manages an eyebrow + array of logo URLs
 *   • FaqEditor         — manages an array of `FaqItem`
 *
 * DATA CONTRACT (junior-engineer guide)
 * ─────────────────────────────────────
 * Each editor receives the row's `content` JSON and a generic
 * `onChange(field, value)` handler. The handler writes back to whichever
 * column is active (driven by `RowContentEditor.tsx` upstream). So when
 * we call `onChange("items", nextItems)` the array gets persisted to
 * `content.items` for the active column.
 *
 * To add a new field to any of these editors:
 *   1. Add a new <Field>/<RichField>/<ImagePickerField> below.
 *   2. Wire its `onChange` to update the relevant slot of `content`.
 *   3. Read it from the matching public renderer (TestimonialRow.tsx, …).
 * No schema migration needed — `content` is JSON.
 *
 * STYLING NOTE
 * ────────────
 * All visuals come from the shared <Field>/<SectionBox>/<RichField>
 * primitives in `FieldComponents.tsx`. Don't apply raw colors here —
 * the surface inherits the active theme through those primitives.
 * ───────────────────────────────────────────────────────────────────────── */

import { Field, RichField, SectionBox } from "../site-editor/FieldComponents";
import ImagePickerField from "../ImagePickerField";
import { Plus, Trash2 } from "lucide-react";
import type { TestimonialItem, FaqItem, LogoCloudLogo } from "@/types/rows";

/* ────────────────────────────────────────────────────────────────────
 * Reusable "card list" primitive — renders a header + add/remove
 * controls around an array editor. Saves duplication across the three
 * editors below.
 * ──────────────────────────────────────────────────────────────────── */
interface ArrayCardListProps<T> {
  label: string;
  items: T[];
  onChange: (next: T[]) => void;
  newItem: () => T;
  renderItem: (item: T, index: number, update: (next: T) => void) => React.ReactNode;
  addLabel?: string;
}
function ArrayCardList<T>({ label, items, onChange, newItem, renderItem, addLabel = "Add item" }: ArrayCardListProps<T>) {
  return (
    <SectionBox label={label}>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border border-border rounded-lg p-3 bg-background/40 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="font-display text-[10px] uppercase tracking-[0.1em] text-muted-foreground">#{i + 1}</span>
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-destructive p-1 rounded hover:bg-destructive/10"
                aria-label="Remove item"
              >
                <Trash2 size={12} />
              </button>
            </div>
            {renderItem(item, i, (next) => {
              const copy = [...items];
              copy[i] = next;
              onChange(copy);
            })}
          </div>
        ))}
        <button
          onClick={() => onChange([...items, newItem()])}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] font-body text-secondary border border-secondary/40 rounded-full px-3 py-1.5"
        >
          <Plus size={12} /> {addLabel}
        </button>
      </div>
    </SectionBox>
  );
}

/* ──────────────────────────────────── Testimonial editor ──────────── */
export const TestimonialEditor = ({
  content,
  onChange,
  bgColor,
}: {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}) => {
  const items: TestimonialItem[] = Array.isArray(content.items) ? content.items : [];
  return (
    <div className="space-y-3">
      <Field label="Eyebrow (optional)" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
      <Field label="Subtitle (optional)" value={content.subtitle || ""} onChange={(v) => onChange("subtitle", v)} />
      <ArrayCardList<TestimonialItem>
        label="Testimonials"
        items={items}
        onChange={(next) => onChange("items", next)}
        newItem={() => ({ quote: "<p></p>", name: "", role: "", avatar: "", avatar_alt: "" })}
        addLabel="Add testimonial"
        renderItem={(item, _i, update) => (
          <>
            <RichField
              label="Quote"
              value={item.quote || ""}
              onChange={(v) => update({ ...item, quote: v })}
              bgColor={bgColor}
            />
            <Field label="Name" value={item.name || ""} onChange={(v) => update({ ...item, name: v })} />
            <Field label="Role / Company" value={item.role || ""} onChange={(v) => update({ ...item, role: v })} />
            <ImagePickerField
              label="Avatar (optional)"
              value={item.avatar || ""}
              onChange={(v) => update({ ...item, avatar: v })}
              altValue={item.avatar_alt || ""}
              onAltChange={(v) => update({ ...item, avatar_alt: v })}
            />
          </>
        )}
      />
    </div>
  );
};

/* ──────────────────────────────────── Logo cloud editor ───────────── */
export const LogoCloudEditor = ({
  content,
  onChange,
}: {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}) => {
  const logos: LogoCloudLogo[] = Array.isArray(content.logos) ? content.logos : [];
  return (
    <div className="space-y-3">
      <Field
        label="Eyebrow"
        value={content.eyebrow || ""}
        onChange={(v) => onChange("eyebrow", v)}
      />
      <ArrayCardList<LogoCloudLogo>
        label="Logos"
        items={logos}
        onChange={(next) => onChange("logos", next)}
        newItem={() => ({ url: "", alt: "" })}
        addLabel="Add logo"
        renderItem={(item, _i, update) => (
          <ImagePickerField
            label="Logo image"
            value={item.url || ""}
            onChange={(v) => update({ ...item, url: v })}
            altValue={item.alt || ""}
            onAltChange={(v) => update({ ...item, alt: v })}
          />
        )}
      />
    </div>
  );
};

/* ──────────────────────────────────── FAQ editor ──────────────────── */
export const FaqEditor = ({
  content,
  onChange,
  bgColor,
}: {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}) => {
  const items: FaqItem[] = Array.isArray(content.items) ? content.items : [];
  return (
    <div className="space-y-3">
      <Field label="Eyebrow (optional)" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
      <Field label="Subtitle (optional)" value={content.subtitle || ""} onChange={(v) => onChange("subtitle", v)} />
      <ArrayCardList<FaqItem>
        label="Questions"
        items={items}
        onChange={(next) => onChange("items", next)}
        newItem={() => ({ question: "", answer: "<p></p>" })}
        addLabel="Add question"
        renderItem={(item, _i, update) => (
          <>
            <Field label="Question" value={item.question || ""} onChange={(v) => update({ ...item, question: v })} />
            <RichField
              label="Answer"
              value={item.answer || ""}
              onChange={(v) => update({ ...item, answer: v })}
              bgColor={bgColor}
            />
          </>
        )}
      />
    </div>
  );
};
