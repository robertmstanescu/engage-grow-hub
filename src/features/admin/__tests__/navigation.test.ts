import { describe, expect, it } from "vitest";
import { ADMIN_DESTINATIONS, LEGACY_REDIRECTS, adminPath, resolveAdminTab } from "../navigation";

describe("admin navigation", () => {
  it("has nine destinations and every sub-tab key is unique within its destination", () => {
    expect(ADMIN_DESTINATIONS).toHaveLength(9);
    for (const d of ADMIN_DESTINATIONS) {
      const keys = (d.tabs || []).map((t) => t.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("builds canonical paths, omitting the default sub-tab", () => {
    expect(adminPath("pages")).toBe("/admin/pages");
    expect(adminPath("audience", "contacts")).toBe("/admin/audience");
    expect(adminPath("audience", "campaigns")).toBe("/admin/audience?tab=campaigns");
  });

  it("redirects every legacy sidebar key to a real destination", () => {
    for (const [legacy, target] of Object.entries(LEGACY_REDIRECTS)) {
      const r = resolveAdminTab(legacy, "");
      expect(r.tab).toBe(target.tab);
      expect(r.redirect).toBeDefined();
      const dest = ADMIN_DESTINATIONS.find((d) => d.key === target.tab)!;
      if (target.sub) expect(dest.tabs?.some((t) => t.key === target.sub)).toBe(true);
    }
  });

  it("resolves a sub-tab from the query string and falls back to the first", () => {
    expect(resolveAdminTab("settings", "?tab=team")).toEqual({ tab: "settings", sub: "team" });
    expect(resolveAdminTab("settings", "?tab=nope")).toEqual({ tab: "settings", sub: "redirects" });
    expect(resolveAdminTab("media", "")).toEqual({ tab: "media", sub: undefined });
  });

  it("sends unknown segments to the overview", () => {
    expect(resolveAdminTab("banana", "")).toMatchObject({ tab: "overview", redirect: "/admin/overview" });
    expect(resolveAdminTab(undefined, "")).toEqual({ tab: "overview", sub: undefined });
  });
});
