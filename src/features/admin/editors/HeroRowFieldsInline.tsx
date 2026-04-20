/**
 * ─────────────────────────────────────────────────────────────────────────
 * HeroRowFieldsInline.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Inline form fields shown in the Properties → Content tab when the
 * selected row is a **hero-type page row** (NOT the dedicated `hero`
 * site_content section — that one uses the standalone `HeroEditor` from
 * `site-editor/HeroEditor.tsx`).
 *
 * The two are distinct because:
 *   - The classic "Hero" section is a single, well-known top-of-homepage
 *     block stored under the `hero` site_content key.
 *   - A hero-type **row** is one of many possible rows on any page (main
 *     or CMS). Its content lives inside the `page_rows.rows[]` array.
 *
 * PROPS
 * ─────
 *   content : Record<string, any>             — the row's content object
 *   onChange: (field, value) => void          — partial-update callback
 *   bgColor?: string                          — current row background;
 *                                                forwarded to the rich
 *                                                editor so its surface
 *                                                colour matches the row
 *                                                being edited
 *
 * WHY IT WAS EXTRACTED
 * ────────────────────
 * It was a top-level helper function inside AdminDashboard.tsx. Lifting
 * it into the editors/ folder isolates the field-set definition from the
 * dashboard's orchestration, and it now sits next to its peer editors.
 *
 * STYLES — INLINE → TAILWIND
 * ──────────────────────────
 * No inline styles at all in the original — the file is already Tailwind
 * native. Kept as-is for parity.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { Field, RichField, ColorField, SelectField, SectionBox } from "../site-editor/FieldComponents";
import SubtitleEditor from "../site-editor/SubtitleEditor";
import ImagePickerField from "../ImagePickerField";
import TitleLinesEditor from "./TitleLinesEditor";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  bgColor?: string;
}

/** Background-type selector options. */
const BG_TYPES = [
  { label: "None", value: "none" },
  { label: "Image", value: "image" },
  { label: "Video", value: "video" },
];

const HeroRowFieldsInline = ({ content, onChange, bgColor }: Props) => {
  /**
   * Title lines may have been saved as plain strings in older rows. We
   * normalise everything to `<p>…</p>` so the rich editor never sees raw
   * text it can't format.
   */
  const titleLines = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`,
  );

  return (
    <div className="space-y-3">
      <Field label="Eyebrow" value={content.label || ""} onChange={(v) => onChange("label", v)} />
      <ColorField label="Eyebrow Color" value={content.color_label || ""} fallback="" onChange={(v) => onChange("color_label", v)} />
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} bgColor={bgColor} />
      <Field label="Tagline" value={content.tagline || ""} onChange={(v) => onChange("tagline", v)} />
      <ColorField label="Tagline Color" value={content.color_tagline || ""} fallback="" onChange={(v) => onChange("color_tagline", v)} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
        bgColor={bgColor}
      />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} bgColor={bgColor} />
      <SectionBox label="Background">
        <SelectField label="Type" value={content.bg_type || "none"} options={BG_TYPES} onChange={(v) => onChange("bg_type", v)} />
        {content.bg_type === "image" && (
          <ImagePickerField label="Background Image" value={content.bg_url || ""} onChange={(v) => onChange("bg_url", v)} />
        )}
        {content.bg_type === "video" && (
          <Field label="Video URL" value={content.bg_url || ""} onChange={(v) => onChange("bg_url", v)} />
        )}
      </SectionBox>
    </div>
  );
};

export default HeroRowFieldsInline;
