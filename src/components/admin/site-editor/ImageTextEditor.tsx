import { SectionBox, Field, RichField, SelectField, ColorField } from "./FieldComponents";
import ImagePickerField from "../ImagePickerField";

const IMAGE_POSITIONS = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
];

const IMAGE_SHAPES = [
  { label: "Default (rounded)", value: "default" },
  { label: "Puddle (organic wavy)", value: "puddle" },
  { label: "Clover (four-lobed)", value: "clover" },
  { label: "Blob", value: "blob" },
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
}

const ImageTextEditor = ({ content, onChange }: Props) => (
  <div className="space-y-3">
    <SectionBox label="Text Content">
      <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
      <Field label="Title" value={content.title || ""} onChange={(v) => onChange("title", v)} />
      <RichField label="Description" value={content.description || ""} onChange={(v) => onChange("description", v)} />
    </SectionBox>

    <SectionBox label="Image">
      <Field label="Image URL" value={content.image_url || ""} onChange={(v) => onChange("image_url", v)} />
      <SelectField label="Image Position" value={content.image_position || "right"} options={IMAGE_POSITIONS} onChange={(v) => onChange("image_position", v)} />
      <SelectField label="Image Shape" value={content.image_shape || "default"} options={IMAGE_SHAPES} onChange={(v) => onChange("image_shape", v)} />
    </SectionBox>

    <SectionBox label="Floating Caption">
      <Field label="Caption Text" value={content.floating_caption || ""} onChange={(v) => onChange("floating_caption", v)} />
      <SelectField label="Caption Position" value={content.caption_position || "bottom-left"} options={CAPTION_POSITIONS} onChange={(v) => onChange("caption_position", v)} />
    </SectionBox>

    <SectionBox label="Colors">
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Eyebrow" value={content.color_eyebrow || ""} fallback="#7B3A91" onChange={(v) => onChange("color_eyebrow", v)} />
        <ColorField label="Title" value={content.color_title || ""} fallback="#2A0E33" onChange={(v) => onChange("color_title", v)} />
        <ColorField label="Description" value={content.color_description || ""} fallback="#555555" onChange={(v) => onChange("color_description", v)} />
        <ColorField label="Caption Background" value={content.color_caption_bg || ""} fallback="#000000" onChange={(v) => onChange("color_caption_bg", v)} />
        <ColorField label="Caption Text" value={content.color_caption_text || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_caption_text", v)} />
      </div>
    </SectionBox>
  </div>
);

export default ImageTextEditor;
