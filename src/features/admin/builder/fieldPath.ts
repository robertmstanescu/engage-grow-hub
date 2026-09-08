import type { NodePath } from "./BuilderContext";

/**
 * fieldPathToNodePath — turn the legacy `fieldPath` strings the row
 * renderers already carry (`rows.3.content.cards.1.title`,
 * `rows.3.columns_data.0.body`, `rows.3.content.subtitle`) into the
 * builder's NodePath for the current widget, so every EditableText on
 * the canvas becomes a real inline editor without touching the rows.
 *
 * Returns null for shapes the writer cannot address.
 */
export const fieldPathToNodePath = (widgetId: string, fieldPath: string | undefined): NodePath | null => {
  if (!fieldPath) return null;
  const parts = fieldPath.split(".").filter(Boolean);
  const base: NodePath = ["row", widgetId, "widget", widgetId];
  let i = 0;
  if (parts[i] === "rows") { i += 2; } // rows.<index>
  let col = 0;
  if (parts[i] === "content") { i += 1; }
  else if (parts[i] === "columns_data") { col = Number(parts[i + 1]) + 1; i += 2; if (Number.isNaN(col)) return null; }
  const rest = parts.slice(i);
  if (rest.length === 0) return null;
  if (rest.length === 1) return [...base, "col", String(col), rest[0]];
  if (rest.length === 3 && /^\d+$/.test(rest[1])) {
    if (col !== 0) return null; // lists inside legacy extra columns are not addressable
    return [...base, "list", rest[0], rest[1], rest[2]];
  }
  return null;
};
