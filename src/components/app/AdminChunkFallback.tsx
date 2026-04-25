/**
 * Branded fallback shown while a lazy-loaded admin chunk is downloading.
 * Public visitors never see this — only admins navigating into /admin/*.
 */
const AdminChunkFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-secondary/30 border-t-secondary animate-spin" />
      <p className="font-body text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Loading admin
      </p>
    </div>
  </div>
);

export default AdminChunkFallback;
