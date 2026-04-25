/**
 * AddWidgetButton — inline "+" affordance that opens a widget picker.
 *
 * Builder-only. Complements the drag-from-tray flow by giving editors
 * an explicit click-to-add path that doesn't require precision dragging
 * (better for accessibility and quick edits).
 *
 * Behaviour
 * ─────────
 *  • Renders a small "+" pill that, when clicked, pops a panel listing
 *    every widget in the registry (grouped by category).
 *  • Picking a widget calls `onPick(widgetType)` — the parent decides
 *    where in its data tree the new widget should land.
 *  • Closes on outside click or Escape.
 *
 * The component is intentionally STATELESS about the page tree. It
 * just opens the picker and reports the chosen widget type, so it can
 * be reused for empty-cell and between-widgets insertion equally.
 */

import { useEffect, useRef, useState } from "react";
import { Plus, Blocks } from "lucide-react";
import { listWidgets } from "@/lib/WidgetRegistry";

interface AddWidgetButtonProps {
  /** Called with the chosen widget `type` when the user picks one. */
  onPick: (widgetType: string) => void;
  /**
   * `inline` (default) — shown between widgets as a slim row.
   * `block`            — full-width pill for empty cells.
   */
  variant?: "inline" | "block";
  /** Optional label override for the button itself. */
  label?: string;
}

const AddWidgetButton = ({
  onPick,
  variant = "inline",
  label,
}: AddWidgetButtonProps) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Outside-click + Escape close the picker without firing onPick.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Group widgets by category so the picker mirrors the tray layout.
  const widgets = listWidgets();
  const grouped = widgets.reduce<Record<string, typeof widgets>>((acc, def) => {
    const key = def.category || "Other";
    (acc[key] ??= []).push(def);
    return acc;
  }, {});
  const orderedCategories = ["Layout", "Content", "Media", "Marketing", "Social", "Other"]
    .filter((c) => grouped[c]?.length);

  const triggerInline = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setOpen((o) => !o);
      }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-body uppercase tracking-[0.14em] transition-opacity opacity-60 hover:opacity-100"
      style={{
        backgroundColor: "hsl(var(--muted) / 0.6)",
        color: "hsl(var(--muted-foreground))",
        border: "1px dashed hsl(var(--border))",
      }}
      aria-label="Add widget here"
      title="Add widget here"
    >
      <Plus size={12} strokeWidth={2} />
      <span>{label ?? "Add widget"}</span>
    </button>
  );

  const triggerBlock = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setOpen((o) => !o);
      }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ backgroundColor: "hsl(var(--muted) / 0.6)" }}
      aria-label="Add widget"
    >
      <span
        style={{
          display: "inline-block",
          width: 16,
          height: 16,
          borderRadius: 999,
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          textAlign: "center",
          lineHeight: "16px",
          fontWeight: 700,
        }}
      >
        +
      </span>
      <span className="font-body text-[11px] uppercase tracking-wider"
        style={{ color: "hsl(var(--muted-foreground))" }}>
        {label ?? "Add widget"}
      </span>
    </button>
  );

  return (
    <div
      ref={wrapperRef}
      className="relative w-full"
      style={{
        display: "flex",
        justifyContent: "center",
        // Inline variant should fold to zero height when not visible.
        pointerEvents: "auto",
      }}
    >
      {variant === "inline" ? triggerInline : triggerBlock}

      {open && (
        <div
          // Float above sibling content; cells can be tightly packed.
          className="absolute z-50 mt-1 top-full left-1/2 -translate-x-1/2 rounded-lg shadow-xl"
          style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            width: 320,
            maxHeight: 420,
            overflowY: "auto",
            padding: 12,
          }}
          // Stop bubbling so the surrounding SelectableWrapper does not
          // hijack clicks on widget cards.
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {orderedCategories.length === 0 ? (
            <p className="font-body text-xs text-muted-foreground text-center py-4">
              No widgets registered.
            </p>
          ) : (
            orderedCategories.map((cat) => (
              <div key={cat} className="mb-3 last:mb-0">
                <h5
                  className="font-body text-[10px] uppercase tracking-[0.18em] font-medium mb-1.5"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {cat}
                </h5>
                <div className="grid grid-cols-3 gap-1.5">
                  {grouped[cat]
                    .slice()
                    .sort((a, b) =>
                      (a.label ?? a.type).localeCompare(b.label ?? b.type),
                    )
                    .map((def) => {
                      const Icon = def.icon ?? Blocks;
                      return (
                        <button
                          key={def.type}
                          type="button"
                          onClick={() => {
                            onPick(def.type);
                            setOpen(false);
                          }}
                          className="flex flex-col items-center justify-center gap-1 rounded-md border p-2 transition-colors"
                          style={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border) / 0.6)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "hsl(var(--accent))";
                            e.currentTarget.style.backgroundColor =
                              "hsl(var(--accent) / 0.08)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor =
                              "hsl(var(--border) / 0.6)";
                            e.currentTarget.style.backgroundColor =
                              "hsl(var(--card))";
                          }}
                          title={def.label ?? def.type}
                        >
                          <Icon
                            size={16}
                            strokeWidth={1.6}
                            style={{ color: "hsl(var(--foreground))" }}
                          />
                          <span
                            className="font-body text-[10px] leading-tight text-center line-clamp-2"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                          >
                            {def.label ?? def.type}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AddWidgetButton;
