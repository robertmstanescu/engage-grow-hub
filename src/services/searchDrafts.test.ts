/** US11: search fields go live only on Publish. */
import { describe, it, expect } from "vitest";
import { editedSearchValue, hasSearchDrafts, searchFieldsPublish, searchFieldsSave } from "./searchDrafts";

describe("search field drafts", () => {
  it("a live page saves to the drafts only", () => {
    expect(searchFieldsSave(true, { meta_title: "New", meta_description: "Desc" })).toEqual({
      draft_meta_title: "New",
      draft_meta_description: "Desc",
    });
  });

  it("a page that is not live saves straight to the live columns", () => {
    expect(searchFieldsSave(false, { meta_title: "New" })).toEqual({ meta_title: "New", draft_meta_title: null });
  });

  it("the editor shows the draft first, then the live value", () => {
    expect(editedSearchValue({ meta_title: "Live", draft_meta_title: "Draft" }, "meta_title")).toBe("Draft");
    expect(editedSearchValue({ meta_title: "Live", draft_meta_title: null }, "meta_title")).toBe("Live");
    expect(editedSearchValue(null, "meta_title")).toBe("");
  });

  it("publish copies drafts to live and clears them", () => {
    const record = { meta_title: "Old", draft_meta_title: "New", ai_summary: "Sum", draft_ai_summary: null };
    expect(searchFieldsPublish(record, { meta_description: "Typed" }, ["meta_title", "meta_description", "ai_summary"])).toEqual({
      meta_title: "New",
      draft_meta_title: null,
      meta_description: "Typed",
      draft_meta_description: null,
      draft_ai_summary: null,
    });
  });

  it("knows when something waits for Publish", () => {
    expect(hasSearchDrafts({ meta_title: "A", draft_meta_title: "B" })).toBe(true);
    expect(hasSearchDrafts({ meta_title: "A", draft_meta_title: "A" })).toBe(false);
    expect(hasSearchDrafts({ meta_title: "A", draft_meta_title: null })).toBe(false);
  });
});
