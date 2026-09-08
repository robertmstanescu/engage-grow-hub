/**
 * Boxed row — registry entry point.
 *
 * One folder per row type: `schema.ts` (fields + defaults + types),
 * the public renderer (BoxedRow) and the admin editor (BoxedRowEditor),
 * wired here in a single `registerWidget()` call. `src/widgets/index.tsx`
 * imports this file once at boot; nothing else needs to know "boxed"
 * exists. `rowRegistry.test.ts` fails if any piece is missing.
 *
 * The first row type migrated to this shape; the others still register
 * inline in src/widgets/index.tsx until their own PR moves them.
 */
import { lazy } from "react";
import { registerWidget } from "@/lib/WidgetRegistry";
import { Boxes } from "lucide-react";
import BoxedRow from "@/features/site/rows/BoxedRow";
import { boxedSchema, BOXED_DEFAULTS, type BoxedContent } from "./schema";

// The editor is loaded lazily on purpose: this module is imported at
// boot for the PUBLIC site (src/widgets/index.tsx), and a static import
// would drag the admin editor — rich-text editor, image picker, icon
// picker — into the public bundle. `lazy()` keeps it in the Admin chunk;
// the callers (RowTypeEditor, InspectorPanel) render it under Suspense.
const BoxedRowEditor = lazy(() => import("@/features/admin/site-editor/BoxedRowEditor"));

registerWidget<BoxedContent>({
  type: "boxed",
  label: "Boxed Cards",
  icon: Boxes,
  category: "Content",
  schema: boxedSchema,
  defaultData: BOXED_DEFAULTS,
  adminComponent: BoxedRowEditor,
  frontendComponent: BoxedRow,
  render: ({ row, rowIndex, align, vAlign }) => (
    <BoxedRow row={row} rowIndex={rowIndex} align={align} vAlign={vAlign} />
  ),
});

export { boxedSchema, BOXED_DEFAULTS };
export type { BoxedContent, BoxedCard } from "./schema";
