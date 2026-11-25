import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import TierCard from "./TierCard";

/* The tag colours come from site content; the title does not need them. */
vi.mock("@/hooks/useTagColors", () => ({
  useTagColors: () => ({ getTagColors: () => ({ bgColor: "", textColor: "" }) }),
}));

describe("TierCard title", () => {
  it("puts the descriptor on its own line and keeps one name in the heading", () => {
    const { container } = render(<TierCard title="The Autopsy: Internal Comms Audit" />);
    const h3 = container.querySelector("h3");
    expect(h3?.textContent).toBe("The Autopsy: Internal Comms Audit");
    expect(h3?.querySelector(".tier-title-descriptor")?.textContent).toBe("Internal Comms Audit");
  });

  it("renders a short name as it is", () => {
    const { container } = render(<TierCard title="The Autopsy" subtitle="Internal Communications Audit" />);
    expect(container.querySelector("h3")?.textContent).toBe("The Autopsy");
    expect(container.querySelector(".tier-title-descriptor")).toBeNull();
  });
});
