/**
 * parseContent: read a row's saved content through its schema without
 * ever throwing. A row whose saved fields are malformed (a null where a
 * string belongs, say) falls back to the schema's defaults, so one bad
 * row cannot take its section down with an error boundary.
 */
interface Parser<T> {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
  parse: (value: unknown) => T;
}

/** Drop null and undefined fields so the schema's defaults apply to them. */
const withoutNulls = (value: unknown): unknown => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, v]) => v != null));
};

export const parseContent = <T>(schema: Parser<T>, value: unknown): T => {
  const first = schema.safeParse(value ?? {});
  if (first.success) return first.data;
  const second = schema.safeParse(withoutNulls(value));
  if (second.success) return second.data;
  return schema.parse({});
};
