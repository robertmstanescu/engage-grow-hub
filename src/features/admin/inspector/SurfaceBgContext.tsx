/**
 * ════════════════════════════════════════════════════════════════════
 * SurfaceBgContext — US 3.2 (Context-Aware Backgrounds for Inputs)
 * ════════════════════════════════════════════════════════════════════
 *
 * Carries the LIVE surface background colour (cell → column → row, in
 * that order of specificity) from the InspectorPanel down to every
 * field component (Field, TextArea, RichField, SectionBox) without
 * threading a `bgColor` prop through every widget admin editor.
 *
 * WHY A CONTEXT (and not prop drilling)
 * ─────────────────────────────────────
 * Each widget admin editor (HeroEditor, ImageTextEditor, ContactAdmin,
 * GridEditor, …) wraps its own collection of <Field/> instances.
 * Retrofitting each editor to forward a `bgColor` prop would touch a
 * dozen files and miss any editor added later. Wrapping the whole
 * `contentEditor` tree in a single Provider is a one-line surface that
 * every existing field automatically benefits from.
 *
 * USAGE
 * ─────
 *   <SurfaceBgProvider bgColor={effectiveBg}>
 *     {contentEditor}
 *   </SurfaceBgProvider>
 *
 * Consumers call `useSurfaceBg()` and receive `null` when no provider
 * is mounted (the page-level SEO state, for example) — in that case
 * inputs fall back to their default white surface.
 * ──────────────────────────────────────────────────────────────────── */

import { createContext, useContext, type ReactNode } from "react";

const SurfaceBgContext = createContext<string | null>(null);

export const SurfaceBgProvider = ({
  bgColor,
  children,
}: {
  bgColor: string | null | undefined;
  children: ReactNode;
}) => (
  <SurfaceBgContext.Provider value={bgColor && bgColor.trim() ? bgColor : null}>
    {children}
  </SurfaceBgContext.Provider>
);

/** Returns the ambient surface bg colour, or `null` when none is set. */
export const useSurfaceBg = (): string | null => useContext(SurfaceBgContext);
