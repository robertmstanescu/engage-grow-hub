/**
 * StatusBadge — the one place a content item's visibility is rendered
 * as a pill. Pages list, Blogs list and the builder toolbar all use
 * this, so the vocabulary (`naming.ts`: Draft / Live / Scheduled —
 * never "Published") and the colours cannot drift between screens.
 */
import { CalendarClock, Eye, FileText } from "lucide-react";
import { STATE_LABEL, type ContentState } from "../naming";

interface Props {
  state: ContentState;
  /** Optional trailing text, e.g. the "goes live" sentence for scheduled items. */
  detail?: string;
  className?: string;
}

const TONE: Record<ContentState, { className: string; Icon: typeof Eye }> = {
  live: { className: "bg-emerald-500/12 text-emerald-700", Icon: Eye },
  draft: { className: "bg-amber-500/15 text-amber-700", Icon: FileText },
  scheduled: { className: "bg-accent/15 text-accent-foreground", Icon: CalendarClock },
};

const StatusBadge = ({ state, detail, className = "" }: Props) => {
  const { className: tone, Icon } = TONE[state] ?? TONE.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-body text-[10px] uppercase tracking-wider whitespace-nowrap ${tone} ${className}`}
      title={detail}
    >
      <Icon size={11} aria-hidden="true" />
      {STATE_LABEL[state] ?? STATE_LABEL.draft}
    </span>
  );
};

export default StatusBadge;
