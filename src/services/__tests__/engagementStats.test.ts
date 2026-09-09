import { describe, expect, it } from "vitest";
import { countryName, formatSeconds, median, summarise, summariseByPage } from "../engagementStats";
import { countryFromTimezone } from "../../../supabase/functions/track-visitor/tzCountry";

const row = (path: string, seconds: number | null, depth: number | null, engaged = true) => ({ path, duration_seconds: seconds, scroll_depth: depth, engaged });

describe("engagement statistics", () => {
  it("uses the median so one long tab does not skew time on page", () => {
    expect(median([])).toBe(0);
    expect(median([3, 900, 4, 5, 6])).toBe(5);
    expect(median([4, 8])).toBe(6);
  });
  it("counts only engaged views and buckets read depth", () => {
    const s = summarise([row("/a", 10, 100), row("/a", 30, 60), row("/a", 0, 10, false), row("/a", 2, 30)]);
    expect(s.engagedViews).toBe(3);
    expect(s.medianSeconds).toBe(10);
    expect(s.depth).toEqual({ reached25: 100, reached50: 67, reached75: 33, reached100: 33, views: 3 });
  });
  it("groups by page, busiest first", () => {
    const pages = summariseByPage([row("/b", 5, 50), row("/a", 5, 50), row("/a", 7, 90), row("/c", 1, 1, false)]);
    expect(pages.map((p) => p.path)).toEqual(["/a", "/b"]);
    expect(pages[0].medianSeconds).toBe(6);
  });
  it("names countries and formats seconds", () => {
    expect(countryName("RO")).toBe("Romania");
    expect(countryName("Unknown")).toBe("Unknown");
    expect(formatSeconds(45)).toBe("45s");
    expect(formatSeconds(125)).toBe("2m 5s");
  });
});

describe("time zone → country", () => {
  it("maps zones, old names and prefixes; says nothing for UTC", () => {
    expect(countryFromTimezone("Europe/Bucharest")).toBe("RO");
    expect(countryFromTimezone("Europe/London")).toBe("GB");
    expect(countryFromTimezone("America/New_York")).toBe("US");
    expect(countryFromTimezone("Asia/Calcutta")).toBe("IN");
    expect(countryFromTimezone("Europe/Kiev")).toBe("UA");
    expect(countryFromTimezone("US/Pacific")).toBe("US");
    expect(countryFromTimezone("UTC")).toBeNull();
    expect(countryFromTimezone("Etc/GMT+2")).toBeNull();
    expect(countryFromTimezone("")).toBeNull();
    expect(countryFromTimezone(null)).toBeNull();
  });
});
