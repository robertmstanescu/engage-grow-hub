import { describe, expect, it } from "vitest";
import { shortDate } from "./shortDate";

describe("shortDate", () => {
  it("writes day, short month and year as the artboards do", () => {
    expect(shortDate("2026-09-09T12:00:00Z")).toBe("09 Sep 2026");
    expect(shortDate("2026-08-31T12:00:00Z")).toBe("31 Aug 2026");
  });
  it("gives nothing for a missing or broken date", () => {
    expect(shortDate(null)).toBe("");
    expect(shortDate("not a date")).toBe("");
  });
});
