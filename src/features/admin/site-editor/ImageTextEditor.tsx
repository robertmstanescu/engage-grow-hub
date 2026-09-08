import { SectionBox, Field, RichField, SelectField, ColorField, CtaFields, MoreFields } from "./FieldComponents";
import ImagePickerField from "../ImagePickerField";
import ImageShapeControl from "../ImageShapeControl";
import TitleLinesEditor from "../editors/TitleLinesEditor";
import SubtitleEditor from "./SubtitleEditor";
import ColumnWidthControl from "./ColumnWidthControl";

const IMAGE_POSITIONS = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
];

const IMAGE_SHAPES = [
  { label: "Default (rounded)", value: "default" },
  { label: "Circle", value: "blob" },
  { label: "Puddle (organic)", value: "puddle" },
  { label: "Clover", value: "clover" },
  { label: "Diamond", value: "diamond" },
  { label: "Heart", value: "heart" },
];

const CAPTION_POSITIONS = [
  { label: "Top Left", value: "top-left" },
  { label: "Top Center", value: "top-center" },
  { label: "Top Right", value: "top-right" },
  { label: "Bottom Left", value: "bottom-left" },
  { label: "Bottom Center", value: "bottom-center" },
  { label: "Bottom Right", value: "bottom-right" },
];

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  /** Live row background, forwarded to RichField for legible contrast. */
  bgColor?: string;
  /** Existing ratio from rows created before the split became widget data. */
  legacySplitWidths?: number[];
}

const ImageTextEditor = ({ content, onChange, bgColor, legacySplitWidths }: Props) => {
  const splitWidths = Array.isArray(content.split_widths) && content.split_widths.length === 2
    ? content.split_widths
    : (Array.isArray(legacySplitWidths) && legacySplitWidths.length === 2 ? legacySplitWidths : [50, 50]);

  return (
    <div className="space-y-3">
      <SectionBox label="Header">
        <Field label="Label above title" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
        <TitleLinesEditor titleLines={content.title_lines || []} onChange={(v) => onChange("title_lines", v)} bgColor={bgColor} />
        <SubtitleEditor subtitle={content.subtitle || ""} subtitleColor={content.subtitle_color || ""} onSubtitleChange={(v) => onChange("subtitle", v)} onColorChange={(v) => onChange("subtitle_color", v)} handwritten={!!content.subtitle_handwritten} onHandwrittenChange={(v) => onChange("subtitle_handwritten", v)} />
        <RichField label="Description" value={content.description || ""} onChange={(v) => onChange("description", v)} bgColor={bgColor} />
      </SectionBox>

      <SectionBox label="Image">
        {/*
          ImagePickerField now accepts altValue/onAltChange — passing them in renders
          the standardised <ImageAltInput/> directly under the picker so the alt text
          stays paired with the image URL it describes (SEO + screen readers).
        */}
        <ImagePickerField
          label="Image"
          value={content.image_url || ""}
          onChange={(v) => onChange("image_url", v)}
          altValue={content.image_alt || ""}
          onAltChange={(v) => onChange("image_alt", v)}
        />
        <SelectField label="Image Position" value={content.image_position || "right"} options={IMAGE_POSITIONS} onChange={(v) => onChange("image_position", v)} />
        <ImageShapeControl
          imageUrl={content.image_url || ""}
          ratio={content.image_ratio}
          focalX={content.image_focal_x}
          focalY={content.image_focal_y}
          onRatioChange={(v) => onChange("image_ratio", v)}
          onFocalChange={(x, y) => { onChange("image_focal_x", x); onChange("image_focal_y", y); }}
          fallbackRatio={4 / 5}
        />
        <ColumnWidthControl
          columnCount={2}
          widths={splitWidths}
          onChange={(widths) => onChange("split_widths", widths)}
          labels={["Image side", "Text side"]}
          defaultOpen
        />
      </SectionBox>


      {/*
       * CALL TO ACTION block.
       * Junior note: the BUTTON itself is the primary action — so its
       * label/URL come FIRST. Note (a small caption above the button)
       * is secondary and stays at the bottom. If `cta_label` is empty,
       * the public renderer (ImageTextRow) MUST not render the <a/> at
       * all — see the conditional `{c.cta_label && (…)}` block there.
       */}
      <CtaFields content={content} onChange={onChange} />

      <MoreFields>
        <SectionBox label="Picture shape">
          <SelectField label="Image Mask" value={content.image_shape || "default"} options={IMAGE_SHAPES} onChange={(v) => onChange("image_shape", v)} />
        </SectionBox>
        <SectionBox label="Floating Caption">
          <Field label="Caption Text" value={content.floating_caption || ""} onChange={(v) => onChange("floating_caption", v)} />
          <SelectField label="Caption Position" value={content.caption_position || "bottom-left"} options={CAPTION_POSITIONS} onChange={(v) => onChange("caption_position", v)} />
        </SectionBox>
      </MoreFields>

      <>
        <div>
          <ColorField label="Label above title" value={content.color_eyebrow || ""} fallback="#7B3A91" onChange={(v) => onChange("color_eyebrow", v)} />
          <ColorField label="Title" value={content.color_title || ""} fallback="#2A0E33" onChange={(v) => onChange("color_title", v)} />
          <ColorField label="Description" value={content.color_description || ""} fallback="#555555" onChange={(v) => onChange("color_description", v)} />
          <ColorField label="Caption Background" value={content.color_caption_bg || ""} fallback="#000000" onChange={(v) => onChange("color_caption_bg", v)} />
          <ColorField label="Caption Text" value={content.color_caption_text || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_caption_text", v)} />
          <ColorField label="Note" value={content.color_note || ""} fallback="#999999" onChange={(v) => onChange("color_note", v)} />
        </div>
      </>
    </div>
  );
};

export default ImageTextEditor;
