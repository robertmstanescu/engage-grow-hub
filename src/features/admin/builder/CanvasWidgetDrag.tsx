/**
 * CanvasWidgetDrag — pick up a widget that ALREADY lives on the canvas
 * and move it into another cell (or between rows).
 *
 * The tray drags CREATE widgets; this drag MOVES one. Both flow through
 * the same `handleDragEnd` in PageBuilderShell, told apart by the
 * `source: "canvas-widget"` marker on the drag payload.
 *
 * Builder-only: the handle is rendered exclusively from `WidgetNode`
 * when a BuilderProvider is above the tree, so the public site never
 * sees this DOM (and never mounts a `useDraggable` outside a
 * DndContext).
 */
import { Suspense, lazy } from "react";
import { GripVertical } from "lucide-react";

export interface CanvasWidgetDragData {
  source: "canvas-widget";
  widgetId: string;
  /** Widget type — used for the drag preview label. */
  type: string;
}

export const isCanvasWidgetDragData = (d: unknown): d is CanvasWidgetDragData =>
  !!d && typeof d === "object" && (d as any).source === "canvas-widget" &&
  typeof (d as any).widgetId === "string";

export const CanvasWidgetDragPreview = ({ data }: { data: CanvasWidgetDragData }) => (
  <div className="flex items-center gap-2 rounded-md border border-blue-500 bg-white px-3 py-2 text-xs font-medium text-blue-700 shadow-lg">
    <GripVertical className="h-3.5 w-3.5" />
    {data.type}
  </div>
);

interface WidgetDragHandleProps {
  widgetId: string;
  type: string;
  className?: string;
}

/* The draggable handle (and dnd-kit) loads only inside a builder. */
const WidgetDragHandleLive = lazy(() => import("./CanvasWidgetDragLive"));

const WidgetDragHandle = (props: WidgetDragHandleProps) => (
  <Suspense fallback={null}>
    <WidgetDragHandleLive {...props} />
  </Suspense>
);

export default WidgetDragHandle;
