import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * ════════════════════════════════════════════════════════════════════
 * BuilderContext — selection state for the visual canvas (US 15.2)
 * ════════════════════════════════════════════════════════════════════
 *
 * WHY THIS EXISTS
 * ───────────────
 * The center canvas is now a true WYSIWYG render of the live frontend
 * (HeroView / RowsRenderer). Editors need a way to "target" a single
 * element so the right-hand Inspector knows which widget's settings to
 * show. We do that by tracking ONE `activeElement` id at a time.
 *
 * IMPORTANT — `enabled` flag:
 * The same RowsRenderer is used by the public site. Wrapping every row
 * with selection chrome on the public site would be a disaster. So the
 * Provider only emits a non-null context value when `enabled` is true
 * (i.e. inside the admin canvas). On the public site there is NO
 * provider above the tree, and `useBuilder()` returns a `disabled`
 * stub that makes <SelectableWrapper> render as a transparent <>
 * passthrough — zero DOM noise, zero perf cost.
 */

export interface BuilderContextValue {
  /** Whether selection chrome should be applied at all. */
  enabled: boolean;
  /** Currently selected element id, or null. */
  activeElement: string | null;
  /** Set the active element. Pass null to clear selection. */
  setActiveElement: (id: string | null) => void;
}

const DISABLED: BuilderContextValue = {
  enabled: false,
  activeElement: null,
  setActiveElement: () => {},
};

const BuilderContext = createContext<BuilderContextValue>(DISABLED);

/**
 * Provider — mount once around the admin canvas. Anything outside this
 * provider gets the DISABLED stub and behaves like the public site.
 */
export const BuilderProvider = ({ children }: { children: ReactNode }) => {
  const [activeElement, setActive] = useState<string | null>(null);

  const setActiveElement = useCallback((id: string | null) => {
    setActive(id);
  }, []);

  const value = useMemo<BuilderContextValue>(
    () => ({ enabled: true, activeElement, setActiveElement }),
    [activeElement, setActiveElement],
  );

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
};

/** Read the current builder state. Always safe — returns a stub on the public site. */
export const useBuilder = (): BuilderContextValue => useContext(BuilderContext);
