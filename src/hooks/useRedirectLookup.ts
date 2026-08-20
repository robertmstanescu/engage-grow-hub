/**
 * useRedirectLookup — checks the `redirects` table for the current path
 * before a 404 renders. If a match is found, replaces the browser
 * location with the target instead of showing "not found".
 *
 * LIMITATION: this app is a client-rendered SPA with no SSR, so this is
 * a client-side (`history.replaceState`-based) redirect, not a literal
 * server-side HTTP 301. The browser first receives a 200 for the app
 * shell; JS then navigates. Fine for real users and JS-executing
 * crawlers (Googlebot), not equivalent for non-JS tooling — an accepted
 * limitation of the SPA architecture, not a defect in this feature.
 *
 * Used by both `NotFound.tsx` (covers CmsPage.tsx's inline render AND
 * the router's catch-all route) and `BlogPost.tsx` (which has its own
 * bespoke "not found" branch and does NOT render `<NotFound/>`).
 */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { lookupRedirect } from "@/services/redirects";

/** Returns `true` while the lookup is in flight — callers should hold
 *  off rendering "not found" content until this resolves to `false`. */
export const useRedirectLookup = (): boolean => {
  const [checking, setChecking] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    lookupRedirect(location.pathname).then(({ data }) => {
      if (cancelled) return;
      if (data?.to_path) navigate(data.to_path, { replace: true });
      else setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  return checking;
};
