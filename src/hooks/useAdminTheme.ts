import { useCallback, useEffect, useState } from "react";

export type AdminTheme = "light" | "dark";
const KEY = "admin-theme";

const read = (): AdminTheme => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch { /* private mode */ }
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

/**
 * Day / night for the admin only. The public site keeps its own look;
 * this flips the `.admin-light` / `.admin-dark` token set on the admin
 * wrapper (see index.css) and remembers the choice per browser.
 */
export const useAdminTheme = () => {
  const [theme, setTheme] = useState<AdminTheme>(read);
  useEffect(() => {
    try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return { theme, toggle, className: theme === "dark" ? "admin-dark dark" : "admin-light" };
};
