/**
 * VersionHistory — admin panel listing every published snapshot of
 * every site_content section, with one-click Restore.
 *
 * Restore writes the snapshot back into the section's `draft_content`
 * (not directly into the live `content`). The admin then opens the
 * Site Editor, reviews, and hits Publish — same workflow as any other
 * edit. This makes accidental rollbacks recoverable.
 */
import { useEffect, useState, useCallback } from "react";
import { History, RotateCcw, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listAllSectionsWithCounts,
  listVersions,
  restoreVersion,
  type SiteContentVersion,
} from "@/services/siteContentVersions";
import { invalidateSiteContent } from "@/hooks/useSiteContent";

interface SectionSummary {
  section_key: string;
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

const VersionHistory = () => {
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [versionsBySection, setVersionsBySection] = useState<Record<string, SiteContentVersion[]>>({});
  const [versionsLoading, setVersionsLoading] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listAllSectionsWithCounts();
    if (error) toast.error("Could not load version history");
    setSections(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleSection = async (key: string) => {
    if (openSection === key) {
      setOpenSection(null);
      return;
    }
    setOpenSection(key);
    if (!versionsBySection[key]) {
      setVersionsLoading(key);
      const { data, error } = await listVersions(key);
      if (error) toast.error(`Could not load versions for ${key}`);
      setVersionsBySection((p) => ({ ...p, [key]: data || [] }));
      setVersionsLoading(null);
    }
  };

  const handleRestore = async (sectionKey: string, version: number) => {
    if (
      !confirm(
        `Restore ${sectionKey} to v${version}?\n\nThis copies the snapshot into the editor draft. Open Site Editor and click Publish to make it live.`,
      )
    )
      return;
    const id = `${sectionKey}:${version}`;
    setRestoring(id);
    const { error } = await restoreVersion(sectionKey, version);
    setRestoring(null);
    if (error) {
      toast.error(`Restore failed: ${error.message || error}`);
      return;
    }
    invalidateSiteContent(sectionKey);
    toast.success(`v${version} restored to draft. Open Site Editor → Publish to go live.`);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-display flex items-center gap-2 text-primary">
          <History className="h-6 w-6" />
          Version History
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Every Publish creates an automatic backup. Pick any past version and Restore it to your
          editor draft — then review and Publish to go live. v1 is the version that was live the
          moment this feature was set up.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
        </div>
      ) : sections.length === 0 ? (
        <p className="text-muted-foreground">No versions yet.</p>
      ) : (
        <div className="space-y-2">
          {sections.map((s) => {
            const isOpen = openSection === s.section_key;
            const versions = versionsBySection[s.section_key] || [];
            return (
              <div
                key={s.section_key}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(s.section_key)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-secondary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-secondary" />
                    )}
                    <span className="font-medium text-secondary">{s.section_key}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {s.count} version{s.count === 1 ? "" : "s"} · latest v{s.latest}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-background/30">
                    {versionsLoading === s.section_key ? (
                      <div className="px-4 py-3 flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                      </div>
                    ) : versions.length === 0 ? (
                      <div className="px-4 py-3 text-muted-foreground text-sm">No snapshots.</div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {versions.map((v) => {
                          const id = `${v.section_key}:${v.version}`;
                          return (
                            <li
                              key={v.id}
                              className="px-4 py-3 flex items-center justify-between gap-4"
                            >
                              <div className="min-w-0">
                                <div className="font-mono text-sm text-black">
                                  v{v.version}
                                  {v.label ? (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {v.label}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(v.created_at)}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRestore(v.section_key, v.version)}
                                disabled={restoring === id}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/60 disabled:opacity-50 text-primary"
                              >
                                {restoring === id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                                Restore to draft
                              </button>
                            </li>
                          );
                        })}
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
