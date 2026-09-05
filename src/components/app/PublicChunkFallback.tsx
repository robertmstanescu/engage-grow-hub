/**
 * Brief fallback shown only while a lazy-loaded public route chunk
 * (Blog, BlogPost, CmsPage) is downloading — normally invisible on a
 * warm cache/fast connection. Matches the "Loading…" treatment CmsPage
 * itself already uses for its data fetch, so the two loading states
 * (chunk, then data) read as one continuous moment rather than two
 * different UI styles flashing in sequence.
 */
const PublicChunkFallback = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
    <div className="animate-pulse font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading…</div>
  </div>
);

export default PublicChunkFallback;
