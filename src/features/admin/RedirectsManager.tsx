/**
 * RedirectsManager — admin CRUD for the `redirects` table (like WP's
 * "Redirection" plugin). Most rows here are created automatically when
 * a CMS page or blog post is renamed/deleted (see `createRedirect` call
 * sites in CmsPageBuilder/BlogPostBuilder/PagesManager/BlogEditor);
 * admins can also add fully manual redirects here.
 */
import { useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { SectionBox } from "./site-editor/FieldComponents";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useRedirects } from "@/hooks/useRedirects";
import { normalizePath } from "@/lib/redirectPaths";

const SourceBadge = ({ source }: { source: string }) => (
  <span
    className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium flex-shrink-0"
    style={
      source === "auto"
        ? { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
        : { backgroundColor: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }
    }
  >
    {source === "auto" ? "Auto" : "Manual"}
  </span>
);

const RedirectsManager = () => {
  const { redirects, isLoading, create, remove, isMutating } = useRedirects();
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");

  const handleAdd = async () => {
    if (!fromPath.trim() || !toPath.trim()) return;
    await create({ from_path: fromPath, to_path: toPath });
    setFromPath("");
    setToPath("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>
          Redirects
        </h2>
      </div>

      <SectionBox label="Add a redirect">
        <p className="font-body text-xs text-muted-foreground mb-3">
          Visitors to "From" are sent to "To" automatically. Renaming or
          deleting a page adds one of these for you — add manual ones for
          old marketing links, typo'd URLs, etc.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={fromPath}
            onChange={(e) => setFromPath(e.target.value)}
            placeholder="/old-page"
            className="flex-1 min-w-[160px] px-3 py-2 rounded-lg font-body text-sm border"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
          />
          <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            value={toPath}
            onChange={(e) => setToPath(e.target.value)}
            placeholder="/new-page"
            className="flex-1 min-w-[160px] px-3 py-2 rounded-lg font-body text-sm border"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
          />
          <SpinnerButton
            isLoading={isMutating}
            loadingLabel="Adding…"
            onClick={handleAdd}
            disabled={!fromPath.trim() || !toPath.trim()}
            className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-85 transition-opacity flex-shrink-0"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            <Plus size={12} /> Add
          </SpinnerButton>
        </div>
      </SectionBox>

      <SectionBox label={`Redirects (${redirects.length})`}>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : redirects.length === 0 ? (
          <p className="font-body text-xs text-muted-foreground">No redirects yet.</p>
        ) : (
          <div className="space-y-2">
            {redirects.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 p-3 rounded-lg border"
                style={{ borderColor: "hsl(var(--border) / 0.5)" }}
              >
                <SourceBadge source={r.source} />
                <span className="font-mono text-xs truncate" style={{ color: "hsl(var(--foreground))" }}>
                  {normalizePath(r.from_path)}
                </span>
                <ArrowRight size={12} className="text-muted-foreground flex-shrink-0" />
                <span className="font-mono text-xs truncate flex-1" style={{ color: "hsl(var(--foreground))" }}>
                  {normalizePath(r.to_path)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="p-1.5 rounded hover:opacity-70 flex-shrink-0"
                  style={{ color: "hsl(var(--destructive))" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionBox>
    </div>
  );
};

export default RedirectsManager;
