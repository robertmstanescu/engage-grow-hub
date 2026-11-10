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

import { useEffect, useState } from "react";
import { Field, RichField, SectionBox, ColorField, EyebrowField, MoreFields, NoteField, SelectField } from "../site-editor/FieldComponents";
import { CoverImageField } from "../site-editor/CoverImageField";
import ImagePickerField from "../ImagePickerField";
import TitleLinesEditor from "./TitleLinesEditor";
import SubtitleEditor from "../site-editor/SubtitleEditor";
import { Plus, Trash2 } from "lucide-react";
import { fetchAllProofPoints, type ProofPointRecord } from "@/services/proofPoints";
import type { TestimonialItem, FaqItem, LogoCloudLogo, ProofItem, ProcessStep } from "@/types/rows";

/** Optional link to a proof point: the approved value shows on the site. */
const ProofLinkField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [proofs, setProofs] = useState<ProofPointRecord[]>([]);
  useEffect(() => {
    /* Tolerant of a mocked/partial client in tests: the select simply
       stays empty when the fetch cannot run. */
    try {
      Promise.resolve(fetchAllProofPoints())
        .then(({ data }) => setProofs(data ?? []))
        .catch(() => setProofs([]));
    } catch {
      setProofs([]);
    }
  }, []);
  return (
    <div>
      <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Link a proof point (optional)</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg font-body text-sm border cursor-pointer"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
      >
        <option value="">Typed number (as above)</option>
        {proofs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.value} — {p.label}{p.approved ? "" : " (not approved yet)"}
          </option>
        ))}
      </select>
      {value ? (
        <p className="font-body text-[9px] text-muted-foreground/60 mt-1">
          The approved proof's number shows instead of the typed one; the number hides while the proof is unapproved.
        </p>
      ) : null}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────
 * Reusable "Brand Header" block. Renders the standard set of fields
 * every section on the site should have. Centralising it here means
 * one component to update if the heading structure ever changes.
 * ──────────────────────────────────────────────────────────────────── */
export const BrandHeaderFields = ({
  content,
  onChange,
  bgColor,
}: {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}) => {
  return (
    <SectionBox label="Section Header">
      <Field
        label="Label above title (optional)"
        value={content.eyebrow || ""}
        onChange={(v) => onChange("eyebrow", v)}
      />
      <TitleLinesEditor
        titleLines={content.title_lines || []}
        onChange={(v) => onChange("title_lines", v)}
        bgColor={bgColor}
      />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
        handwritten={!!content.subtitle_handwritten}
        onHandwrittenChange={(v) => onChange("subtitle_handwritten", v)}
        bgColor={bgColor}
      />
      <RichField
        label="Section Body (optional)"
        value={content.body || ""}
        onChange={(v) => onChange("body", v)}
        bgColor={bgColor}
      />
      <NoteField
        value={content.note || ""}
        onChange={(v) => onChange("note", v)}
        handwritten={!!content.note_handwritten}
        onHandwrittenChange={(v) => onChange("note_handwritten", v)}
      />
      {/* Colour overrides. Leaving a picker empty keeps the automatic
          light/dark colour the row derives from its background. */}
      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label="Label colour"
          value={content.color_eyebrow || ""}
          fallback=""
          onChange={(v) => onChange("color_eyebrow", v)}
        />
        <ColorField
          label="Note colour"
          value={content.color_note || ""}
          fallback=""
          onChange={(v) => onChange("color_note", v)}
        />
      </div>
      <CoverImageField content={content} onChange={onChange} />
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
      <div data-field-group="" className="space-y-3">
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
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] font-body text-secondary border border-secondary/40 rounded-md px-3 py-1.5"
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

/* ──────────────────────────────── Proof band editor ───────────────── */
export const ProofBandEditor = ({
  content,
  onChange,
  bgColor,
}: {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}) => {
  const items: ProofItem[] = Array.isArray(content.items) ? content.items : [];
  return (
    <div className="space-y-3">
      <BrandHeaderFields content={content} onChange={onChange} bgColor={bgColor} />
      <ArrayCardList<ProofItem>
        label="Proof points (3–4 works best)"
        items={items}
        onChange={(next) => onChange("items", next)}
        newItem={() => ({ value: "", label: "", logo: "", logo_alt: "" })}
        addLabel="Add proof point"
        renderItem={(item, _i, update) => (
          <>
            <Field
              label="Stat / value"
              value={item.value || ""}
              onChange={(v) => update({ ...item, value: v })}
            />
            <Field
              label="Supporting label"
              value={item.label || ""}
              onChange={(v) => update({ ...item, label: v })}
            />
            <MoreFields>
              <ProofLinkField
                value={item.proof_id || ""}
                onChange={(v) => update({ ...item, proof_id: v })}
              />
            </MoreFields>
            <ImagePickerField
              label="Client logo (optional — replaces the stat)"
              value={item.logo || ""}
              onChange={(v) => update({ ...item, logo: v })}
              altValue={item.logo_alt || ""}
              onAltChange={(v) => update({ ...item, logo_alt: v })}
            />
          </>
        )}
      />
      <SelectField
        label="Look"
        value={content.band_style || ""}
        onChange={(v) => onChange("band_style", v)}
        options={[
          { label: "Light tiles", value: "" },
          { label: "Deep plum band, gold numbers", value: "deep" },
        ]}
      />
      {/* Tile colours — all optional. Left empty, each tile keeps
          inheriting the row's automatic light/dark contrast. */}
      <ColorField
        label="Tile background"
        value={content.color_tile_bg || ""}
        fallback=""
        onChange={(v) => onChange("color_tile_bg", v)}
      />
      <ColorField
        label="Stat / value colour"
        value={content.color_stat || ""}
        fallback=""
        onChange={(v) => onChange("color_stat", v)}
      />
      <ColorField
        label="Supporting label colour"
        value={content.color_stat_label || ""}
        fallback=""
        onChange={(v) => onChange("color_stat_label", v)}
      />
    </div>
  );
};

/* ─────────────────────────── "How we work" steps editor ───────────── */
export const ProcessStepsEditor = ({
  content,
  onChange,
  bgColor,
}: {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}) => {
  const steps: ProcessStep[] = Array.isArray(content.steps) ? content.steps : [];
  return (
    <div className="space-y-3">
      <BrandHeaderFields content={content} onChange={onChange} bgColor={bgColor} />
      <ArrayCardList<ProcessStep>
        label="Steps (numbers are automatic)"
        items={steps}
        onChange={(next) => onChange("steps", next)}
        newItem={() => ({ title: "", description: "<p></p>" })}
        addLabel="Add step"
        renderItem={(item, _i, update) => (
          <>
            <Field label="Step title" value={item.title || ""} onChange={(v) => update({ ...item, title: v })} />
            <RichField
              label="What happens"
              value={item.description || ""}
              onChange={(v) => update({ ...item, description: v })}
              bgColor={bgColor}
            />
          </>
        )}
      />
      <SelectField
        label="Look"
        value={content.step_style || ""}
        onChange={(v) => onChange("step_style", v)}
        options={[
          { label: "Ruled columns", value: "" },
          { label: "Glass cards", value: "cards" },
        ]}
      />
      <MoreFields>
        <SelectField
          label="Subtitle"
          value={content.subtitle_as_title ? "title" : ""}
          onChange={(v) => onChange("subtitle_as_title", v === "title")}
          options={[
            { label: "Small line under the title", value: "" },
            { label: "Use it as the section's headline", value: "title" },
          ]}
        />
        <SelectField
          label="Last step"
          value={content.last_step_as_note ? "note" : ""}
          onChange={(v) => onChange("last_step_as_note", v === "note")}
          options={[
            { label: "A step like the others", value: "" },
            { label: "Handwritten aside under the steps", value: "note" },
          ]}
        />
      </MoreFields>
    </div>
  );
};

/* ─────────────────────────────── Quote band editor ────────────────── */
export const QuoteBandEditor = ({
  content,
  onChange,
  bgColor,
}: {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}) => (
  <div className="space-y-3">
    <SectionBox label="Quote">
      <EyebrowField label="Label above title (optional)" value={content.eyebrow || ""} color={content.color_eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} onColorChange={(v) => onChange("color_eyebrow", v)} />
      <RichField
        label="Quote"
        value={content.quote || ""}
        onChange={(v) => onChange("quote", v)}
        bgColor={bgColor}
      />
      <Field label="Client name" value={content.name || ""} onChange={(v) => onChange("name", v)} />
      <Field label="Role / Company" value={content.role || ""} onChange={(v) => onChange("role", v)} />
      <ImagePickerField
        label="Portrait (optional)"
        value={content.avatar || ""}
        onChange={(v) => onChange("avatar", v)}
        altValue={content.avatar_alt || ""}
        onAltChange={(v) => onChange("avatar_alt", v)}
      />
    </SectionBox>
    <SectionBox label="Cover Image">
      <CoverImageField content={content} onChange={onChange} />
    </SectionBox>
  </div>
);

/* ───────────────────────────────── CTA band editor ────────────────── */
export const CtaBandEditor = ({
  content,
  onChange,
  bgColor,
}: {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}) => (
  <div className="space-y-3">
    <BrandHeaderFields content={content} onChange={onChange} bgColor={bgColor} />
    <SectionBox label="Actions">
      <Field label="Button label" value={content.button_text || ""} onChange={(v) => onChange("button_text", v)} />
      <Field label="Button link" value={content.button_url || ""} onChange={(v) => onChange("button_url", v)} />
    </SectionBox>
    <MoreFields label="Second link">
      <SelectField
        label="Look"
        value={content.band_style || ""}
        onChange={(v) => onChange("band_style", v)}
        options={[{ label: "Follows the row style", value: "" }, { label: "Dark rounded band", value: "room" }]}
      />
      <Field label="Text link label (optional)" value={content.link_text || ""} onChange={(v) => onChange("link_text", v)} />
      <Field label="Text link" value={content.link_url || ""} onChange={(v) => onChange("link_url", v)} />
    </MoreFields>
  </div>
);
