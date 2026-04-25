import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import RichTextEditor from "../RichTextEditor";
import { useBrandColors } from "@/hooks/useBrandSettings";

/* Shared style: always legible regardless of site theme */
const INPUT_STYLE: React.CSSProperties = {
  borderColor: "hsl(var(--border))",
  backgroundColor: "#FFFFFF",
  color: "#1a1a1a",
};

/**
 * A controlled text input that keeps local state while typing
 * and only fires onChange on blur or Enter — prevents save-per-keystroke.
 */
const useDeferredValue = (externalValue: string, onCommit: (v: string) => void) => {
  const [local, setLocal] = useState(externalValue || "");
  const committedRef = useRef(externalValue || "");

  useEffect(() => {
    // Only sync from parent if value actually changed externally
    if (externalValue !== committedRef.current) {
      setLocal(externalValue || "");
      committedRef.current = externalValue || "";
    }
  }, [externalValue]);

  const commit = useCallback(() => {
    if (local !== committedRef.current) {
      committedRef.current = local;
      onCommit(local);
    }
  }, [local, onCommit]);

  return { local, setLocal, commit };
};

/**
 * US 1.3 — Inspector auto-focus.
 * Slug a human label ("Stat 1 Value", "Eyebrow", "Title Lines") into a
 * stable key the canvas-side `useInspectorFocus` hook can target. We
 * trim trailing digits/words ("Stat 1 Value" → "stat_value") so atomic
 * leaf names from the canvas (which carry no index info) still match.
 */
const slugifyLabel = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");



export const Field = ({
  label,
  value,
  onChange,
  maxLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Optional native maxLength on the underlying <input>. */
  maxLength?: number;
  /** Optional helper text shown beneath the input. */
  hint?: string;
}) => {
  const { local, setLocal, commit } = useDeferredValue(value, onChange);
  return (
    <div data-inspector-field={slugifyLabel(label)}>
      <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
        maxLength={maxLength}
        className="w-full px-3 py-2 rounded-lg font-body text-sm border"
        style={INPUT_STYLE}
      />
      {hint && (
        <p className="font-body text-[10px] text-muted-foreground mt-1">{hint}</p>
      )}
    </div>
  );
};

export const TextArea = ({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) => {
  const { local, setLocal, commit } = useDeferredValue(value, onChange);
  return (
    <div data-inspector-field={slugifyLabel(label)}>
      <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        rows={rows}
        className="w-full px-3 py-2 rounded-lg font-body text-sm border resize-none text-black"
        style={INPUT_STYLE}
      />
    </div>
  );
};

/**
 * RichField — labelled wrapper around the RichTextEditor.
 *
 * `bgColor` is the live row's background. We forward it so the editor
 * surface mirrors the row's "Style State" — that's what makes white /
 * grey text legible on the white admin panel. Callers should pass
 * `row.bg_color` (or the resolved gradient stop) in.
 */
export const RichField = ({ label, value, onChange, bgColor }: { label: string; value: string; onChange: (v: string) => void; bgColor?: string }) => (
  <div data-inspector-field={slugifyLabel(label)}>
    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
    <RichTextEditor content={value || ""} onChange={onChange} bgColor={bgColor} />
  </div>
);

export const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) => (
  <div data-inspector-field={slugifyLabel(label)}>
    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg font-body text-sm border cursor-pointer"
      style={INPUT_STYLE}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

export const ArrayField = ({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder?: string }) => {
  const [localItems, setLocalItems] = useState(items);
  const committedRef = useRef(items);

  useEffect(() => {
    if (JSON.stringify(items) !== JSON.stringify(committedRef.current)) {
      setLocalItems(items);
      committedRef.current = items;
    }
  }, [items]);

  const commitAll = () => {
    if (JSON.stringify(localItems) !== JSON.stringify(committedRef.current)) {
      committedRef.current = localItems;
      onChange(localItems);
    }
  };

  return (
    <div data-inspector-field={slugifyLabel(label)}>
      <div className="flex items-center justify-between mb-1">
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
        <button
          type="button"
          onClick={() => { const next = [...localItems, ""]; setLocalItems(next); committedRef.current = next; onChange(next); }}
          className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity"
          style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-1.5">
        {localItems.map((item, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              value={item}
              onChange={(e) => {
                const next = [...localItems];
                next[i] = e.target.value;
                setLocalItems(next);
              }}
              onBlur={commitAll}
              onKeyDown={(e) => { if (e.key === "Enter") commitAll(); }}
              placeholder={placeholder}
              className="flex-1 px-3 py-1.5 rounded-lg font-body text-sm border"
              style={INPUT_STYLE}
            />
            <button
              type="button"
              onClick={() => { const next = localItems.filter((_, j) => j !== i); setLocalItems(next); committedRef.current = next; onChange(next); }}
              className="p-1.5 rounded hover:opacity-70 transition-opacity"
              style={{ color: "hsl(var(--destructive))" }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const { local, setLocal, commit } = useDeferredValue(value, onChange);
  const brandColors = useBrandColors();
  return (
    <div data-inspector-field={slugifyLabel(label)}>
      <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 block">{label}</label>
      {description && <p className="font-body text-[9px] text-muted-foreground/70 mb-1">{description}</p>}
      <div className="flex gap-1 mb-1.5 flex-wrap">
        {brandColors.map((c) => (
          <button key={c.id} type="button" title={c.name} onClick={() => { onChange(c.hex); setLocal(c.hex); }}
            className="w-5 h-5 rounded-full border hover:scale-110 transition-transform"
            style={{ backgroundColor: c.hex, borderColor: c.hex === value ? "hsl(var(--primary))" : "hsl(var(--border))", outline: c.hex === value ? "2px solid hsl(var(--primary))" : "none", outlineOffset: "1px" }} />
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          type="color"
          value={displayValue}
          onChange={(e) => { onChange(e.target.value); setLocal(e.target.value); }}
          className="w-10 h-9 rounded border cursor-pointer"
          style={{ borderColor: "hsl(var(--border))" }}
        />
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
          placeholder={fallback || "#000000"}
          className="flex-1 px-3 py-2 rounded-lg font-body text-sm border"
          style={INPUT_STYLE}
        />
      </div>
    </div>
  );
};
