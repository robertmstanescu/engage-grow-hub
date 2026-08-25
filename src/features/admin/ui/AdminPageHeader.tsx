/**
 * AdminPageHeader — the top of every admin screen: what you are looking
 * at, one line of context, and the primary action for this screen.
 */
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  /** Optional "back" affordance rendered above the title. */
  backLabel?: string;
  onBack?: () => void;
  /** Right-aligned actions. */
  actions?: ReactNode;
}

const AdminPageHeader = ({ title, description, backLabel, onBack, actions }: Props) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div className="min-w-0">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-1 inline-flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={13} /> {backLabel || "Back"}
        </button>
      )}
      <h2 className="truncate font-display text-lg font-bold text-foreground">{title}</h2>
      {description && (
        <p className="mt-0.5 font-body text-xs text-muted-foreground">{description}</p>
      )}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default AdminPageHeader;
