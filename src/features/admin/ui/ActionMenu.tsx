import { useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isDivider } from "./menu";

export interface ActionMenuItem {
  key: string;
  label: string;
  onSelect: () => unknown;
  /** Red text; for delete-type actions. */
  danger?: boolean;
  /** Hidden when false — lets callers build the list inline. */
  when?: boolean;
  /** Hint shown right-aligned, e.g. a shortcut. */
  hint?: string;
}

interface Props {
  items: ActionMenuItem[];
  /** Accessible name of the trigger, e.g. "Actions for About us". */
  label: string;
  trigger?: ReactNode;
}

/**
 * ActionMenu — the `···` quick-actions menu on list rows (Pages, Blog).
 * One menu component for every list so the items, order and keyboard
 * behaviour stay identical. Esc and click-away close it; each action
 * closes it as it runs.
 */
const ActionMenu = ({ items, label, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const visible = items.filter((it) => it.when !== false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={label}
            title="More actions"
            className="admin-kebab"
          >
            <MoreHorizontal size={15} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={4} className="admin-menu p-1 w-[200px]" role="menu" aria-label={label}>
        {visible.map((it, i) =>
          isDivider(it) ? (
            <div key={`d${i}`} className="admin-menu-sep" role="separator" />
          ) : (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              className={`admin-menu-item${it.danger ? " danger" : ""}`}
              onClick={async () => {
                setOpen(false);
                await it.onSelect();
              }}
            >
              <span>{it.label}</span>
              {it.hint && <span className="admin-menu-hint">{it.hint}</span>}
            </button>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ActionMenu;
