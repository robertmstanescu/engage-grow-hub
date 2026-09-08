import { SectionBox, Field, RichField, ArrayField, ColorField, CtaFields, MoreFields } from "./FieldComponents";
import TitleLinesEditor from "../editors/TitleLinesEditor";
import SubtitleEditor from "./SubtitleEditor";
import ImagePickerField from "../ImagePickerField";
import ImageShapeControl from "../ImageShapeControl";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  /** Live row background, forwarded to RichField for legible contrast. */
  bgColor?: string;
}

const ProfileEditor = ({ content, onChange, bgColor }: Props) => {

  return (
    <div className="space-y-3">
      <SectionBox label="Header">
        <Field label="Label above title" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
        <TitleLinesEditor titleLines={content.title_lines || []} onChange={(v) => onChange("title_lines", v)} bgColor={bgColor} />
      </SectionBox>

      <SectionBox label="Image & Name Tag">
        {/* Profile photos benefit hugely from real alt text ("Photo of Jane Smith, HR Director")
            — much better than the file-name fallback a screen reader would otherwise read. */}
        <ImagePickerField
          label="Profile Image"
          value={content.image_url || ""}
          onChange={(v) => onChange("image_url", v)}
          altValue={content.image_alt || ""}
          onAltChange={(v) => onChange("image_alt", v)}
        />
        <ImageShapeControl
          imageUrl={content.image_url || ""}
          ratio={content.image_ratio}
          focalX={content.image_focal_x}
          focalY={content.image_focal_y}
          onRatioChange={(v) => onChange("image_ratio", v)}
          onFocalChange={(x, y) => { onChange("image_focal_x", x); onChange("image_focal_y", y); }}
          fallbackRatio={3 / 4}
        />
        <Field label="Name" value={content.name || ""} onChange={(v) => onChange("name", v)} />
        <Field label="Role" value={content.role || ""} onChange={(v) => onChange("role", v)} />
      </SectionBox>

      <SectionBox label="Content">
        <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} bgColor={bgColor} />
      </SectionBox>

      <CtaFields content={content} onChange={onChange} />

      <MoreFields>
        <SubtitleEditor subtitle={content.subtitle || ""} subtitleColor={content.subtitle_color || ""} onSubtitleChange={(v) => onChange("subtitle", v)} onColorChange={(v) => onChange("subtitle_color", v)} handwritten={!!content.subtitle_handwritten} onHandwrittenChange={(v) => onChange("subtitle_handwritten", v)} />
        <SectionBox label="Credentials" group>
          <ArrayField
            label="Credential Tags"
            items={content.credentials || []}
            onChange={(items) => onChange("credentials", items)}
            placeholder="e.g. CIPD Level 7"
          />
        </SectionBox>
      </MoreFields>

      <>
        <div>
          <ColorField label="Label above title" value={content.color_eyebrow || ""} fallback="#7B3A91" onChange={(v) => onChange("color_eyebrow", v)} />
          <ColorField label="Title" value={content.color_title || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_title", v)} />
          <ColorField label="Name" value={content.color_name || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_name", v)} />
          <ColorField label="Role" value={content.color_role || ""} fallback="#E5C54F" onChange={(v) => onChange("color_role", v)} />
          <ColorField label="Credential BG" value={content.color_credential_bg || ""} fallback="#4D1B5E" onChange={(v) => onChange("color_credential_bg", v)} />
          <ColorField label="Credential Text" value={content.color_credential_text || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_credential_text", v)} />
          <ColorField label="Body Text" value={content.color_body || ""} fallback="#CCCCCC" onChange={(v) => onChange("color_body", v)} />
          <ColorField label="Note" value={content.color_note || ""} fallback="#999999" onChange={(v) => onChange("color_note", v)} />
        </div>
      </>
    </div>
  );
};

export default ProfileEditor;
