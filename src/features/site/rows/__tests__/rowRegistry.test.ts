/**
 * Registry completeness — the guard against half-wired row types.
 *
 * A row type only works end to end when these agree:
 *   1. `ROW_TYPES` in src/types/rows.ts          (the type union)
 *   2. the widget registry                        (public renderer,
 *      label, icon, default content — what RowsManager and the
 *      Elements Tray read). Migrated types register from their own
 *      folder, src/features/widgets/<type>/, with a zod `schema`
 *      and an `adminComponent`; the rest still register inline in
 *      src/widgets/index.tsx.
 *   3. an admin editor: the registry's `adminComponent`, or, for
 *      not-yet-migrated types, an entry in `ROW_TYPE_EDITORS`.
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

const editorMapTypes = Object.keys(ROW_TYPE_EDITORS).sort();

describe("row type registry", () => {
  it("has no duplicate row types", () => {
    expect(new Set(ROW_TYPES).size).toBe(ROW_TYPES.length);
  });

  it.each(ROW_TYPES)("'%s' has a registered renderer with label, icon and defaultData", (type) => {
    const def = getWidget(type);
    expect(def, `no registerWidget() call for "${type}"`).toBeDefined();
    expect(def?.label, `"${type}" needs a label`).toBeTruthy();
    expect(def?.icon, `"${type}" needs an icon (RowsManager and the Elements Tray show it)`).toBeTruthy();
    expect(def?.defaultData, `"${type}" needs defaultData (used when a column is added)`).toBeDefined();
    expect(
      def?.render || def?.frontendComponent,
      `"${type}" needs a render() or frontendComponent`,
    ).toBeTruthy();
  });

  it.each(ROW_TYPES)("'%s' has exactly one editor: registry adminComponent or ROW_TYPE_EDITORS", (type) => {
    const fromRegistry = !!getWidget(type)?.adminComponent;
    const fromMap = type in ROW_TYPE_EDITORS;
    expect(
      fromRegistry || fromMap,
      `"${type}" has no editor: add adminComponent in its widget module or a ROW_TYPE_EDITORS entry`,
    ).toBe(true);
    expect(
      fromRegistry && fromMap,
      `"${type}" has two editors; a migrated widget must be removed from ROW_TYPE_EDITORS`,
    ).toBe(false);
  });

  it("has no ROW_TYPE_EDITORS entry for a type that is not a row type", () => {
    const unknown = editorMapTypes.filter((t) => !ROW_TYPES.includes(t as never));
    expect(unknown).toEqual([]);
  });

  it("registers no widget outside ROW_TYPES except the modular add-ons", () => {
    // Modular widgets (src/features/widgets/*) that are not page rows
    // are allowed here. Add to this list deliberately.
    const nonRowWidgets = ["cta_button", "subscribe"];
    const registered = listWidgets().map((w) => w.type);
    const unknown = registered.filter((t) => !ROW_TYPES.includes(t as never) && !nonRowWidgets.includes(t));
    expect(unknown, "widget type registered but missing from ROW_TYPES").toEqual([]);
  });

  /**
   * Migrated types (those with a schema) must keep schema, defaults and
   * editor in step: defaultData is what the schema produces from `{}`,
   * and it round-trips through the schema unchanged.
   */
  const withSchema = ROW_TYPES.filter((t) => getWidget(t)?.schema);
  it("has at least one schema-backed row type (boxed was migrated first)", () => {
    expect(withSchema).toContain("boxed");
  });
  it.each(withSchema)("'%s' schema, defaultData and adminComponent agree", (type) => {
    const def = getWidget(type)!;
    expect(def.adminComponent, `"${type}" has a schema but no adminComponent`).toBeTruthy();
    expect(def.defaultData).toEqual(def.schema!.parse({}));
    const round = def.schema!.safeParse(def.defaultData);
    expect(round.success, `"${type}" defaultData does not satisfy its own schema`).toBe(true);
    // Engine meta keys must survive parsing (schemas are .loose()).
    const meta = def.schema!.safeParse({ __design: { x: 1 }, __slug: "s" });
    expect(meta.success).toBe(true);
    if (meta.success) expect((meta.data as Record<string, unknown>).__slug).toBe("s");
  });
});
