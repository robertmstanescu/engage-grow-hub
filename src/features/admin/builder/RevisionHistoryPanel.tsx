/**
 * RevisionHistoryPanel — embeddable list of revisions for a single entity.
 *
 * Used inside the page builders (main site, CMS pages, blog posts) so an
 * editor can roll a page back from the same screen they edit it on.
 *
 * Restore copies the chosen snapshot into the entity's draft. The editor
 * then reviews and clicks Publish to make it live.
 */
import { useCallback, useEffect, useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  attachAuthors,
  listRevisions,
  restoreRevision,
  type PageRevisionWithAuthor,
  type RevisionEntityType,
} from "@/services/pageRevisions";

interface Props {
  entityType: RevisionEntityType;
  entityRef: string;
  /** Called after a successful restore so the parent can reload its draft. */
  onRestored?: () => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const RevisionHistoryPanel = ({ entityType, entityRef, onRestored }: Props) => {
  const [loading, setLoading] = useState(true);
  const [revisions, setRevisions] = useState<PageRevisionWithAuthor[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listRevisions(entityType, entityRef);
    if (error) toast.error("Could not load revisions");
    const withAuthors = await attachAuthors(data || []);
    setRevisions(withAuthors);
    setLoading(false);
  }, [entityType, entityRef]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleRestore = async (rev: PageRevisionWithAuthor) => {
    if (
      !confirm(
        `Restore v${rev.version}?\n\nThis copies the snapshot into your draft. Click Publish afterwards to make it live.`,
      )
    )
      return;
    setRestoringId(rev.id);
    const { error } = await restoreRevision(rev.id);
    setRestoringId(null);
    if (error) {
      toast.error(`Restore failed: ${(error as any).message || error}`);
      return;
    }
    toast.success(`v${rev.version} restored to draft.`);
    onRestored?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-secondary" />
        <h4 className="font-body text-[10px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
          Revision history
        </h4>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      ) : revisions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No revisions yet — publish to create the first snapshot.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-background/40 max-h-72 overflow-y-auto">
          {revisions.map((r) => (
            <li
              key={r.id}
              className="px-3 py-2 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-mono text-xs text-foreground">
                  v{r.version}
                  {r.label ? (
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {r.label}
                    </span>
                  ) : null}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {formatDate(r.created_at)}
                  {r.author_display_name ? ` · ${r.author_display_name}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRestore(r)}
                disabled={restoringId === r.id}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] hover:bg-muted/60 disabled:opacity-50 text-primary"
                title="Restore this version into your draft"
              >
                {restoringId === r.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RevisionHistoryPanel;
