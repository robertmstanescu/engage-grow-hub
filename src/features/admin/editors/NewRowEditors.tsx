/**
 * ─────────────────────────────────────────────────────────────────────────
 * NewRowEditors.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Admin editor blocks for the three "new" row types:
 *   • TestimonialEditor — manages an array of `TestimonialItem`
 *   • LogoCloudEditor   — manages an eyebrow + array of logo URLs
 *   • FaqEditor         — manages an array of `FaqItem`
 *
 * STANDARDISED BRAND HEADER (junior-engineer guide)
 * ─────────────────────────────────────────────────
 * Every section on the public site needs a CONSISTENT heading hierarchy
 * for SEO and visual rhythm. To enforce that, each editor here exposes
 * the same five "Brand Header" fields that the Hero and Text rows use:
 *
 *   • eyebrow         — small uppercase label above the title
 *   • title_lines[]   — H1/H2 candidates, each on its own visual line
 *   • subtitle        — short supporting line under the title
 *   • subtitle_color  — optional override for the subtitle color
 *   • body            — rich-text "section body" paragraph
 *
 * The corresponding public renderers (TestimonialRow, FaqRow,
 * LogoCloudRow) read these keys and render them via the shared
 * <RowEyebrow/>, <RowTitle/>, <RowSubtitle/>, <RowBody/> typography
 * primitives — search `src/features/site/rows/typography/` for the
 * implementation.
 *
 * If you add a new row type, COPY THE BRAND HEADER BLOCK below verbatim
 * so the heading hierarchy stays consistent across the site.
 * ───────────────────────────────────────────────────────────────────── */

import { Field, RichField, SectionBox } from "../site-editor/FieldComponents";
import ImagePickerField from "../ImagePickerField";
import TitleLinesEditor from "./TitleLinesEditor";
import SubtitleEditor from "../site-editor/SubtitleEditor";
import { Plus, Trash2 } from "lucide-react";
import type { TestimonialItem, FaqItem, LogoCloudLogo } from "@/types/rows";

/* ────────────────────────────────────────────────────────────────────
 * Reusable "Brand Header" block. Renders the standard set of fields
 * every section on the site should have. Centralising it here means
 * one component to update if the heading structure ever changes.
 * ──────────────────────────────────────────────────────────────────── */
const BrandHeaderFields = ({
  content,
  onChange,
  bgColor,
}: {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`,
  );
  return (
    <SectionBox label="Section Header">
      <Field
        label="Eyebrow (optional)"
        value={content.eyebrow || ""}
        onChange={(v) => onChange("eyebrow", v)}
      />
      <TitleLinesEditor
        titleLines={titleLines}
        onChange={(v) => onChange("title_lines", v)}
        bgColor={bgColor}
      />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
        bgColor={bgColor}
      />
      <RichField
        label="Section Body (optional)"
        value={content.body || ""}
        onChange={(v) => onChange("body", v)}
        bgColor={bgColor}
      />
    </SectionBox>
  );
};

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
      <BrandHeaderFields content={content} onChange={onChange} bgColor={bgColor} />
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
  bgColor,
}: {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}) => {
  const logos: LogoCloudLogo[] = Array.isArray(content.logos) ? content.logos : [];
  return (
    <div className="space-y-3">
      <BrandHeaderFields content={content} onChange={onChange} bgColor={bgColor} />
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
      <BrandHeaderFields content={content} onChange={onChange} bgColor={bgColor} />
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
