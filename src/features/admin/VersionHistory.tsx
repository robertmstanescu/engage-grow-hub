/**
 * VersionHistory — global admin tab listing every published snapshot
 * across the platform: site_content sections, CMS pages, and blog posts.
 *
 * Restore copies the chosen snapshot into the entity's draft; the
 * editor must then open the relevant page and click Publish to make
 * the rollback go live. This prevents accidental rollbacks from
 * surprise-publishing.
 */
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  attachAuthors,
  listAllEntitiesWithCounts,
  listRevisions,
  resolveEntityLabels,
  restoreRevision,
  type PageRevisionWithAuthor,
  type RevisionEntityType,
} from "@/services/pageRevisions";
import { invalidateSiteContent } from "@/hooks/useSiteContent";

interface EntitySummary {
  entity_type: RevisionEntityType;
  entity_ref: string;
  latest: number;
  count: number;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ENTITY_LABEL: Record<RevisionEntityType, string> = {
  site_content: "Site Section",
  cms_page: "CMS Page",
  blog_post: "Blog Post",
};

const VersionHistory = () => {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [revisionsByKey, setRevisionsByKey] = useState<
    Record<string, PageRevisionWithAuthor[]>
  >({});
  const [revLoadingKey, setRevLoadingKey] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listAllEntitiesWithCounts();
    if (error) toast.error("Could not load version history");
    const list = (data || []) as EntitySummary[];
    setEntities(list);
    const lbls = await resolveEntityLabels(list);
    setLabels(lbls);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = async (e: EntitySummary) => {
    const key = `${e.entity_type}:${e.entity_ref}`;
    if (openKey === key) {
      setOpenKey(null);
      return;
    }
    setOpenKey(key);
    if (!revisionsByKey[key]) {
      setRevLoadingKey(key);
      const { data, error } = await listRevisions(e.entity_type, e.entity_ref);
      if (error) toast.error("Could not load revisions");
      const withAuthors = await attachAuthors(data || []);
      setRevisionsByKey((p) => ({ ...p, [key]: withAuthors }));
      setRevLoadingKey(null);
    }
  };

  const handleRestore = async (rev: PageRevisionWithAuthor) => {
    if (
      !confirm(
        `Restore v${rev.version}?\n\nThis copies the snapshot into the editor draft. Open the relevant editor and click Publish to make it live.`,
      )
    )
      return;
    setRestoring(rev.id);
    const { error } = await restoreRevision(rev.id);
    setRestoring(null);
    if (error) {
      toast.error(`Restore failed: ${(error as any).message || error}`);
      return;
    }
    if (rev.entity_type === "site_content") invalidateSiteContent(rev.entity_ref);
    toast.success(`v${rev.version} restored to draft.`);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-display flex items-center gap-2 text-primary">
          <History className="h-6 w-6" />
          Revision History
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Every Publish creates an automatic snapshot — for site sections, CMS
          pages, and blog posts. Pick any past version and Restore it to the
          editor draft, then review and Publish to go live.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
        </div>
      ) : entities.length === 0 ? (
        <p className="text-muted-foreground">No revisions yet.</p>
      ) : (
        <div className="space-y-2">
          {entities.map((e) => {
            const key = `${e.entity_type}:${e.entity_ref}`;
            const isOpen = openKey === key;
            const revs = revisionsByKey[key] || [];
            const friendly = labels[key] || e.entity_ref;
            return (
              <div
                key={key}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(e)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-secondary shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-secondary shrink-0" />
                    )}
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                      {ENTITY_LABEL[e.entity_type]}
                    </span>
                    <span className="font-medium text-secondary truncate">
                      {friendly}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {e.count} version{e.count === 1 ? "" : "s"} · latest v{e.latest}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-background/30">
                    {revLoadingKey === key ? (
                      <div className="px-4 py-3 flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                      </div>
                    ) : revs.length === 0 ? (
                      <div className="px-4 py-3 text-muted-foreground text-sm">
                        No snapshots.
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {revs.map((r) => (
                          <li
                            key={r.id}
                            className="px-4 py-3 flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <div className="font-mono text-sm text-foreground">
                                v{r.version}
                                {r.label ? (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {r.label}
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(r.created_at)}
                                {r.author_display_name
                                  ? ` · by ${r.author_display_name}`
                                  : ""}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRestore(r)}
                              disabled={restoring === r.id}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/60 disabled:opacity-50 text-primary"
                            >
                              {restoring === r.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : null}
                              Restore to draft
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VersionHistory;
