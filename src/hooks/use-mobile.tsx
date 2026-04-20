import * as React from "react";

const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  // Initialize synchronously from window.innerWidth so the very first render
  // already knows the correct viewport size. This prevents a one-frame layout
  // shift / logo flicker that happened when the state started as `undefined`
  // and was only resolved inside a useEffect.
  const [isMobile, setIsMobile] = React.useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // Re-sync in case width changed between module init and effect mount.
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
