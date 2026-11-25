import { describe, it, expect } from "vitest";
import { splitDoneLooksLike, splitPriceLine, splitTierTitle } from "./tierText";

describe("tier card text helpers", () => {
  it("splits the outcome off a description and keeps every word", () => {
    const text = "Something is off. Done looks like: a written map.";
    const { lead, label, done } = splitDoneLooksLike(text);
    expect(lead).toBe("Something is off.");
    expect(label).toBe("Done looks like:");
    expect(done).toBe("a written map.");
    expect([lead, label, done].join(" ")).toBe(text);
  });

  it("handles the 'every month' wording and text with no outcome", () => {
    expect(splitDoneLooksLike("A. Done looks like, every month: the calendar.").done).toBe("the calendar.");
    expect(splitDoneLooksLike("Just a description.")).toEqual({ lead: "Just a description.", label: "", done: "" });
    expect(splitDoneLooksLike(undefined as unknown as string).lead).toBe("");
  });

  it("splits the price from the detail at the first dot", () => {
    expect(splitPriceLine("From €900 · 2–3 weeks · ~15–20 hours")).toEqual({ price: "From €900", detail: "2–3 weeks · ~15–20 hours" });
    expect(splitPriceLine("From €900")).toEqual({ price: "From €900", detail: "" });
    expect(splitPriceLine(null as unknown as string)).toEqual({ price: "", detail: "" });
  });

  it("splits 'Brand: plain descriptor' tier titles and leaves short names whole", () => {
    expect(splitTierTitle("The Autopsy: Internal Comms Audit")).toEqual({ brand: "The Autopsy", descriptor: "Internal Comms Audit" });
    expect(splitTierTitle("The Burial: Comms Strategy & Playbook")).toEqual({ brand: "The Burial", descriptor: "Comms Strategy & Playbook" });
    expect(splitTierTitle("The Autopsy")).toEqual({ brand: "The Autopsy", descriptor: "" });
    expect(splitTierTitle("Ratio 3:2")).toEqual({ brand: "Ratio 3:2", descriptor: "" });
    expect(splitTierTitle("Dangling: ")).toEqual({ brand: "Dangling:", descriptor: "" });
    expect(splitTierTitle(undefined as unknown as string)).toEqual({ brand: "", descriptor: "" });
  });
});
