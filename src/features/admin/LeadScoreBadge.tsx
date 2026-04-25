/**
 * LeadScoreBadge — visual indicator for AI-generated lead intent score.
 *
 * Buckets the raw 0-100 `ai_score` into three tiers so admins can scan
 * the Contacts list and pick out high-intent leads at a glance:
 *   - Hot   ≥ 75  → red flame, destructive-tinted background
 *   - Warm  40-74 → amber flame, accent-tinted background
 *   - Cold  < 40  → neutral flame, muted background
 *
 * Unscored leads (score === null) render nothing — the AI enrichment
 * webhook (Epic 4 / US 4.2) hasn't graded them yet.
 */
import { Flame } from "lucide-react";

interface Props {
  score: number | null;
}

type Tier = { label: string; bg: string; fg: string };

const tierFor = (score: number): Tier => {
  if (score >= 75) {
    return {
      label: "Hot",
      // Red flame on a destructive-tinted pill — hardest possible
      // visual hit so Hot leads dominate the row.
      bg: "hsl(var(--destructive) / 0.15)",
      fg: "hsl(var(--destructive))",
    };
  }
  if (score >= 40) {
    return {
      label: "Warm",
      bg: "hsl(var(--accent) / 0.18)",
      fg: "hsl(var(--accent-foreground))",
    };
  }
  return {
    label: "Cold",
    bg: "hsl(var(--muted))",
    fg: "hsl(var(--muted-foreground))",
  };
};

const LeadScoreBadge = ({ score }: Props) => {
  if (score === null || score === undefined) return null;
  const tier = tierFor(score);
  return (
    <span
      className="inline-flex items-center gap-1 font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ backgroundColor: tier.bg, color: tier.fg }}
      title={`AI score: ${score}/100`}
    >
      <Flame size={10} />
      {tier.label} · {score}
    </span>
  );
};

export default LeadScoreBadge;
