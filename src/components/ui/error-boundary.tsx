/**
 * ErrorBoundary — uptime resilience for the public site.
 *
 * ════════════════════════════════════════════════════════════════════
 * JUNIOR-DEV LESSON: WHY WE NEED ERROR BOUNDARIES
 * ════════════════════════════════════════════════════════════════════
 *
 * In React, an uncaught render error inside ANY component will, by
 * default, crash the entire React tree above it. The user sees a blank
 * white page — no navigation, no footer, no chance to navigate away.
 *
 * An <ErrorBoundary> is React's "try/catch for the render phase". It
 * catches errors thrown by its descendants during rendering, lifecycle
 * methods, and constructors, then renders a fallback instead of
 * propagating the error upward.
 *
 * We wrap the app in THREE layers, narrowest to widest:
 *
 *   1) RowErrorBoundary  — around each <RowRenderer/>. If one row's
 *      data is malformed, only that row shows a tiny inline error —
 *      every other row keeps rendering. The marketing page survives.
 *
 *   2) PageErrorBoundary — around each route's body. Catches any error
 *      that escapes the row layer (e.g. a hook crash in <Navbar/>).
 *      Shows a branded "something went wrong" with a reload button.
 *
 *   3) AppErrorBoundary  — at the very top of <App/>. Last resort. If
 *      even the router crashes, we show a minimal full-screen fallback
 *      with a hard reload action.
 *
 * Three layers ≠ paranoia. Each catches errors the layer below it
 * can't, and the user always sees something instead of a white screen.
 *
 * ⚠️  Error boundaries DON'T catch:
 *      - errors in event handlers (use try/catch there)
 *      - async errors in setTimeout / promises (use .catch())
 *      - errors during server rendering
 *      - errors thrown in the boundary itself
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";

/**
 * EDITABLE COPY for the error fallback.
 *
 * Admin can edit headline/body/buttons via PagesManager → "Error Pages"
 * which writes to `site_content` under section_key `error_boundary`.
 * Hardcoded fallback ensures the boundary still renders even if the DB
 * is unreachable (which is exactly when an error is most likely!).
 *
 * THEME: LIGHT (intentional). See NotFound.tsx for the rationale.
 */
interface ErrorBoundaryContent {
  headline: string;
  body: string;
  retry_label: string;
  home_label: string;
  technical_details_label: string;
  row_fallback_label: string;
  row_fallback_retry_label: string;
}

const ERROR_FALLBACK: ErrorBoundaryContent = {
  headline: "Something went wrong",
  body: "We hit an unexpected snag while loading this page. The rest of the site is still working — you can head back to the homepage or try again.",
  retry_label: "Try again",
  home_label: "Back to home",
  technical_details_label: "Technical details",
  row_fallback_label: "Section unavailable",
  row_fallback_retry_label: "Retry",
};

interface Props {
  children: ReactNode;
  /** Element rendered when an error is caught. Can be a node or a render function. */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Optional label printed to the console alongside the error for easier debugging. */
  label?: string;
  /** Called whenever a new error is caught. Hook for analytics or logging. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Always log so we can trace issues from the browser console without
    // needing remote error tracking.
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info);
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") return fallback(this.state.error, this.reset);
      if (fallback !== undefined) return fallback;
      return <DefaultFallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

/**
 * Branded full-page fallback. Used by Page + App boundaries.
 *
 * Uses LIGHT theme tokens (`--light-bg` / `--light-fg`) — error pages
 * intentionally break from the dark luxury aesthetic so they feel like
 * neutral system pages. See NotFound.tsx for matching styling.
 *
 * Tries to read editable copy from `site_content.error_boundary`.
 * If react-query throws inside this fallback (it shouldn't, but the
 * boundary lives ABOVE the QueryClientProvider in some setups), the
 * try/catch keeps us safe and we fall back to hardcoded strings.
 */
const DefaultFallback = ({ error, reset }: { error: Error; reset: () => void }) => {
  let copy = ERROR_FALLBACK;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    copy = useSiteContent<ErrorBoundaryContent>("error_boundary", ERROR_FALLBACK);
  } catch {
    copy = ERROR_FALLBACK;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "hsl(var(--light-bg))", color: "hsl(var(--light-fg))" }}
    >
      <div className="max-w-md text-center space-y-4">
        <h1 className="font-display text-2xl font-bold" style={{ color: "hsl(var(--light-fg))" }}>
          {copy.headline}
        </h1>
        <p className="font-body text-sm" style={{ color: "hsl(var(--light-fg) / 0.7)" }}>
          {copy.body}
        </p>
        <details
          className="text-left text-xs font-mono p-3 rounded-md"
          style={{ backgroundColor: "hsl(var(--light-fg) / 0.06)", color: "hsl(var(--light-fg) / 0.7)" }}
        >
          <summary className="cursor-pointer">{copy.technical_details_label}</summary>
          <pre className="mt-2 whitespace-pre-wrap break-all">{error.message}</pre>
        </details>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="font-body text-xs uppercase tracking-wider px-5 py-2 rounded-full border hover:opacity-80"
            style={{ borderColor: "hsl(var(--light-fg) / 0.3)", color: "hsl(var(--light-fg))" }}
          >
            {copy.retry_label}
          </button>
          <a
            href="/"
            className="font-body text-xs uppercase tracking-wider px-5 py-2 rounded-full"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            {copy.home_label}
          </a>
        </div>
      </div>
    </div>
  );
};

/**
 * Tiny inline fallback used per-row inside <PageRows/>. Doesn't take up
 * the full viewport — keeps the rest of the page reading naturally.
 *
 * Reads its labels from `site_content.error_boundary` so the same copy
 * source powers all error UI on the site.
 */
export const RowFallback = ({ error, reset }: { error: Error; reset: () => void }) => {
  let copy = ERROR_FALLBACK;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    copy = useSiteContent<ErrorBoundaryContent>("error_boundary", ERROR_FALLBACK);
  } catch {
    copy = ERROR_FALLBACK;
  }

  return (
    <div
      className="my-4 mx-4 p-4 rounded-lg border text-center"
      style={{
        borderColor: "hsl(var(--destructive) / 0.3)",
        backgroundColor: "hsl(var(--destructive) / 0.05)",
        color: "hsl(var(--destructive))",
      }}
    >
      <p className="font-body text-xs uppercase tracking-wider opacity-70">{copy.row_fallback_label}</p>
      <p className="font-body text-[10px] mt-1 opacity-50">{error.message}</p>
      <button
        onClick={reset}
        className="mt-2 font-body text-[10px] uppercase tracking-wider underline opacity-70 hover:opacity-100"
      >
        {copy.row_fallback_retry_label}
      </button>
    </div>
  );
};
