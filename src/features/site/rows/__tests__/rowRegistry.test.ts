/**
 * Registry completeness — the guard against half-wired row types.
 *
 * A row type only works end to end when three independent places agree:
 *   1. `ROW_TYPES` in src/types/rows.ts          (the type union)
 *   2. the widget registry, src/widgets/index.tsx (public renderer,
 *      label, icon, default content — also what RowsManager and the
 *      Elements Tray read)
 *   3. `ROW_TYPE_EDITORS` in RowTypeEditor.tsx    (admin editor)
 *
 * Historically they drifted: RowsManager kept a private 8-of-16 copy
 * (so "add column" threw on the other 8), and RowTypeEditor carried a
 * `"vows"` editor for a type that never existed. This test turns that
 * class of mistake into a failing `npm run check`.
 */
import { describe, it, expect } from "vitest";
import { ROW_TYPES } from "@/types/rows";
import { getWidget, listWidgets } from "@/widgets";
import { ROW_TYPE_EDITORS } from "@/features/admin/editors/RowTypeEditor";

const editorTypes = Object.keys(ROW_TYPE_EDITORS).sort();
const rowTypes = [...ROW_TYPES].sort();

describe("row type registry", () => {
  it("has no duplicate row types", () => {
    expect(new Set(ROW_TYPES).size).toBe(ROW_TYPES.length);
  });

  it.each(ROW_TYPES)("'%s' has a registered renderer with label, icon and defaultData", (type) => {
    const def = getWidget(type);
    expect(def, `no registerWidget() call for "${type}" in src/widgets/index.tsx`).toBeDefined();
    expect(def?.label, `"${type}" needs a label`).toBeTruthy();
    expect(def?.icon, `"${type}" needs an icon (RowsManager and the Elements Tray show it)`).toBeTruthy();
    expect(def?.defaultData, `"${type}" needs defaultData (used when a column is added)`).toBeDefined();
    expect(
      def?.render || def?.frontendComponent,
      `"${type}" needs a render() or frontendComponent`,
    ).toBeTruthy();
  });

  it("every row type has an editor, and every editor is for a real row type", () => {
    // Both directions in one assertion so the diff names the offender.
    expect(editorTypes).toEqual(rowTypes);
  });

  it("registers no widget outside ROW_TYPES except the modular add-ons", () => {
    // Modular widgets (src/features/widgets/*) that are not page rows
    // are allowed here. Add to this list deliberately.
    const nonRowWidgets = ["cta_button", "subscribe"];
    const registered = listWidgets().map((w) => w.type);
    const unknown = registered.filter((t) => !ROW_TYPES.includes(t as never) && !nonRowWidgets.includes(t));
    expect(unknown, "widget type registered but missing from ROW_TYPES").toEqual([]);
  });
});
