import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CustomColoursContext } from "./customColoursContext";

/**
 * Custom colours — where per-part colour pickers live now.
 *
 * Every row editor used to list ten-odd `ColorField`s (eyebrow, title,
 * body, note, card title…) beside the copy fields. The everyday control
 * is the row's Text tone (Style tab); the pickers are one-offs. So a
 * `CustomColoursProvider` around an editor collects every ColorField
 * into one "Custom colours" group at the bottom, closed by default,
 * with an "In use" mark when any of them holds a value. Editors need
 * no changes: ColorField portals itself into the group when a provider
 * is present, and renders inline when there is none (Brand settings).
 */
export const CustomColoursProvider = ({ children }: { children: ReactNode }) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [inUse, setInUse] = useState<Record<string, boolean>>({});
  const report = useCallback((id: string, v: boolean) => {
    setInUse((prev) => (prev[id] === v ? prev : { ...prev, [id]: v }));
  }, []);
  const count = Object.values(inUse).filter(Boolean).length;
  const value = useMemo(() => ({ target, report }), [target, report]);
  return (
    <CustomColoursContext.Provider value={value}>
      {children}
      <details className="admin-details mt-3" data-custom-colours>
        <summary>
          Custom colours
          {count > 0 && <span className="admin-tag" data-testid="custom-colours-in-use">{count} in use</span>}
        </summary>
        <p className="font-body text-[10px] text-muted-foreground leading-snug mb-2">
          Colours set by hand on parts of this block. Prefer the Text tone in the Style tab; use these for one-offs.
        </p>
        <div ref={setTarget} className="space-y-3" />
      </details>
    </CustomColoursContext.Provider>
  );
};
