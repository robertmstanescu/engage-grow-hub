import { SectionBox, Field, RichField, ArrayField, ColorField } from "./FieldComponents";
import ImagePickerField from "../ImagePickerField";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const ProfileEditor = ({ content, onChange }: Props) => (
  <div className="space-y-3">
    <SectionBox label="Profile Header">
      <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onChange("eyebrow", v)} />
    </SectionBox>

    <SectionBox label="Image & Name Tag">
      <Field label="Image URL" value={content.image_url || ""} onChange={(v) => onChange("image_url", v)} />
      <Field label="Name" value={content.name || ""} onChange={(v) => onChange("name", v)} />
      <Field label="Role" value={content.role || ""} onChange={(v) => onChange("role", v)} />
    </SectionBox>

    <SectionBox label="Credentials">
      <ArrayField
        label="Credential Tags"
        items={content.credentials || []}
        onChange={(items) => onChange("credentials", items)}
        placeholder="e.g. CIPD Level 7"
      />
    </SectionBox>

    <SectionBox label="Content">
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
    </SectionBox>

    <SectionBox label="Colors">
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Eyebrow" value={content.color_eyebrow || ""} fallback="#7B3A91" onChange={(v) => onChange("color_eyebrow", v)} />
        <ColorField label="Name" value={content.color_name || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_name", v)} />
        <ColorField label="Role" value={content.color_role || ""} fallback="#E5C54F" onChange={(v) => onChange("color_role", v)} />
        <ColorField label="Credential BG" value={content.color_credential_bg || ""} fallback="#4D1B5E" onChange={(v) => onChange("color_credential_bg", v)} />
        <ColorField label="Credential Text" value={content.color_credential_text || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_credential_text", v)} />
        <ColorField label="Body Text" value={content.color_body || ""} fallback="#CCCCCC" onChange={(v) => onChange("color_body", v)} />
      </div>
    </SectionBox>
  </div>
);

export default ProfileEditor;
