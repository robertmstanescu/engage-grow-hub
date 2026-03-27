import { Field } from "./FieldComponents";

interface Props {
  metaTitle: string;
  metaDescription: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}

const SeoFields = ({ metaTitle, metaDescription, onTitleChange, onDescriptionChange }: Props) => (
  <div className="space-y-2 p-3 rounded-lg border" style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--background))" }}>
    <label className="font-body text-[10px] uppercase tracking-wider font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
      SEO & Metadata
    </label>
    <Field label="Meta Title (for search engines)" value={metaTitle} onChange={onTitleChange} />
    <div>
      <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Meta Description (for search engines)</label>
      <textarea
        value={metaDescription || ""}
        onChange={(e) => onDescriptionChange(e.target.value)}
        rows={2}
        maxLength={160}
        placeholder="Brief description for search engines (max 160 chars)"
        className="w-full px-3 py-2 rounded-lg font-body text-sm border resize-none"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
      />
      <span className="font-body text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>
        {(metaDescription || "").length}/160
      </span>
    </div>
  </div>
);

export default SeoFields;
