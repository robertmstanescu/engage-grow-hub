import type { ActionMenuItem } from "./ActionMenu";

/** A visual divider between groups in an ActionMenu. */
export const MENU_DIVIDER: ActionMenuItem = { key: "divider", label: "", onSelect: () => {} };
export const isDivider = (item: ActionMenuItem) => item.key === "divider";
