import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ActionMenu from "../ActionMenu";
import { MENU_DIVIDER } from "../menu";

describe("ActionMenu", () => {
  it("opens on the trigger, hides items with when=false, and runs the chosen action", async () => {
    const dup = vi.fn();
    const del = vi.fn();
    render(
      <ActionMenu
        label="Actions for About us"
        items={[
          { key: "dup", label: "Duplicate", onSelect: dup },
          { key: "pub", label: "Publish", onSelect: () => {}, when: false },
          MENU_DIVIDER,
          { key: "del", label: "Delete", onSelect: del, danger: true },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Actions for About us" }));
    expect(await screen.findByRole("menuitem", { name: "Duplicate" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Publish" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Delete" }).className).toContain("danger");
    fireEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(dup).toHaveBeenCalledTimes(1);
    expect(del).not.toHaveBeenCalled();
  });
});
