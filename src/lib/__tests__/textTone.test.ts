import { describe, expect, it } from "vitest";
import { applyTextTone } from "../rowForeground";
import type { PageRow } from "@/types/rows";

const base = { id: "r", type: "text", content: {} } as unknown as PageRow;
const withTone = (textTone: string) => ({ ...base, layout: { textTone } } as unknown as PageRow);

describe("text tone", () => {
  it("overrides the auto foreground only when set", () => {
    expect(applyTextTone(base, "#111")).toBe("#111");
    expect(applyTextTone(withTone("auto"), "#111")).toBe("#111");
    expect(applyTextTone(withTone("light"), "#111")).toBe("#F4F0EC");
    expect(applyTextTone(withTone("dark"), "#eee")).toBe("#1A1A1A");
    expect(applyTextTone(withTone("accent"), "#111")).toBe("hsl(var(--accent))");
  });
});
