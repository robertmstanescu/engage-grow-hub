/**
 * Brief fallback shown only while a lazy-loaded public route chunk
 * (Blog, BlogPost, CmsPage) is downloading — normally invisible on a
 * warm cache/fast connection. Matches the "Loading…" treatment CmsPage
 * itself already uses for its data fetch (including the `page-shell`
 * class), so the two loading states (chunk, then data) read as one
 * continuous moment instead of the content visibly jumping — `page-shell`
 * applies the nav-bar vertical offset (`--nav-top-offset`); omitting it
 * here (as an earlier version of this file did) meant the "Loading…"
 * text sat at a different height than CmsPage's own loading screen,
 * producing a one-frame jump right where the hero renders next.
 */
const PublicChunkFallback = () => (
  <div className="min-h-screen page-shell flex items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
    <div className="animate-pulse font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading…</div>
  </div>
);

export default PublicChunkFallback;
