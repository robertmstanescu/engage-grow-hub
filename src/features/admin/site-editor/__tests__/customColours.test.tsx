import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ColorField } from "../FieldComponents";
import { CustomColoursProvider } from "../customColours";

vi.mock("@/hooks/useBrandSettings", () => ({
  useBrandColors: () => [{ id: "ink", name: "Ink", hex: "#26142E" }],
}));

describe("Custom colours group", () => {
  it("collects colour fields into the closed group and counts the ones in use", () => {
    render(
      <CustomColoursProvider>
        <label htmlFor="t">Title</label>
        <input id="t" />
        <ColorField label="Title colour" value="#26142E" onChange={() => {}} />
        <ColorField label="Body colour" value="" onChange={() => {}} />
      </CustomColoursProvider>,
    );
    const group = document.querySelector("[data-custom-colours]") as HTMLDetailsElement;
    expect(group).toBeTruthy();
    expect(group.open).toBe(false);
    // Both fields rendered inside the group, not beside the text input.
    const inGroup = group.querySelectorAll("[data-inspector-field]");
    expect(inGroup).toHaveLength(2);
    expect(document.querySelectorAll("[data-inspector-field]")).toHaveLength(2);
    expect(screen.getByTestId("custom-colours-in-use").textContent).toBe("1 in use");
  });

  it("renders inline when there is no provider (Brand settings and friends)", () => {
    render(<ColorField label="Outline colour" value="" onChange={() => {}} />);
    expect(document.querySelector("[data-custom-colours]")).toBeNull();
    expect(document.querySelector("[data-inspector-field=\"outline_colour\"]")).toBeTruthy();
  });
});
