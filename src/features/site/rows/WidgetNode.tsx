/**
 * WidgetNode — render a single `PageWidget` inside a v3 cell.
 *
 * This is the atomic dispatch point of the rendering engine: it wraps
 * the widget data in a synthetic `PageRow` shape so the existing
 * `renderWidget()` registry can paint it, applies per-instance design
 * overrides via `WidgetWrapper`, and (in the admin canvas) wires the
 * `SelectableWrapper` so the widget can be clicked / selected.
 *
 * GLOBAL WIDGET RESOLUTION
 * ────────────────────────
 * If the widget's content carries a `__global_ref` key, the value is
 * looked up in the in-memory `globalMap` (sourced from the
 * `global_widgets` table by `useGlobalWidgetMap`). The looked-up
 * widget's `type` and `data` REPLACE the local content, while a local
 * `__design` override — if present — is preserved so per-instance
 * spacing / background still apply. If the reference cannot be
 * resolved (e.g. the global widget was deleted), we render a small
 * placeholder instead of throwing.
 */

import type { PageRow, PageRowV3, PageWidget } from "@/types/rows";
import { readDesignSettings, readGlobalRef } from "@/lib/constants/rowDefaults";
import { renderWidget } from "@/lib/WidgetRegistry";
import WidgetWrapper from "@/components/widgets/WidgetWrapper";
import type { GlobalWidget } from "@/hooks/useGlobalWidgets";
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";
import { type NodePath } from "@/features/admin/builder/BuilderContext";
import type { Alignment, VAlign } from "@/lib/layoutUtils";

interface WidgetNodeProps {
  widget: PageWidget;
  parentRow: PageRowV3;
  rowIndex: number;
  align: Alignment;
  vAlign: VAlign;
  globalMap: Map<string, GlobalWidget>;
}

const WidgetNode = ({
  widget,
  parentRow,
  rowIndex,
  align,
  vAlign,
  globalMap,
}: WidgetNodeProps) => {
  // Synthesize a legacy-shaped PageRow so the existing widget registry
  // (which expects `{ row, rowIndex, align, vAlign }`) can paint it.
  const adapterRow: PageRow = {
    id: widget.id,
    type: widget.type as PageRow["type"],
    strip_title: parentRow.strip_title,
    bg_color: parentRow.bg_color,
    scope: parentRow.scope,
    layout: parentRow.layout,
    content: widget.data || {},
  };

  // Resolve __global_ref → live data from the global_widgets registry.
  const globalRef = readGlobalRef(adapterRow.content);
  let renderRow = adapterRow;
  let missingGlobal = false;
  if (globalRef) {
    const g = globalMap.get(globalRef);
    if (g) {
      const localDesign = (adapterRow.content as any)?.__design;
      const mergedContent = localDesign
        ? { ...g.data, __design: localDesign }
        : g.data;
      renderRow = { ...adapterRow, type: g.type as PageRow["type"], content: mergedContent };
    } else {
      missingGlobal = true;
    }
  }

  if (missingGlobal) {
    return (
      <div className="py-8 text-center font-body text-xs text-muted-foreground">
        (Referenced global block was removed)
      </div>
    );
  }

  const rendered = renderWidget({ row: renderRow, rowIndex, align, vAlign });
  if (rendered === null) return null;

  const design = readDesignSettings(renderRow.content);
  const widgetPath: NodePath = ["row", parentRow.id, "widget", widget.id];

  return (
    <SelectableWrapper path={widgetPath} label={renderRow.type} variant="widget">
      <WidgetWrapper design={design}>{rendered}</WidgetWrapper>
    </SelectableWrapper>
  );
};

export default WidgetNode;
