import { describe, expect, it } from "vitest";
import { deriveTasks, hasUnpublishedChanges, relativeTime } from "../overviewTasks";

const NOW = new Date("2026-09-08T12:00:00Z").getTime();
const ago = (h: number) => new Date(NOW - h * 3600 * 1000).toISOString();
const page = (o: Partial<Parameters<typeof deriveTasks>[0]["pages"][number]>) => ({
  id: "p", title: "Page", slug: "page", status: "published", updated_at: ago(1), meta_description: "d",
  page_rows: [{ id: 1 }], draft_page_rows: [{ id: 1 }], ...o,
});

describe("overview tasks", () => {
  it("flags a published page whose draft differs from live", () => {
    expect(hasUnpublishedChanges(page({}))).toBe(false);
    expect(hasUnpublishedChanges(page({ draft_page_rows: [{ id: 2 }] }))).toBe(true);
    expect(hasUnpublishedChanges(page({ draft_page_rows: null }))).toBe(false);
  });

  it("orders changes, then drafts, then leads, then missing descriptions", () => {
    const tasks = deriveTasks({
      pages: [
        page({ id: "a", title: "About us", draft_page_rows: [{ id: 9 }] }),
        page({ id: "b", title: "Pricing", status: "draft", slug: "pricing" }),
        page({ id: "c", title: "Services", meta_description: "" }),
      ],
      posts: [{ id: "x", title: "Silence", slug: "silence", status: "draft", updated_at: ago(72) }],
      leads: [{ id: "l1", full_name: "Maria K.", created_at: ago(5) }, { id: "l2", full_name: "Old", created_at: ago(24 * 30) }],
      home: { content: { a: 1 }, draft_content: { a: 2 }, updated_at: ago(2) },
    }, NOW);
    expect(tasks.map((t) => t.kind)).toEqual(["changes", "changes", "draft", "draft", "leads", "seo"]);
    expect(tasks[0].title).toBe("Home has unpublished changes");
    expect(tasks[0].go).toEqual({ tab: "builder", pageId: null });
    expect(tasks[1].go).toEqual({ tab: "builder", pageId: "a" });
    expect(tasks[4].title).toBe("1 new lead this week");
    expect(tasks[4].detail).toBe("Maria K.");
    expect(tasks[5].detail).toBe("Services");
  });

  it("returns nothing when everything is published and quiet", () => {
    expect(deriveTasks({ pages: [page({})], posts: [], leads: [], home: null }, NOW)).toEqual([]);
  });

  it("formats relative time in plain words", () => {
    expect(relativeTime(ago(0), NOW)).toBe("just now");
    expect(relativeTime(ago(0.5), NOW)).toBe("30 min ago");
    expect(relativeTime(ago(3), NOW)).toBe("3 h ago");
    expect(relativeTime(ago(24), NOW)).toBe("1 day ago");
  });
});
