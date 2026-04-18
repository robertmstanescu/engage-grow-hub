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

/** Branded full-page fallback. Used by Page + App boundaries. */
const DefaultFallback = ({ error, reset }: { error: Error; reset: () => void }) => (
  <div
    className="min-h-screen flex items-center justify-center px-6"
    style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
  >
    <div className="max-w-md text-center space-y-4">
      <h1 className="font-display text-2xl font-bold" style={{ color: "hsl(var(--secondary))" }}>
        Something went wrong
      </h1>
      <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
        We hit an unexpected snag while loading this page. The rest of the site is still working —
        you can head back to the homepage or try again.
      </p>
      <details
        className="text-left text-xs font-mono p-3 rounded-md"
        style={{ backgroundColor: "hsl(var(--muted) / 0.3)", color: "hsl(var(--muted-foreground))" }}
      >
        <summary className="cursor-pointer">Technical details</summary>
        <pre className="mt-2 whitespace-pre-wrap break-all">{error.message}</pre>
      </details>
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={reset}
          className="font-body text-xs uppercase tracking-wider px-5 py-2 rounded-full border hover:opacity-80"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          Try again
        </button>
        <a
          href="/"
          className="font-body text-xs uppercase tracking-wider px-5 py-2 rounded-full"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          Back to home
        </a>
      </div>
    </div>
  </div>
);

/**
 * Tiny inline fallback used per-row inside <PageRows/>. Doesn't take up
 * the full viewport — keeps the rest of the page reading naturally.
 */
export const RowFallback = ({ error, reset }: { error: Error; reset: () => void }) => (
  <div
    className="my-4 mx-4 p-4 rounded-lg border text-center"
    style={{
      borderColor: "hsl(var(--destructive) / 0.3)",
      backgroundColor: "hsl(var(--destructive) / 0.05)",
      color: "hsl(var(--destructive))",
    }}
  >
    <p className="font-body text-xs uppercase tracking-wider opacity-70">Section unavailable</p>
    <p className="font-body text-[10px] mt-1 opacity-50">{error.message}</p>
    <button
      onClick={reset}
      className="mt-2 font-body text-[10px] uppercase tracking-wider underline opacity-70 hover:opacity-100"
    >
      Retry
    </button>
  </div>
);
