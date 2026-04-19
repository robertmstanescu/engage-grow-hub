/**
 * ─────────────────────────────────────────────────────────────────────────
 * RowContentEditor.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * The "Content" sub-tab in the Properties panel. Given the currently
 * selected page row, it renders the right field-set for that row's type.
 *
 * Internally this is a switch on `row.type` that delegates to one of:
 *   • HeroRowFieldsInline       (hero)
 *   • TitleLinesEditor + …      (text, boxed, contact)
 *   • PillarEditor              (service)
 *   • ImageTextEditor           (image_text)
 *   • ProfileEditor             (profile)
 *   • GridEditor                (grid)
 *   • LeadMagnetEditor          (lead_magnet)
 *
 * Every variant shows a `commonMeta` block at the very top — currently
 * just the "Strip Title" field that names the row in the section list.
 *
 * PROPS
 * ─────
 *   row              : PageRow                     — selected row (with the
 *                                                    ACTIVE column's content
 *                                                    already swapped in by
 *                                                    AdminDashboard, see the
 *                                                    `colContent` slice in
 *                                                    the dashboard)
 *   onContentChange  : (field, value) => void      — writes to the active
 *                                                    column's content
 *   onRowMetaChange  : (updates) => void           — writes to row-level
 *                                                    metadata (strip_title,
 *                                                    bg_color, layout, …)
 *   onDelete?        : () => void                  — currently unused but
 *                                                    kept on the interface
 *                                                    so future per-row
 *                                                    delete UIs can plug in
 *                                                    without a prop break
 *
 * WHY IT WAS EXTRACTED
 * ────────────────────
 * It was a 100-line switch statement at the bottom of AdminDashboard.tsx.
 * Hosting it in its own file:
 *   • shrinks the dashboard
 *   • makes the per-row-type field set easier to find
 *   • lets us add a new row type by editing one file
 *
 * STYLES — INLINE → TAILWIND
 * ──────────────────────────
 * No styling lives at this level — every visual choice belongs to the
 * Field/RichField/SectionBox primitives or to the per-type editors. The
 * file uses Tailwind utility classes only (`space-y-3`, `grid-cols-2`).
 * ─────────────────────────────────────────────────────────────────────────
 */

import { Field, RichField, ColorField, SectionBox } from "../site-editor/FieldComponents";
import SubtitleEditor from "../site-editor/SubtitleEditor";
import PillarEditor from "../site-editor/PillarEditor";
import ImageTextEditor from "../site-editor/ImageTextEditor";
import ProfileEditor from "../site-editor/ProfileEditor";
import GridEditor from "../site-editor/GridEditor";
import LeadMagnetEditor from "../site-editor/LeadMagnetEditor";
import TitleLinesEditor from "./TitleLinesEditor";
import HeroRowFieldsInline from "./HeroRowFieldsInline";
import BoxedArrayField from "./BoxedArrayField";
import { type PageRow } from "@/types/rows";

interface Props {
  row: PageRow;
  onContentChange: (field: string, value: any) => void;
  onRowMetaChange: (updates: Partial<PageRow>) => void;
  /** Reserved for future per-row delete UIs; not consumed today. */
  onDelete?: () => void;
}

const RowContentEditor = ({ row, onContentChange, onRowMetaChange }: Props) => {
  const content = row.content;
  // The row's own background colour drives the RichTextEditor's surface
  // colour so light-on-light or dark-on-dark text remains legible while
  // editing — see RichField docstring in FieldComponents for details.
  const bg = row.bg_color;

  /** Always-rendered top-of-form block (Strip Title for now). */
  const commonMeta = (
    <div className="space-y-2 mb-4">
      <Field
        label="Strip Title"
        value={row.strip_title}
        onChange={(v) => onRowMetaChange({ strip_title: v })}
      />
    </div>
  );

  /** Older rows may have stored title lines as plain text. Normalise. */
  const titleLines = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`,
  );

  /** Optional eyebrow + note + CTA cluster shared by text & boxed rows. */
  const noteAndButton = (
    <SectionBox label="Note & Button">
      <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onContentChange("eyebrow", v)} />
      <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onContentChange("note", v)} />
      <Field label="Button Label" value={content.cta_label || ""} onChange={(v) => onContentChange("cta_label", v)} />
      <Field label="Button URL" value={content.cta_url || ""} onChange={(v) => onContentChange("cta_url", v)} />
    </SectionBox>
  );

  switch (row.type) {
    case "hero":
      return (
        <>
          {commonMeta}
          <HeroRowFieldsInline content={content} onChange={onContentChange} bgColor={bg} />
        </>
      );

    case "text":
      return (
        <>
          {commonMeta}
          <div className="space-y-3">
            <TitleLinesEditor titleLines={titleLines} onChange={(v) => onContentChange("title_lines", v)} />
            <SubtitleEditor
              subtitle={content.subtitle || ""}
              subtitleColor={content.subtitle_color || ""}
              onSubtitleChange={(v) => onContentChange("subtitle", v)}
              onColorChange={(v) => onContentChange("subtitle_color", v)}
            />
            <RichField label="Body" value={content.body || ""} onChange={(v) => onContentChange("body", v)} bgColor={bg} />
            {noteAndButton}
          </div>
        </>
      );

    case "service":
      return (
        <>
          {commonMeta}
          <PillarEditor
            pillarContent={content}
            servicesContent={{ services: content.services || [] }}
            onPillarChange={onContentChange}
            onServicesChange={(svcs) => onContentChange("services", svcs)}
            bgColor={bg}
          />
        </>
      );

    case "boxed":
      return (
        <>
          {commonMeta}
          <div className="space-y-3">
            <TitleLinesEditor titleLines={titleLines} onChange={(v) => onContentChange("title_lines", v)} />
            <SubtitleEditor
              subtitle={content.subtitle || ""}
              subtitleColor={content.subtitle_color || ""}
              onSubtitleChange={(v) => onContentChange("subtitle", v)}
              onColorChange={(v) => onContentChange("subtitle_color", v)}
            />
            <ColorField label="Card Title Color" value={content.color_card_title || ""} fallback="" onChange={(v) => onContentChange("color_card_title", v)} />
            <ColorField label="Card Body Color" value={content.color_card_body || ""} fallback="" onChange={(v) => onContentChange("color_card_body", v)} />
            <BoxedArrayField content={content} onChange={onContentChange} bgColor={bg} />
            {noteAndButton}
          </div>
        </>
      );

    case "contact":
      return (
        <>
          {commonMeta}
          <div className="space-y-3">
            <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onContentChange("eyebrow", v)} />
            <TitleLinesEditor titleLines={titleLines} onChange={(v) => onContentChange("title_lines", v)} />
            <SubtitleEditor
              subtitle={content.subtitle || ""}
              subtitleColor={content.subtitle_color || ""}
              onSubtitleChange={(v) => onContentChange("subtitle", v)}
              onColorChange={(v) => onContentChange("subtitle_color", v)}
            />
            <RichField label="Body" value={content.body || ""} onChange={(v) => onContentChange("body", v)} bgColor={bg} />
            <Field label="Button Text" value={content.button_text || ""} onChange={(v) => onContentChange("button_text", v)} />
            <SectionBox label="Colors">
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Eyebrow" value={content.color_eyebrow || ""} fallback="#7B3A91" onChange={(v) => onContentChange("color_eyebrow", v)} />
              </div>
            </SectionBox>
            <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onContentChange("note", v)} />
          </div>
        </>
      );

    case "image_text":
      return (
        <>
          {commonMeta}
          <ImageTextEditor content={content} onChange={onContentChange} bgColor={bg} />
        </>
      );

    case "profile":
      return (
        <>
          {commonMeta}
          <ProfileEditor content={content} onChange={onContentChange} bgColor={bg} />
        </>
      );

    case "grid":
      return (
        <>
          {commonMeta}
          <GridEditor content={content} onChange={onContentChange} bgColor={bg} />
        </>
      );

    case "lead_magnet":
      return (
        <>
          {commonMeta}
          <LeadMagnetEditor
            content={content}
            onChange={(next) => Object.entries(next).forEach(([k, v]) => onContentChange(k, v))}
          />
        </>
      );

    default:
      return commonMeta;
  }
};

export default RowContentEditor;
