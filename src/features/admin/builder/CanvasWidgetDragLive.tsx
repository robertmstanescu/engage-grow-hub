import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { CanvasWidgetDragData } from "./CanvasWidgetDrag";

interface WidgetDragHandleProps {
  widgetId: string;
  type: string;
  /** Extra classes — used for the hover-reveal behaviour. */
  className?: string;
}

const WidgetDragHandleLive = ({ widgetId, type, className = "" }: WidgetDragHandleProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `canvas-widget:${widgetId}`,
    data: { source: "canvas-widget", widgetId, type } satisfies CanvasWidgetDragData,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={`Move ${type} widget`}
      title="Drag to move this widget"
      onClick={(e) => e.stopPropagation()}
      {...listeners}
      {...attributes}
      className={`absolute z-50 -top-1 right-1 flex h-6 w-6 items-center justify-center rounded-md border border-blue-500 bg-white text-blue-600 shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${className}`}
      style={{ opacity: isDragging ? 0.4 : undefined }}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );
};

export default WidgetDragHandleLive;
