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

/** Brand default — the plum / gold wash the site shipped with. */
export const DEFAULT_PAGE_MESH: PageMeshConfig = {
  colors: ["#EBD3F0", "#FAECC0", "#E8D6F2", "#F6E9C4"],
  strength: 70,
};

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
  return { colors: mesh.colors as PageMeshConfig["colors"], strength: mesh.strength ?? DEFAULT_PAGE_MESH.strength };
};
