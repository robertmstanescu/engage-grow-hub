/**
 * What the Overview shows: the things that need the owner today.
 * Pure derivation so it is unit-tested without Supabase.
 */
export interface PageLite {
  id: string; title: string; slug: string; status: string; updated_at: string;
  meta_description: string | null; page_rows: unknown; draft_page_rows: unknown;
}
export interface PostLite { id: string; title: string; slug: string; status: string; updated_at: string }
export interface LeadLite { id: string; full_name: string; created_at: string }
export interface HomeLite { content: unknown; draft_content: unknown; updated_at: string }

export type TaskKind = "changes" | "draft" | "leads" | "seo";
export interface Task {
  kind: TaskKind;
  title: string;
  detail: string;
  /** Where the task's button goes. */
  go: { tab: "pages" | "blog" | "audience" | "insights" | "builder"; pageId?: string | null; sub?: string };
  action: string;
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export const hasUnpublishedChanges = (page: Pick<PageLite, "page_rows" | "draft_page_rows">) =>
  page.draft_page_rows != null && !sameJson(page.page_rows, page.draft_page_rows);

export const relativeTime = (iso: string, now = Date.now()): string => {
  const ms = now - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const deriveTasks = (
  input: { pages: PageLite[]; posts: PostLite[]; leads: LeadLite[]; home: HomeLite | null },
  now = Date.now(),
): Task[] => {
  const tasks: Task[] = [];
  if (input.home && input.home.draft_content != null && !sameJson(input.home.content, input.home.draft_content)) {
    tasks.push({ kind: "changes", title: "Home has unpublished changes", detail: relativeTime(input.home.updated_at, now), go: { tab: "builder", pageId: null }, action: "Review" });
  }
  for (const p of input.pages) {
    if (p.status === "published" && hasUnpublishedChanges(p)) {
      tasks.push({ kind: "changes", title: `${p.title} has unpublished changes`, detail: relativeTime(p.updated_at, now), go: { tab: "builder", pageId: p.id }, action: "Review" });
    }
  }
  for (const p of input.pages) {
    if (p.status !== "published") {
      tasks.push({ kind: "draft", title: `${p.title} is not published yet`, detail: `/${p.slug} · ${relativeTime(p.updated_at, now)}`, go: { tab: "builder", pageId: p.id }, action: "Open" });
    }
  }
  for (const post of input.posts) {
    if (post.status !== "published") {
      tasks.push({ kind: "draft", title: `“${post.title}” is still a draft`, detail: `last edited ${relativeTime(post.updated_at, now)}`, go: { tab: "blog" }, action: "Open" });
    }
  }
  const week = now - 7 * 24 * 3600 * 1000;
  const fresh = input.leads.filter((l) => new Date(l.created_at).getTime() >= week);
  if (fresh.length) {
    const names = fresh.slice(0, 3).map((l) => l.full_name).join(", ");
    tasks.push({ kind: "leads", title: `${fresh.length} new lead${fresh.length === 1 ? "" : "s"} this week`, detail: names, go: { tab: "audience", sub: "contacts" }, action: "See" });
  }
  const noSeo = input.pages.filter((p) => p.status === "published" && !(p.meta_description || "").trim());
  if (noSeo.length) {
    tasks.push({ kind: "seo", title: `${noSeo.length} live page${noSeo.length === 1 ? " has" : "s have"} no search description`, detail: noSeo.map((p) => p.title).slice(0, 4).join(", "), go: { tab: "insights", sub: "seo" }, action: "Fix" });
  }
  return tasks;
};

export interface Summary {
  /** Home + pages whose draft differs from live. */
  changes: number;
  /** Posts not published. */
  draftPosts: number;
  /** Title of the most recently edited draft post, for the tile's link. */
  latestDraftTitle: string | null;
  /** Leads created in the last 7 days. */
  leadsThisWeek: number;
  /** Full names of the newest leads, at most three. */
  leadNames: string[];
}

export const summarize = (
  input: { pages: PageLite[]; posts: PostLite[]; leads: LeadLite[]; home: HomeLite | null },
  now = Date.now(),
): Summary => {
  const homeChanged = !!input.home && input.home.draft_content != null && !sameJson(input.home.content, input.home.draft_content);
  const changes = (homeChanged ? 1 : 0) + input.pages.filter((p) => p.status === "published" && hasUnpublishedChanges(p)).length;
  const drafts = input.posts.filter((p) => p.status !== "published").sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const week = now - 7 * 24 * 3600 * 1000;
  const fresh = input.leads.filter((l) => new Date(l.created_at).getTime() >= week);
  return {
    changes,
    draftPosts: drafts.length,
    latestDraftTitle: drafts[0]?.title ?? null,
    leadsThisWeek: fresh.length,
    leadNames: fresh.slice(0, 3).map((l) => l.full_name),
  };
};

export const greeting = (now = new Date(), name?: string): string => {
  const h = now.getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
};
