import { SectionBox, Field, RichField, SelectField, ColorField } from "./FieldComponents";
import ImagePickerField from "../ImagePickerField";
import TitleLineEditor from "./TitleLineEditor";
import SubtitleEditor from "./SubtitleEditor";
import { Plus, Trash2 } from "lucide-react";

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
}

const ImageTextEditor = ({ content, onChange }: Props) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );

  return (
    <div className="space-y-3">
      <SectionBox label="Header">
        <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Title Lines</label>
            <button type="button" onClick={() => onChange("title_lines", [...titleLines, "<p></p>"])} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
              <Plus size={10} /> Add
            </button>
          </div>
          {titleLines.map((line, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="flex-1"><TitleLineEditor value={line} onChange={(v) => { const next = [...titleLines]; next[i] = v; onChange("title_lines", next); }} /></div>
              <button type="button" onClick={() => onChange("title_lines", titleLines.filter((_, j) => j !== i))} className="self-end p-2 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <SubtitleEditor subtitle={content.subtitle || ""} subtitleColor={content.subtitle_color || ""} onSubtitleChange={(v) => onChange("subtitle", v)} onColorChange={(v) => onChange("subtitle_color", v)} />
        <RichField label="Description" value={content.description || ""} onChange={(v) => onChange("description", v)} />
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
        <SelectField label="Image Shape" value={content.image_shape || "default"} options={IMAGE_SHAPES} onChange={(v) => onChange("image_shape", v)} />
      </SectionBox>

      <SectionBox label="Floating Caption">
        <Field label="Caption Text" value={content.floating_caption || ""} onChange={(v) => onChange("floating_caption", v)} />
        <SelectField label="Caption Position" value={content.caption_position || "bottom-left"} options={CAPTION_POSITIONS} onChange={(v) => onChange("caption_position", v)} />
      </SectionBox>

      <SectionBox label="Note & Button">
        <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onChange("note", v)} />
        <Field label="Button Label" value={content.cta_label || ""} onChange={(v) => onChange("cta_label", v)} />
        <Field label="Button URL" value={content.cta_url || ""} onChange={(v) => onChange("cta_url", v)} />
      </SectionBox>

      <SectionBox label="Colors">
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Eyebrow" value={content.color_eyebrow || ""} fallback="#7B3A91" onChange={(v) => onChange("color_eyebrow", v)} />
          <ColorField label="Title" value={content.color_title || ""} fallback="#2A0E33" onChange={(v) => onChange("color_title", v)} />
          <ColorField label="Description" value={content.color_description || ""} fallback="#555555" onChange={(v) => onChange("color_description", v)} />
          <ColorField label="Caption Background" value={content.color_caption_bg || ""} fallback="#000000" onChange={(v) => onChange("color_caption_bg", v)} />
          <ColorField label="Caption Text" value={content.color_caption_text || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_caption_text", v)} />
          <ColorField label="Note" value={content.color_note || ""} fallback="#999999" onChange={(v) => onChange("color_note", v)} />
        </div>
      </SectionBox>
    </div>
  );
};

export default ImageTextEditor;
