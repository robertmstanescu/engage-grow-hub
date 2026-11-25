import { describe, expect, it } from "vitest";
import { splitBadgePrice } from "./heroBadgeText";

describe("splitBadgePrice", () => {
  it("puts a trailing 'From …' price on its own", () => {
    expect(splitBadgePrice("Internal Comms Audit · From €900 + VAT")).toEqual({ lead: "Internal Comms Audit", price: "From €900 + VAT" });
    expect(splitBadgePrice("Support for One Hard Moment · From €500 a day + VAT")).toEqual({ lead: "Support for One Hard Moment", price: "From €500 a day + VAT" });
  });

  it("splits at the last separator only", () => {
    expect(splitBadgePrice("A · B · From €1")).toEqual({ lead: "A · B", price: "From €1" });
  });

  it("leaves any other badge whole", () => {
    expect(splitBadgePrice("Two weeks · fixed price")).toEqual({ lead: "Two weeks · fixed price", price: "" });
    expect(splitBadgePrice("No separator")).toEqual({ lead: "No separator", price: "" });
    expect(splitBadgePrice(undefined as unknown as string)).toEqual({ lead: "", price: "" });
  });
});
