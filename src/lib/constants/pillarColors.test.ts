import { describe, expect, it } from "vitest";
import {
  PILLAR_COLORS,
  PILLAR_KEY_TO_SLUG,
  pillarColorFromKey,
  pillarColorFromLink,
} from "./pillarColors";

describe("pillar colours", () => {
  it("covers all six service pillars by slug", () => {
    expect(Object.keys(PILLAR_COLORS).sort()).toEqual([
      "employee-experience",
      "fractional-hrbp",
      "internal-communications",
      "manager-enablement",
      "pay-transparency",
      "people-operations",
    ]);
  });

  it("maps every short key to an existing slug", () => {
    for (const slug of Object.values(PILLAR_KEY_TO_SLUG)) {
      expect(PILLAR_COLORS[slug]).toBeDefined();
    }
    expect(Object.keys(PILLAR_KEY_TO_SLUG).sort()).toEqual(["ex", "hrbp", "ic", "mgr", "ops", "pay"]);
  });

  it("resolves a colour from a short key or a slug", () => {
    expect(pillarColorFromKey("pay")).toBe("#E36414");
    expect(pillarColorFromKey("mgr")).toBe("#702963");
    expect(pillarColorFromKey("pay-transparency")).toBe("#E36414");
    expect(pillarColorFromKey("unknown")).toBeUndefined();
    expect(pillarColorFromKey(undefined)).toBeUndefined();
  });

  it("resolves a colour from a service link, including the new pillars", () => {
    expect(pillarColorFromLink("/services/pay-transparency")).toBe("#E36414");
    expect(pillarColorFromLink("/services/manager-enablement/")).toBe("#702963");
    expect(pillarColorFromLink("/services/internal-communications")).toBe("#3D348B");
    expect(pillarColorFromLink("/blog")).toBeUndefined();
  });
});
