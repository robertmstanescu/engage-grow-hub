/**
 * ─────────────────────────────────────────────────────────────────────────
 * SubscribeToggle.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Compact "Show newsletter signup" toggle that lives at the top of
 * `RowContentEditor` for EVERY row type.
 *
 * WHY THIS COMPONENT EXISTS (junior-engineer guide)
 * ─────────────────────────────────────────────────
 * Previously the toggle was hidden in `RowsManager.tsx`, far from the
 * field the admin was actually editing. That made it easy to miss and
 * easy to forget to enable. By extracting the control into its own tiny
 * component and rendering it from `RowContentEditor`, we get:
 *
 *   1. ONE source of truth for the toggle UI (visual consistency).
 *   2. Universal availability — every row type gets it for free, no
 *      per-editor duplication.
 *   3. A single, consistent JSON key (`content.show_subscribe`) — the
 *      public-facing row components all read this same key.
 *
 * DATA FLOW
 * ─────────
 *   admin clicks → onChange("show_subscribe", boolean)
 *     → upstream writes content.show_subscribe in the active column
 *     → save → the public row component reads `c.show_subscribe`
 *     → if true, renders <SubscribeWidget /> at the bottom of the row
 *
 * Adding a new row type? You don't need to touch this component at all.
 * Just make sure the public renderer for the new row type checks
 * `content.show_subscribe` and conditionally renders <SubscribeWidget />
 * — search the codebase for `show_subscribe` to see the pattern.
 * ───────────────────────────────────────────────────────────────────────── */

import { Mail } from "lucide-react";

interface Props {
  /** Current value (defaults to false when undefined). */
  value: boolean;
  /** Called with the new boolean. */
  onChange: (next: boolean) => void;
}

const SubscribeToggle = ({ value, onChange }: Props) => (
  <label
    className={[
      "flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer mb-3 transition-colors",
      value
        ? "border-secondary/50 bg-secondary/[0.06]"
        : "border-border bg-muted/20 hover:bg-muted/40",
    ].join(" ")}
  >
    <input
      type="checkbox"
      checked={!!value}
      onChange={(e) => onChange(e.target.checked)}
      className="rounded"
      style={{ accentColor: "hsl(var(--secondary))" }}
    />
    <Mail size={14} className={value ? "text-secondary" : "text-muted-foreground"} />
    <div className="flex-1 min-w-0">
      <div className="font-body text-xs font-medium text-foreground">
        Show newsletter signup
      </div>
      <div className="font-body text-[10px] text-muted-foreground">
        Renders the subscribe widget at the bottom of this row.
      </div>
    </div>
  </label>
);

export default SubscribeToggle;
