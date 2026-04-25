/**
 * ════════════════════════════════════════════════════════════════════
 * BoxModelControl — User Story 2.3 (Visual Margin & Padding)
 * ════════════════════════════════════════════════════════════════════
 *
 * Renders the classic CSS Box Model UI (a square within a square) with
 * Top / Right / Bottom / Left number inputs for BOTH the outer Margin
 * ring and the inner Padding ring.
 *
 * Stateless and shape-agnostic: callers pass the four margin and four
 * padding values plus a single `onChange(field, value)` callback. The
 * component itself never reaches into a row or widget shape — that's
 * the parent's job (so the same widget can drive `__design` for widgets
 * and `row.layout` for rows without forking the UI).
 *
 * The inputs are wrapped in `data-inspector-field="<key>"` so the US 1.3
 * auto-focus hook can scroll & flash them when the canvas selection
 * jumps to a margin/padding control.
 */

export type BoxField =
  | "marginTop" | "marginRight" | "marginBottom" | "marginLeft"
  | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft";

interface Props {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  onChange: (field: BoxField, value: number) => void;
  /** Optional clamp — defaults to 0..999. */
  max?: number;
}

const clamp = (n: number, max: number) =>
  Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;

/** Tiny borderless number input used at each TRBL slot. */
const SlotInput = ({
  field,
  value,
  onChange,
  max,
  ariaLabel,
}: {
  field: BoxField;
  value: number;
  onChange: (field: BoxField, value: number) => void;
  max: number;
  ariaLabel: string;
}) => (
  <input
    type="number"
    min={0}
    max={max}
    value={Number.isFinite(value) ? value : 0}
    aria-label={ariaLabel}
    data-inspector-field={field}
    onChange={(e) => onChange(field, clamp(Number(e.target.value), max))}
    className="w-10 text-center bg-transparent border-0 outline-none font-body text-[11px] font-semibold focus:ring-1 focus:ring-primary rounded"
    style={{ color: "hsl(var(--foreground))", padding: "1px 2px" }}
  />
);

const RingLabel = ({
  text,
  color,
}: {
  text: string;
  color: string;
}) => (
  <span
    className="absolute top-1 left-2 font-body text-[9px] uppercase tracking-wider font-semibold pointer-events-none"
    style={{ color }}
  >
    {text}
  </span>
);

const BoxModelControl = ({
  marginTop, marginRight, marginBottom, marginLeft,
  paddingTop, paddingRight, paddingBottom, paddingLeft,
  onChange,
  max = 999,
}: Props) => {
  // Colour tokens: keep the rings cohesive with the shadcn palette so
  // the control reads correctly under any future theme tweak.
  const marginBg   = "hsl(var(--muted) / 0.45)";
  const paddingBg  = "hsl(var(--secondary) / 0.55)";
  const innerBg    = "hsl(var(--background))";
  const ringStroke = "hsl(var(--border))";
  const labelMuted = "hsl(var(--muted-foreground))";

  return (
    <div
      className="relative w-full select-none"
      role="group"
      aria-label="Margin and padding box model"
    >
      {/* ── MARGIN ring (outer) ─────────────────────────────────── */}
      <div
        className="relative rounded-md border"
        style={{
          backgroundColor: marginBg,
          borderColor: ringStroke,
          padding: "26px 18px",
        }}
      >
        <RingLabel text="Margin" color={labelMuted} />

        {/* Top margin */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2">
          <SlotInput
            field="marginTop" value={marginTop} onChange={onChange} max={max}
            ariaLabel="Margin top"
          />
        </div>
        {/* Bottom margin */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <SlotInput
            field="marginBottom" value={marginBottom} onChange={onChange} max={max}
            ariaLabel="Margin bottom"
          />
        </div>
        {/* Left margin */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2">
          <SlotInput
            field="marginLeft" value={marginLeft} onChange={onChange} max={max}
            ariaLabel="Margin left"
          />
        </div>
        {/* Right margin */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <SlotInput
            field="marginRight" value={marginRight} onChange={onChange} max={max}
            ariaLabel="Margin right"
          />
        </div>

        {/* ── PADDING ring (middle) ─────────────────────────────── */}
        <div
          className="relative rounded-md border"
          style={{
            backgroundColor: paddingBg,
            borderColor: ringStroke,
            padding: "26px 18px",
          }}
        >
          <RingLabel text="Padding" color={labelMuted} />

          {/* Top padding */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2">
            <SlotInput
              field="paddingTop" value={paddingTop} onChange={onChange} max={max}
              ariaLabel="Padding top"
            />
          </div>
          {/* Bottom padding */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
            <SlotInput
              field="paddingBottom" value={paddingBottom} onChange={onChange} max={max}
              ariaLabel="Padding bottom"
            />
          </div>
          {/* Left padding */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2">
            <SlotInput
              field="paddingLeft" value={paddingLeft} onChange={onChange} max={max}
              ariaLabel="Padding left"
            />
          </div>
          {/* Right padding */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <SlotInput
              field="paddingRight" value={paddingRight} onChange={onChange} max={max}
              ariaLabel="Padding right"
            />
          </div>

          {/* ── Inner content placeholder ─────────────────────── */}
          <div
            className="rounded-sm border flex items-center justify-center font-body text-[10px] uppercase tracking-wider"
            style={{
              backgroundColor: innerBg,
              borderColor: ringStroke,
              color: labelMuted,
              minHeight: 36,
            }}
          >
            Element
          </div>
        </div>
      </div>

      <p
        className="mt-2 font-body text-[10px] leading-snug"
        style={{ color: labelMuted }}
      >
        All values in <span className="font-semibold">px</span>. Click any side and type to set the spacing.
      </p>
    </div>
  );
};

export default BoxModelControl;
