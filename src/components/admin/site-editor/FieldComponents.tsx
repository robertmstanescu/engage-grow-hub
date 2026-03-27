import { Plus, Trash2 } from "lucide-react";
import RichTextEditor from "../RichTextEditor";

export const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg font-body text-sm border"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "#1a1a1a" }}
    />
  </div>
);

export const TextArea = ({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) => (
  <div>
    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg font-body text-sm border resize-none"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "#1a1a1a" }}
    />
  </div>
);

export const RichField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
    <RichTextEditor content={value || ""} onChange={onChange} />
  </div>
);

export const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) => (
  <div>
    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg font-body text-sm border bg-transparent cursor-pointer"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "#1a1a1a" }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

export const ArrayField = ({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder?: string }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity"
        style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
        <Plus size={10} /> Add
      </button>
    </div>
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            className="flex-1 px-3 py-1.5 rounded-lg font-body text-sm border"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "#1a1a1a" }}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="p-1.5 rounded hover:opacity-70 transition-opacity"
            style={{ color: "hsl(var(--destructive))" }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

export const SectionBox = ({ children, label }: { children: React.ReactNode; label?: string }) => (
  <div
    className="p-3 rounded-lg border space-y-2"
    style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--muted) / 0.15)" }}>
    {label && <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>}
    {children}
  </div>
);

export const ColorField = ({ label, value, onChange, description, fallback }: { label: string; value: string; onChange: (v: string) => void; description?: string; fallback?: string }) => {
  const displayValue = value || fallback || "#000000";
  return (
    <div>
      <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 block">{label}</label>
      {description && <p className="font-body text-[9px] text-muted-foreground/70 mb-1">{description}</p>}
      <div className="flex gap-1.5">
        <input
          type="color"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-9 rounded border cursor-pointer"
          style={{ borderColor: "hsl(var(--border))" }}
        />
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback || "#000000"}
          className="flex-1 px-3 py-2 rounded-lg font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "#1a1a1a" }}
        />
      </div>
    </div>
  );
};
