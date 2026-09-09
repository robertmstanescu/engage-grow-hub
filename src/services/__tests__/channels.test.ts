import { describe, expect, it } from "vitest";
import { classifyReferrer, referrerHost, summariseSources } from "../channels";

describe("channels", () => {
  it("names the source and picks the channel", () => {
    expect(classifyReferrer("https://www.linkedin.com/feed/")).toEqual({ channel: "Social", label: "LinkedIn" });
    expect(classifyReferrer("android-app://com.linkedin.android")).toEqual({ channel: "Social", label: "LinkedIn" });
    expect(classifyReferrer("https://l.instagram.com/")).toEqual({ channel: "Social", label: "Instagram" });
    expect(classifyReferrer("https://m.facebook.com/")).toEqual({ channel: "Social", label: "Facebook" });
    expect(classifyReferrer("https://www.google.com/")).toEqual({ channel: "Search", label: "Google" });
    expect(classifyReferrer("https://www.google.co.uk/")).toEqual({ channel: "Search", label: "Google" });
    expect(classifyReferrer("")).toEqual({ channel: "Direct", label: "Direct or typed" });
    expect(classifyReferrer("https://www.example.org/post")).toEqual({ channel: "Referral", label: "example.org" });
    expect(classifyReferrer("https://search.brave.com/", "Brave")).toEqual({ channel: "Search", label: "Brave" });
    expect(referrerHost("not a url")).toBe("not a url");
  });

  it("counts people once per source and sorts channels by people", () => {
    const rows = [
      { referrer: "https://www.linkedin.com/", search_engine: null, visitor_id: "a", ip_hash: null },
      { referrer: "https://www.linkedin.com/", search_engine: null, visitor_id: "a", ip_hash: null },
      { referrer: "android-app://com.linkedin.android", search_engine: null, visitor_id: "b", ip_hash: null },
      { referrer: "https://www.google.com/", search_engine: "Google", visitor_id: "c", ip_hash: null },
      { referrer: null, search_engine: null, visitor_id: null, ip_hash: "h1" },
    ];
    const out = summariseSources(rows);
    expect(out.map((c) => [c.channel, c.visitors, c.hits])).toEqual([["Social", 2, 3], ["Search", 1, 1], ["Direct", 1, 1]]);
    expect(out[0].sources).toEqual([{ label: "LinkedIn", visitors: 2, hits: 3 }]);
  });
});
