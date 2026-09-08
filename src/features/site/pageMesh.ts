/**
 * pageMesh — the single background of the whole site.
 *
 * One fixed mesh gradient is painted behind every page (see
 * `.page-mesh-layer` in index.css). Its colours belong to the page's
 * HERO row, so an admin tunes the atmosphere of an entire page from one
 * place instead of fighting per-row gradients. Rows below the hero are
 * transparent unless they carry a plain background colour.
 */
import type { PageMeshConfig, PageRow } from "@/types/rows";
import { pickForeground } from "@/lib/pickForeground";

/** Brand default — the plum / gold wash the site shipped with. */
export const DEFAULT_PAGE_MESH: PageMeshConfig = {
  colors: ["#EBD3F0", "#FAECC0", "#E8D6F2", "#F6E9C4"],
  strength: 70,
  motion: "calm",
  grain: 35,
};

/**
 * The second hue each blob drifts to when the mesh is in motion — the
 * extra colours of the brand's light backgrounds (Aurora's sky and
 * pink, Verdigris' mint, Ember's peach). Index-matched to the blobs.
 */
export const MESH_DRIFT_POOL = ["#F4D3E9", "#D5EFE4", "#D9E3F7", "#F8DCCF"] as const;

/**
 * CSS custom properties that drive the animated `.page-mesh-layer`
 * (see index.css): per-blob base and drift colours with the intensity
 * baked in, the grain opacity, and the motion speed multiplier.
 */
export const buildPageMeshVars = (mesh?: Partial<PageMeshConfig>): Record<string, string> => {
  const colors = (mesh?.colors as string[] | undefined)?.length === 4
    ? (mesh!.colors as string[])
    : DEFAULT_PAGE_MESH.colors;
  const alpha = Math.max(0, Math.min(100, mesh?.strength ?? DEFAULT_PAGE_MESH.strength)) / 100;
  const vars: Record<string, string> = {};
  colors.forEach((c, i) => {
    vars[`--mesh-c${i}`] = withAlpha(c, alpha);
    vars[`--mesh-d${i}`] = withAlpha(MESH_DRIFT_POOL[i], alpha);
  });
  const grain = Math.max(0, Math.min(100, mesh?.grain ?? DEFAULT_PAGE_MESH.grain ?? 0));
  /* Full slider = 0.9 opacity of the plum speckle sheet (the sheet itself
     is mostly transparent); the default 35 reads as film grain on a light
     wash without muddying body copy. */
  vars["--mesh-grain"] = String((grain / 100) * 0.9);
  const motion = mesh?.motion ?? DEFAULT_PAGE_MESH.motion ?? "calm";
  vars["--mesh-motion"] = motion === "off" ? "0" : motion === "lively" ? "2" : "1";
  return vars;
};

export const MESH_VAR_NAMES = [
  "--mesh-c0", "--mesh-c1", "--mesh-c2", "--mesh-c3",
  "--mesh-d0", "--mesh-d1", "--mesh-d2", "--mesh-d3",
  "--mesh-grain", "--mesh-motion",
] as const;

/** Positions of the four blobs. Index-matched to `mesh.colors`. */
const BLOBS = [
  "ellipse 70% 55% at 12% 4%",
  "ellipse 60% 48% at 92% 14%",
  "ellipse 65% 50% at 78% 62%",
  "ellipse 80% 45% at 22% 88%",
] as const;

const withAlpha = (hex: string, alpha: number): string => {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Build the CSS `background` value for the fixed page mesh layer. */
export const buildPageMeshCSS = (mesh?: Partial<PageMeshConfig>): string => {
  const colors = (mesh?.colors as string[] | undefined)?.length === 4
    ? (mesh!.colors as string[])
    : DEFAULT_PAGE_MESH.colors;
  const alpha = Math.max(0, Math.min(100, mesh?.strength ?? DEFAULT_PAGE_MESH.strength)) / 100;
  const layers = BLOBS.map(
    (shape, i) => `radial-gradient(${shape}, ${withAlpha(colors[i], alpha)}, transparent 70%)`,
  );
  return `${layers.join(", ")}, hsl(var(--background))`;
};

/** Read the mesh config a page should use: its hero row's, else the default. */
export const resolvePageMesh = (rows: PageRow[] | any[] | undefined): PageMeshConfig => {
  const hero = (rows || []).find((r: any) => r?.type === "hero");
  const mesh = hero?.layout?.mesh as PageMeshConfig | undefined;
  if (!mesh || !Array.isArray(mesh.colors) || mesh.colors.length !== 4) return DEFAULT_PAGE_MESH;
  return {
    colors: mesh.colors as PageMeshConfig["colors"],
    strength: mesh.strength ?? DEFAULT_PAGE_MESH.strength,
    motion: mesh.motion ?? DEFAULT_PAGE_MESH.motion,
    grain: mesh.grain ?? DEFAULT_PAGE_MESH.grain,
  };
};

/**
 * meshForegroundColor — the readable default text colour for rows that
 * paint NO colour of their own and therefore sit directly on the page
 * mesh. A dark mesh must flip body copy to light, otherwise transparent
 * rows render dark-on-dark.
 *
 * The mesh blobs are drawn at `strength`% opacity over the page's base
 * surface, so we blend each blob colour with that surface, average them,
 * and let `pickForeground` make the call.
 */
export const meshForegroundColor = (
  mesh: Partial<PageMeshConfig> | undefined,
  /** The page's base surface as `rgb(...)`/hex — usually --background. */
  baseColor: string,
): string => {
  const colors = (mesh?.colors as string[] | undefined)?.length === 4
    ? (mesh!.colors as string[])
    : DEFAULT_PAGE_MESH.colors;
  const alpha = Math.max(0, Math.min(100, mesh?.strength ?? DEFAULT_PAGE_MESH.strength)) / 100;

  const base = toRgb(baseColor) ?? [250, 249, 246];
  let r = 0, g = 0, b = 0;
  for (const c of colors) {
    const rgb = toRgb(c) ?? base;
    r += rgb[0] * alpha + base[0] * (1 - alpha);
    g += rgb[1] * alpha + base[1] * (1 - alpha);
    b += rgb[2] * alpha + base[2] * (1 - alpha);
  }
  const n = colors.length;
  return pickForeground(`rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`);
};

/** Parse `#rgb`, `#rrggbb` or `rgb()/rgba()` into an [r,g,b] tuple. */
const toRgb = (value: string): [number, number, number] | null => {
  const v = (value || "").trim();
  const rgb = v.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
  let h = v.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
