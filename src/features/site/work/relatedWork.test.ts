import { pickRelatedWork } from "./relatedWork";

const item = (slug: string, pillar: string) => ({ slug, pillar });

describe("pickRelatedWork", () => {
  it("puts the same pillar first, leaves the current piece out and fills from the rest", () => {
    const items = [item("a", "ex"), item("b", "ic"), item("now", "ic"), item("c", "ic"), item("d", "ops")];
    expect(pickRelatedWork(items, item("now", "ic")).map((i) => i.slug)).toEqual(["b", "c", "a"]);
  });

  it("survives bad data", () => {
    expect(pickRelatedWork(null, item("x", "ic"))).toEqual([]);
    expect(pickRelatedWork([null as never, item("", "ic"), item("y", "ic")], item("x", "ic"))).toEqual([item("y", "ic")]);
  });
});
