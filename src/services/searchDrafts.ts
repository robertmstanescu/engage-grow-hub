/**
 * Search fields wait for Publish (search plan US11).
 *
 * A page or Work item that is live keeps its live search title,
 * description, AI summary and share picture until the owner publishes.
 * Edits go to the `draft_*` columns (NULL = same as live) and Publish
 * copies them across and clears them. A page that is not live yet has
 * nothing to protect, so its edits go straight to the live columns
 * (a scheduled page then goes live with them).
 */

export const SEARCH_FIELDS = ["meta_title", "meta_description", "ai_summary", "og_image"] as const;
export type SearchField = (typeof SEARCH_FIELDS)[number];
export type DraftKey = `draft_${SearchField}`;

/** The row shape these helpers read: live columns and their drafts, all optional. */
export type SearchFieldsRecord = Partial<Record<SearchField | DraftKey, string | null>>;

export const draftKey = (field: SearchField): DraftKey => `draft_${field}`;

/** What the editor shows: the draft when there is one, else the live value. */
export const editedSearchValue = (record: SearchFieldsRecord | null | undefined, field: SearchField): string => {
  if (!record) return "";
  const draft = record[draftKey(field)];
  return (draft ?? record[field] ?? "") as string;
};

/**
 * The update for a save. Live: only the drafts change. Not live: the
 * live columns change and any drafts are cleared.
 */
export const searchFieldsSave = (
  isLive: boolean,
  values: Partial<Record<SearchField, string>>,
): Record<string, string | null> => {
  const out: Record<string, string | null> = {};
  for (const field of SEARCH_FIELDS) {
    if (!(field in values)) continue;
    const value = values[field] ?? "";
    if (isLive) out[draftKey(field)] = value;
    else {
      out[field] = value;
      out[draftKey(field)] = null;
    }
  }
  return out;
};

/**
 * The update for Publish: every field takes its edited value (an
 * override from the editor, else the draft, else stays as it is) and the
 * drafts are cleared. Only fields the table has are passed in `fields`.
 */
export const searchFieldsPublish = (
  record: SearchFieldsRecord | null | undefined,
  overrides: Partial<Record<SearchField, string>> = {},
  fields: readonly SearchField[] = SEARCH_FIELDS,
): Record<string, string | null> => {
  const out: Record<string, string | null> = {};
  for (const field of fields) {
    if (field in overrides) out[field] = overrides[field] ?? "";
    else if (record && record[draftKey(field)] != null) out[field] = record[draftKey(field)] as string;
    out[draftKey(field)] = null;
  }
  return out;
};

/** True when a search field waits for Publish. */
export const hasSearchDrafts = (
  record: SearchFieldsRecord | null | undefined,
  fields: readonly SearchField[] = SEARCH_FIELDS,
): boolean =>
  !!record && fields.some((f) => record[draftKey(f)] != null && record[draftKey(f)] !== (record[f] ?? ""));
