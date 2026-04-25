/**
 * SubscribeAdmin — minimal editor for the standalone Subscribe widget.
 *
 * The actual form behaviour lives in `SubscribeWidget`. The admin
 * surface only exposes copy + alignment so editors don't accidentally
 * rewire the submission pipeline.
 */
import { useEffect, useState } from "react";

interface SubscribeContent {
  trigger_label?: string;
  align?: "left" | "center" | "right";
}

interface SubscribeAdminProps {
  content: SubscribeContent;
  onChange: (field: string, value: unknown) => void;
}

const SubscribeAdmin = ({ content, onChange }: SubscribeAdminProps) => {
  const [label, setLabel] = useState(content.trigger_label ?? "");

  useEffect(() => {
    setLabel(content.trigger_label ?? "");
  }, [content.trigger_label]);

  const commitLabel = () => {
    if (label !== (content.trigger_label ?? "")) onChange("trigger_label", label);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="font-body text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Button label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitLabel();
            }
          }}
          placeholder="Keep me updated with insights & articles"
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm font-body"
        />
        <p className="font-body text-[11px] text-muted-foreground">
          Leave blank to use the default copy.
        </p>
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

export default SubscribeAdmin;
