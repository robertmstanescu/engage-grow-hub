/**
 * Admin navigation — the ONE list of places the admin can go.
 *
 * Nine destinations on the rail. Screens that used to be their own
 * sidebar entries (Contacts, Campaigns, Tags, Redirects, Team, SEO,
 * Version History, Brand) are sub-tabs of a destination now, reached
 * with `?tab=`. Old URLs keep working through LEGACY_REDIRECTS so
 * bookmarks and deep links never 404.
 *
 * Keys are STABLE: they appear in URLs. Only labels may change.
 */
import {
  LayoutDashboard, FileText, BookOpen, Image, Compass, Palette, Users,
  LineChart, Settings,
} from "lucide-react";

export type AdminTab =
  | "overview" | "pages" | "blog" | "media" | "navigation"
  | "design" | "audience" | "insights" | "settings";

export interface SubTab { key: string; label: string }

export interface AdminDestination {
  key: AdminTab;
  label: string;
  icon: typeof LayoutDashboard;
  /** Sub-tabs, shown as a tab strip under the title. First is default. */
  tabs?: SubTab[];
  /** Rail items after this one sit at the bottom. */
  bottom?: boolean;
}

export const ADMIN_DESTINATIONS: AdminDestination[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "pages", label: "Pages", icon: FileText },
  { key: "blog", label: "Blog", icon: BookOpen, tabs: [{ key: "posts", label: "Posts" }, { key: "tags", label: "Tags" }] },
  { key: "media", label: "Media", icon: Image },
  { key: "navigation", label: "Navigation", icon: Compass },
  { key: "design", label: "Design", icon: Palette },
  { key: "audience", label: "Audience", icon: Users, tabs: [{ key: "contacts", label: "Contacts" }, { key: "campaigns", label: "Campaigns" }] },
  { key: "insights", label: "Insights", icon: LineChart, tabs: [{ key: "traffic", label: "Traffic" }, { key: "seo", label: "SEO checks" }] },
  {
    key: "settings", label: "Settings", icon: Settings, bottom: true,
    tabs: [{ key: "redirects", label: "Redirects" }, { key: "team", label: "Team" }, { key: "history", label: "Version history" }],
  },
];

export const ADMIN_TAB_KEYS = new Set<string>(ADMIN_DESTINATIONS.map((d) => d.key));

/** Where an old sidebar key lands now: `/admin/<tab>?tab=<sub>`. */
export const LEGACY_REDIRECTS: Record<string, { tab: AdminTab; sub?: string }> = {
  dashboard: { tab: "overview" },
  contacts: { tab: "audience", sub: "contacts" },
  emails: { tab: "audience", sub: "campaigns" },
  tags: { tab: "blog", sub: "tags" },
  redirects: { tab: "settings", sub: "redirects" },
  team: { tab: "settings", sub: "team" },
  versions: { tab: "settings", sub: "history" },
  brand: { tab: "design" },
  seo_master: { tab: "insights", sub: "seo" },
  "ai-insights": { tab: "insights", sub: "traffic" },
};

export const adminPath = (tab: AdminTab, sub?: string): string => {
  const dest = ADMIN_DESTINATIONS.find((d) => d.key === tab);
  const first = dest?.tabs?.[0]?.key;
  const q = sub && sub !== first ? `?tab=${sub}` : "";
  return `/admin/${tab}${q}`;
};

/**
 * Resolve a URL segment (`/admin/:tab`) to a destination and sub-tab.
 * Returns `redirect` when the segment is a legacy key, so the shell can
 * `navigate(..., { replace: true })` to the canonical URL.
 */
export const resolveAdminTab = (
  segment: string | undefined,
  search: string,
): { tab: AdminTab; sub: string | undefined; redirect?: string } => {
  const params = new URLSearchParams(search);
  const requested = params.get("tab") || undefined;
  if (!segment || segment === "") return { tab: "overview", sub: undefined };
  if (segment in LEGACY_REDIRECTS) {
    const { tab, sub } = LEGACY_REDIRECTS[segment];
    return { tab, sub, redirect: adminPath(tab, sub) };
  }
  if (!ADMIN_TAB_KEYS.has(segment)) return { tab: "overview", sub: undefined, redirect: "/admin/overview" };
  const dest = ADMIN_DESTINATIONS.find((d) => d.key === segment)!;
  const valid = dest.tabs?.some((t) => t.key === requested);
  return { tab: dest.key, sub: valid ? requested : dest.tabs?.[0]?.key };
};
