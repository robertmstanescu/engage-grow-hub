/**
 * ════════════════════════════════════════════════════════════════════
 * CellSettingsEditor — User Story 1.2 ("LumApps-style Cell Management")
 * ════════════════════════════════════════════════════════════════════
 *
 * Renders the "Cell Settings" panel in the Inspector when the editor
 * has a cell selected on the canvas. Edits the THREE settings groups
 * a cell owns (`layout`, `style`, `span`) plus its scoped custom CSS.
 *
 * Stateless: receives the cell + a single `onChange(patch)` callback
 * that performs an immutable merge inside the parent (`InspectorPanel`)
 * so all writes go through the standard `onRowsChange` pipeline.
 *
 * Why one component per group? A cell legitimately has 3 distinct
 * concerns:
 *   • LAYOUT  — how widgets sit inside (flex direction / align / gap)
 *   • STYLE   — visual chrome (bg / border / radius)
 *   • SPAN    — how the cell sits inside the grid (col-span / row-span)
 *   • CSS     — power-user escape hatch
 * Co-locating them in one editor keeps the inspector "do one thing
 * really well" — selecting a cell shows EVERYTHING you can do to that
 * cell, with no panel-flipping.
 */

import {
  type PageCell,
  type PageCellLayout,
  type PageCellStyle,
  type PageCellSpan,
  type CellDirection,
  type CellVAlign,
  type CellHAlign,
  readCellLayout,
  readCellStyle,
  readCellSpan,
} from "@/types/rows";
import { Field, SelectField, ColorField, SectionBox, TextArea } from "../site-editor/FieldComponents";

interface Props {
  cell: PageCell;
  /** Patch any combination of layout/style/span/customClass/customCss. */
  onChange: (patch: Partial<PageCell>) => void;
}

/* ── tiny number-field used inside this editor only ─────────────── */
const NumField = ({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) => (
  <div data-inspector-field={label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}>
    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
      {label}
    </label>
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      onChange={(e) => {
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : 0);
      }}
      className="w-full px-3 py-2 rounded-lg font-body text-sm border"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: "#FFFFFF", color: "#1a1a1a" }}
    />
  </div>
);

const CellSettingsEditor = ({ cell, onChange }: Props) => {
  const layout = readCellLayout(cell);
  const style = readCellStyle(cell);
  const span = readCellSpan(cell);

  const patchLayout = (partial: Partial<PageCellLayout>) =>
    onChange({ layout: { ...layout, ...partial } });
  const patchStyle = (partial: Partial<PageCellStyle>) =>
    onChange({ style: { ...style, ...partial } });
  const patchSpan = (partial: Partial<PageCellSpan>) =>
    onChange({ span: { ...span, ...partial } });

  return (
    <div className="space-y-3">
      {/* ── LAYOUT — how widgets stack inside the cell ───────────── */}
      <SectionBox label="Layout">
        <SelectField
          label="Direction"
          value={layout.direction}
          onChange={(v) => patchLayout({ direction: v as CellDirection })}
          options={[
            { label: "Vertical (stack)", value: "vertical" },
            { label: "Horizontal (row)", value: "horizontal" },
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Vertical Align"
            value={layout.verticalAlign}
            onChange={(v) => patchLayout({ verticalAlign: v as CellVAlign })}
            options={[
              { label: "Top", value: "top" },
              { label: "Middle", value: "middle" },
              { label: "Bottom", value: "bottom" },
              { label: "Stretch", value: "stretch" },
            ]}
          />
          <SelectField
            label="Justify"
            value={layout.justify}
            onChange={(v) => patchLayout({ justify: v as CellHAlign })}
            options={[
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
              { label: "Stretch", value: "stretch" },
            ]}
          />
        </div>
        <NumField label="Gap" value={layout.gap} onChange={(v) => patchLayout({ gap: v })} max={400} />
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Padding Top" value={layout.paddingTop} onChange={(v) => patchLayout({ paddingTop: v })} max={400} />
          <NumField label="Padding Right" value={layout.paddingRight} onChange={(v) => patchLayout({ paddingRight: v })} max={400} />
          <NumField label="Padding Bottom" value={layout.paddingBottom} onChange={(v) => patchLayout({ paddingBottom: v })} max={400} />
          <NumField label="Padding Left" value={layout.paddingLeft} onChange={(v) => patchLayout({ paddingLeft: v })} max={400} />
        </div>
        <NumField
          label="Min Height"
          value={layout.minHeight}
          onChange={(v) => patchLayout({ minHeight: v })}
          max={2000}
        />
      </SectionBox>

      {/* ── STYLE — visual chrome ─────────────────────────────────── */}
      <SectionBox label="Style">
        <ColorField
          label="Background"
          value={style.bgColor}
          onChange={(v) => patchStyle({ bgColor: v })}
        />
        <NumField
          label="Border Radius"
          value={style.borderRadius}
          onChange={(v) => patchStyle({ borderRadius: v })}
          max={200}
        />
        <div className="grid grid-cols-2 gap-2">
          <ColorField
            label="Border Color"
            value={style.borderColor}
            onChange={(v) => patchStyle({ borderColor: v })}
          />
          <NumField
            label="Border Width"
            value={style.borderWidth}
            onChange={(v) => patchStyle({ borderWidth: v })}
            max={40}
          />
        </div>
      </SectionBox>

      {/* ── ADVANCED — span + custom class + custom CSS ───────────── */}
      <SectionBox label="Advanced">
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="Column Span"
            value={span.col}
            onChange={(v) => patchSpan({ col: Math.max(1, v) })}
            min={1}
            max={12}
          />
          <NumField
            label="Row Span"
            value={span.row}
            onChange={(v) => patchSpan({ row: Math.max(1, v) })}
            min={1}
            max={12}
          />
        </div>
        <Field
          label="Custom Class"
          value={style.customClass}
          onChange={(v) => patchStyle({ customClass: v })}
          hint="Appended to the cell wrapper. Style it from your global CSS."
        />
        <TextArea
          label="Custom CSS"
          value={style.customCss}
          onChange={(v) => patchStyle({ customCss: v })}
          rows={5}
        />
        <p className="font-body text-[10px] text-muted-foreground -mt-1">
          Use <code>&amp;</code> to refer to this cell. e.g. <code>&amp; {`{ box-shadow: 0 8px 24px rgba(0,0,0,.2); }`}</code>
        </p>
      </SectionBox>
    </div>
  );
};

export default CellSettingsEditor;
