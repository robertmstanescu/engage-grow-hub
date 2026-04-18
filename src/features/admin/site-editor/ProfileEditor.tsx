import { SectionBox, Field, RichField, ArrayField, ColorField } from "./FieldComponents";
import TitleLineEditor from "./TitleLineEditor";
import SubtitleEditor from "./SubtitleEditor";
import ImagePickerField from "../ImagePickerField";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const ProfileEditor = ({ content, onChange }: Props) => {
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

      <SectionBox label="Note & Button">
        <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onChange("note", v)} />
        <Field label="Button Label" value={content.cta_label || ""} onChange={(v) => onChange("cta_label", v)} />
        <Field label="Button URL" value={content.cta_url || ""} onChange={(v) => onChange("cta_url", v)} />
      </SectionBox>

      <SectionBox label="Colors">
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Eyebrow" value={content.color_eyebrow || ""} fallback="#7B3A91" onChange={(v) => onChange("color_eyebrow", v)} />
          <ColorField label="Title" value={content.color_title || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_title", v)} />
          <ColorField label="Name" value={content.color_name || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_name", v)} />
          <ColorField label="Role" value={content.color_role || ""} fallback="#E5C54F" onChange={(v) => onChange("color_role", v)} />
          <ColorField label="Credential BG" value={content.color_credential_bg || ""} fallback="#4D1B5E" onChange={(v) => onChange("color_credential_bg", v)} />
          <ColorField label="Credential Text" value={content.color_credential_text || ""} fallback="#FFFFFF" onChange={(v) => onChange("color_credential_text", v)} />
          <ColorField label="Body Text" value={content.color_body || ""} fallback="#CCCCCC" onChange={(v) => onChange("color_body", v)} />
          <ColorField label="Note" value={content.color_note || ""} fallback="#999999" onChange={(v) => onChange("color_note", v)} />
        </div>
      </SectionBox>
    </div>
  );
};

export default ProfileEditor;
