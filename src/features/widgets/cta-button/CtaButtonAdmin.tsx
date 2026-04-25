/**
 * CtaButtonAdmin — editor for the standalone CTA button widget.
 *
 * Mirrors the row-level cta_label / cta_url field pair the legacy
 * row editors expose, so admins migrating an inline CTA into a widget
 * keep the same mental model.
 */
import { useEffect, useState } from "react";

interface CtaButtonContent {
  cta_label?: string;
  cta_url?: string;
  align?: "left" | "center" | "right";
}

interface CtaButtonAdminProps {
  content: CtaButtonContent;
  onChange: (field: string, value: unknown) => void;
}

const useDeferredText = (value: string, commit: (v: string) => void) => {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return {
    local,
    setLocal,
    commit: () => {
      if (local !== value) commit(local);
    },
  };
};

const CtaButtonAdmin = ({ content, onChange }: CtaButtonAdminProps) => {
  const labelField = useDeferredText(content.cta_label ?? "", (v) =>
    onChange("cta_label", v.slice(0, 60)),
  );
  const urlField = useDeferredText(content.cta_url ?? "", (v) => onChange("cta_url", v));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="font-body text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Button Label
        </label>
        <input
          type="text"
          value={labelField.local}
          onChange={(e) => labelField.setLocal(e.target.value)}
          onBlur={labelField.commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              labelField.commit();
            }
          }}
          maxLength={60}
          placeholder="Book a call"
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm font-body"
        />
      </div>

      <div className="space-y-1.5">
        <label className="font-body text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Button URL
        </label>
        <input
          type="text"
          value={urlField.local}
          onChange={(e) => urlField.setLocal(e.target.value)}
          onBlur={urlField.commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              urlField.commit();
            }
          }}
          placeholder="/contact or https://…"
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm font-body"
        />
      </div>

      <div className="space-y-1.5">
        <label className="font-body text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Alignment
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(["left", "center", "right"] as const).map((a) => {
            const active = (content.align ?? "center") === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => onChange("align", a)}
                className="px-2 py-1.5 rounded-md text-[11px] font-body uppercase tracking-wider border"
                style={{
                  backgroundColor: active ? "hsl(var(--accent))" : "hsl(var(--card))",
                  color: active ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))",
                  borderColor: active ? "hsl(var(--accent))" : "hsl(var(--border))",
                }}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CtaButtonAdmin;
