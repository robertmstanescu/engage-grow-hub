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
import { renderWidget, getWidget } from "@/lib/WidgetRegistry";
import WidgetWrapper from "@/components/widgets/WidgetWrapper";
import type { GlobalWidget } from "@/hooks/useGlobalWidgets";
import SelectableWrapper from "@/features/admin/builder/SelectableWrapper";
import { type NodePath, useBuilder } from "@/features/admin/builder/BuilderContext";
import WidgetDragHandle from "@/features/admin/builder/CanvasWidgetDrag";
import type { Alignment, VAlign } from "@/lib/layoutUtils";
import { CurrentWidgetProvider } from "./PrimaryHeadingContext";

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
  const { enabled: builderEnabled } = useBuilder();
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

  const design = readDesignSettings(renderRow.content);
  const widgetPath: NodePath = ["row", parentRow.id, "widget", widget.id];

  /* Many widgets deliberately paint NOTHING while they're still empty
     (Quote Band with no quote, How We Work with no steps, …). Correct
     on the live site — fatal in the editor, where an invisible widget
     can't be clicked, so its settings can never be opened. In the
     builder we swap the null for a labelled, selectable placeholder.
     A block the registry has never heard of lands here too, and reads
     very differently: the page is fine, this build of the site is
     behind it. Say so, rather than calling it empty. */
  if (rendered === null) {
    if (!builderEnabled) return null;
    const def = getWidget(renderRow.type as string);
    return (
      <SelectableWrapper path={widgetPath} label={renderRow.type} variant="widget">
        <div className="group relative w-full rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-4 py-6 text-center">
          <WidgetDragHandle
            widgetId={widget.id}
            type={renderRow.type as string}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100"
          />
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-blue-700">
            {def?.label || renderRow.type}
          </p>
          <p className="mt-1 font-body text-xs text-blue-700/70">
            {def
              ? "Empty — click to add content in the settings panel"
              : `This build of the site has no “${renderRow.type}” block. Reload the page; if it stays, the site needs deploying.`}
          </p>
        </div>
      </SelectableWrapper>
    );
  }

  /* Optional per-widget slug → DOM id, so any widget can be deep-linked
     (`/#pricing-cards`) exactly like a row. */
  const slug = typeof (renderRow.content as any)?.__slug === "string"
    ? (renderRow.content as any).__slug.trim()
    : "";

  return (
    <CurrentWidgetProvider value={widget.id}>
      <SelectableWrapper path={widgetPath} label={renderRow.type} variant="widget">
        <div
          id={slug || undefined}
          className={`${builderEnabled ? "group relative " : ""}${slug ? "scroll-mt-16" : ""}`.trim() || undefined}
        >
          {builderEnabled && (
            <WidgetDragHandle
              widgetId={widget.id}
              type={renderRow.type as string}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100"
            />
          )}
          <WidgetWrapper design={design}>{rendered}</WidgetWrapper>
        </div>
      </SelectableWrapper>
    </CurrentWidgetProvider>
  );


};


export default WidgetNode;
