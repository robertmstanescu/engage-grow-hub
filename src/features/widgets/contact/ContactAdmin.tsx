/**
 * ContactAdmin — admin editor surface for the Contact widget.
 *
 * Extracted verbatim from `RowsManager.tsx` (US 2.2). All the field
 * shapes, form-field configuration UI, and success-state controls move
 * here unchanged so the existing `content` JSON keys keep working.
 *
 * Why we keep the {content, onChange} signature:
 * That is the WidgetRegistry's standard admin contract (see
 * `WidgetDefinition.adminComponent` in `src/lib/WidgetRegistry.tsx`).
 * Every future widget admin will use the same shape, which is what
 * allows the page-builder to mount any widget editor in any cell
 * without special casing.
 */

import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_CONTACT_FIELDS } from "@/lib/constants/rowDefaults";
import {
  SectionBox,
  Field,
  RichField,
} from "@/features/admin/site-editor/FieldComponents";
import TitleLineEditor from "@/features/admin/site-editor/TitleLineEditor";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const FIELD_TYPES = [
  { label: "Text", value: "text" },
  { label: "Email", value: "email" },
  { label: "Textarea", value: "textarea" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Phone", value: "tel" },
  { label: "URL", value: "url" },
];

/* ──────────────────────────────────────────────────────────────────────
 * Local TitleLinesEditor — duplicated from RowsManager so this widget
 * can stand alone. Keeping it scoped here means the widget folder is
 * self-contained: a junior dev reading `widgets/contact/` sees every
 * piece of the contact block in one place, not scattered across the
 * legacy admin tree.
 * ────────────────────────────────────────────────────────────────────── */
const TitleLinesEditor = ({
  titleLines,
  onChange,
}: {
  titleLines: string[];
  onChange: (lines: string[]) => void;
}) => {
  const updateLine = (idx: number, html: string) => {
    const next = [...titleLines];
    next[idx] = html;
    onChange(next);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
          Title Lines
        </label>
        <button
          type="button"
          onClick={() => onChange([...titleLines, "<p></p>"])}
          className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70"
          style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}
        >
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {titleLines.map((line, i) => (
          <SectionBox key={i} label={`Line ${i + 1}`}>
            <div className="flex gap-2">
              <div className="flex-1">
                <TitleLineEditor value={line} onChange={(v) => updateLine(i, v)} />
              </div>
              <button
                type="button"
                onClick={() => onChange(titleLines.filter((_, j) => j !== i))}
                className="self-end p-2 rounded hover:opacity-70"
                style={{ color: "hsl(var(--destructive))" }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </SectionBox>
        ))}
      </div>
    </div>
  );
};

const ContactAdmin = ({ content, onChange }: Props) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`,
  );
  const fields = content.fields || DEFAULT_CONTACT_FIELDS;

  const updateFieldConfig = (idx: number, key: string, value: any) => {
    const next = [...fields];
    next[idx] = { ...next[idx], [key]: value };
    onChange("fields", next);
  };

  const addField = () => {
    const key = `custom_${Date.now()}`;
    onChange("fields", [
      ...fields,
      { key, label: "New field", type: "text", required: false, visible: true },
    ]);
  };

  const removeField = (idx: number) => {
    onChange(
      "fields",
      fields.filter((_: any, i: number) => i !== idx),
    );
  };

  return (
    <div className="space-y-3">
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
      <Field
        label="Button Text"
        value={content.button_text || ""}
        onChange={(v) => onChange("button_text", v)}
      />

      <SectionBox label="Form Fields">
        <div className="space-y-2">
          {fields.map((f: any, i: number) => (
            <div
              key={f.key || i}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{ backgroundColor: "hsl(var(--background))" }}
            >
              <input
                type="checkbox"
                checked={f.visible}
                onChange={(e) => updateFieldConfig(i, "visible", e.target.checked)}
                className="rounded"
                style={{ accentColor: "hsl(var(--primary))" }}
              />
              <input
                value={f.label}
                onChange={(e) => updateFieldConfig(i, "label", e.target.value)}
                className="flex-1 px-2 py-1 rounded font-body text-xs border text-black"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "transparent" }}
              />
              <select
                value={f.type}
                onChange={(e) => updateFieldConfig(i, "type", e.target.value)}
                className="px-2 py-1 rounded font-body text-[10px] border text-black"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "transparent" }}
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {ft.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 font-body text-[9px] uppercase tracking-wider text-muted-foreground">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => updateFieldConfig(i, "required", e.target.checked)}
                  className="rounded"
                  style={{ accentColor: "hsl(var(--primary))" }}
                />
                Req
              </label>
              <button
                type="button"
                onClick={() => removeField(i)}
                className="p-1 rounded hover:opacity-70"
                style={{ color: "hsl(var(--destructive))" }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 transition-opacity mt-2"
          style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}
        >
          <Plus size={10} /> Add Field
        </button>
      </SectionBox>

      <SectionBox label="Success State">
        <Field
          label="Heading"
          value={content.success_heading || ""}
          onChange={(v) => onChange("success_heading", v)}
        />
        <Field
          label="Body"
          value={content.success_body || ""}
          onChange={(v) => onChange("success_body", v)}
        />
        <Field
          label="Button Text"
          value={content.success_button || ""}
          onChange={(v) => onChange("success_button", v)}
        />
      </SectionBox>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={content.show_social || false}
          onChange={(e) => onChange("show_social", e.target.checked)}
          className="rounded"
          style={{ accentColor: "hsl(var(--primary))" }}
        />
        <span className="font-body text-xs text-muted-foreground">
          Show social media links below form
        </span>
      </label>
    </div>
  );
};

export default ContactAdmin;
