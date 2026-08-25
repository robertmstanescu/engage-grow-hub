/**
 * AdminSection — the single container for a group of related fields.
 *
 * Every admin screen builds its body out of these cards so spacing,
 * borders, headings and collapse behaviour are identical everywhere.
 * Sections are open by default (the overhaul brief: keep everything
 * visible, group it better) but can be collapsed by the user.
 */
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  /** Optional right-aligned control in the header (a button, badge…). */
  action?: ReactNode;
  /** Allow the user to fold the section away. Default true. */
  collapsible?: boolean;
  /** Start folded. Default false — everything visible on open. */
  defaultCollapsed?: boolean;
  children: ReactNode;
}

const AdminSection = ({
  title,
  description,
  action,
  collapsible = true,
  defaultCollapsed = false,
  children,
}: Props) => {
  const [open, setOpen] = useState(!defaultCollapsed);

  return (
    <section className="admin-card rounded-xl border border-border bg-card">
      <header className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => collapsible && setOpen((v) => !v)}
          className="flex flex-1 items-start gap-2 text-left min-w-0"
          aria-expanded={open}
          disabled={!collapsible}
        >
          {collapsible && (
            <ChevronDown
              size={15}
              className="mt-0.5 shrink-0 text-muted-foreground transition-transform"
              style={{ transform: open ? "none" : "rotate(-90deg)" }}
            />
          )}
          <span className="min-w-0">
            <span className="block font-body text-sm font-semibold text-foreground">{title}</span>
            {description && (
              <span className="mt-0.5 block font-body text-xs text-muted-foreground">{description}</span>
            )}
          </span>
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {open && <div className="space-y-4 border-t border-border/70 px-4 py-4">{children}</div>}
    </section>
  );
};

export default AdminSection;
