import { DEFAULT_PAGE_MESH, buildPageMeshCSS, findHeroRow } from "@/features/site/pageMesh";
import type { PageMeshConfig, PageRow } from "@/types/rows";

/**
 * PageBackgroundPanel — the one place to set a page's flowing background:
 * its four colours, intensity, motion and grain.
 *
 * The values are stored on the page's HERO row (`layout.mesh`), because
 * the hero is the row every page has and the renderer reads it from
 * there (see `resolvePageMesh`). Two admin surfaces show this panel:
 * the inspector's page-level view (nothing selected on the canvas) via
 * `PageBackgroundForRows`, and the hero's own Style tab.
 */
const PageBackgroundPanel = ({
  mesh: stored,
  onChange,
}: {
  mesh?: Partial<PageMeshConfig>;
  onChange: (mesh: PageMeshConfig) => void;
}) => {
  const mesh: PageMeshConfig = { ...DEFAULT_PAGE_MESH, ...(stored || {}) };
  const colors = (mesh.colors?.length === 4 ? mesh.colors : DEFAULT_PAGE_MESH.colors) as string[];
  const patch = (p: Partial<PageMeshConfig>) => onChange({ ...mesh, ...p });

  return (
    <div>
      <div
        className="h-14 rounded-lg border border-border mb-2"
        style={{ background: buildPageMeshCSS(mesh) }}
      />
      <div className="grid grid-cols-4 gap-1.5">
        {colors.map((c, i) => (
          <input
            key={i}
            type="color"
            value={c}
            aria-label={`Page background colour ${i + 1}`}
            onChange={(e) => {
              const next = [...colors] as PageMeshConfig["colors"];
              next[i] = e.target.value;
              patch({ colors: next });
            }}
            className="w-full h-9 rounded border border-border cursor-pointer"
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground min-w-[50px]">
          Intensity
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={mesh.strength}
          onChange={(e) => patch({ strength: Number(e.target.value) })}
          className="flex-1"
          style={{ accentColor: "hsl(var(--secondary))" }}
        />
        <span className="font-body text-[10px] text-foreground min-w-[32px] text-right">
          {mesh.strength}%
        </span>
      </div>
      {/* Motion: how fast the colours flow. Grain: film-grain sheet. */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground min-w-[50px]">
          Motion
        </span>
        <div className="flex-1 grid grid-cols-3 gap-1">
          {([["off", "Off"], ["calm", "Calm"], ["lively", "Lively"]] as const).map(([value, label]) => {
            const active = (mesh.motion || "calm") === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => patch({ motion: value })}
                className={`font-body text-[10px] py-1.5 rounded-lg border transition-colors ${
                  active
                    ? "bg-secondary/15 border-secondary/40 text-foreground"
                    : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground min-w-[50px]">
          Grain
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={mesh.grain ?? DEFAULT_PAGE_MESH.grain ?? 0}
          onChange={(e) => patch({ grain: Number(e.target.value) })}
          className="flex-1"
          style={{ accentColor: "hsl(var(--secondary))" }}
        />
        <span className="font-body text-[10px] text-foreground min-w-[32px] text-right">
          {mesh.grain ?? DEFAULT_PAGE_MESH.grain ?? 0}%
        </span>
      </div>
      <p className="font-body text-[10px] text-muted-foreground leading-snug mt-1">
        The four colours flow into each other like slow liquid silk across the whole page.
        Intensity sets how much of the cream ground shows through; at 100% the colours are
        pure. Grain stays almost still so the colours carry the motion. Visitors who prefer
        reduced motion see it still.
      </p>
      <button
        type="button"
        onClick={() => onChange(DEFAULT_PAGE_MESH)}
        className="mt-2 font-body text-[10px] underline text-muted-foreground hover:text-foreground"
      >
        Reset to brand default
      </button>
    </div>
  );
};

export default PageBackgroundPanel;

/**
 * Page-level wrapper: reads the mesh off the page's hero row and writes
 * it back there. Pages without a hero get a hint instead of a dead panel.
 */
export const PageBackgroundForRows = ({
  rows,
  onRowsChange,
}: {
  rows: PageRow[];
  onRowsChange: (rows: PageRow[]) => void;
}) => {
  const hero = findHeroRow(rows);
  if (!hero) {
    return (
      <p className="font-body text-[11px] leading-relaxed text-muted-foreground">
        Add a Hero row to this page to choose its background colours. The brand default is
        shown until then.
      </p>
    );
  }
  return (
    <PageBackgroundPanel
      mesh={hero.layout?.mesh}
      onChange={(mesh) =>
        onRowsChange(
          rows.map((r) => (r.id === hero.id ? ({ ...r, layout: { ...(r.layout || {}), mesh } } as PageRow) : r)),
        )
      }
    />
  );
};
