import { defineConfig, devices } from "@playwright/test";

/**
 * Visual-regression config — deliberately separate from
 * `playwright.config.ts`, which belongs to Lovable's own runner (it
 * imports `lovable-agent-playwright-config`, a package that is not part
 * of this repo's install). This one is plain `@playwright/test`.
 *
 * It serves the PRODUCTION build (`dist/`, via `vite preview`) rather
 * than the dev server, so what gets screenshotted is what visitors get.
 * Run `npm run build` first; in CI the `check` job's `dist` artifact is
 * reused.
 */
export default defineConfig({
  testDir: "./tests/visual",
  // Screenshots are the whole point — never skip them.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // One baseline per OS: text antialiasing differs between macOS (local
  // runs) and Linux (CI), so a Mac-rendered PNG never matches Ubuntu's.
  // `npm run test:visual:update` refreshes the current OS; the
  // "visual-baseline" GitHub workflow refreshes the Linux one.
  snapshotPathTemplate: "{testDir}/__snapshots__/{platform}/{arg}{ext}",
  use: {
    ...devices["Desktop Chrome"],
    // Headless Chromium has no GPU; these flags give it software WebGL
    // so the page-mesh aurora paints (its still frame — reducedMotion
    // below freezes it) instead of the blob fallback.
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
    baseURL: "http://localhost:4173",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    // Kill CSS transitions/animations so reveal-on-scroll rows are stable.
    contextOptions: { reducedMotion: "reduce" },
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.01,
    },
  },
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
