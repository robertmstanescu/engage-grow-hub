import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { bing, gsc, indexNow, INDEXNOW_KEY, type EngineStatus } from "@/services/searchEngines";

/**
 * Settings → Search engines: connect Google Search Console, Bing
 * Webmaster Tools and IndexNow, and see what is connected. Keys are sent
 * once to the edge functions and stored where only they can read them.
 */

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

const Status = ({ s }: { s: EngineStatus | null | undefined }) => (
  <span className={`admin-st ${s?.connected ? "live" : "draft"}`}>{s ? (s.connected ? "Connected" : "Not connected") : "Checking…"}</span>
);

const SearchEnginesSettings = () => {
  const [g, setG] = useState<EngineStatus | null | undefined>(undefined);
  const [b, setB] = useState<EngineStatus | null | undefined>(undefined);
  const [gJson, setGJson] = useState("");
  const [bKey, setBKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [gs, bs] = await Promise.allSettled([gsc.status(), bing.status()]);
    setG(gs.status === "fulfilled" ? gs.value : null);
    setB(bs.status === "fulfilled" ? bs.value : null);
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try { await fn(); toast.success(done); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(null); }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h2 className="admin-h2">Search engines</h2>
          <p className="admin-sub">What Google and Bing know about the site, pulled into Insights → SEO checks. Keys are stored where only the server can read them.</p>
        </div>
      </div>

      <section className="rounded-md border bg-card p-4 space-y-3" style={{ borderColor: "hsl(var(--border))" }} aria-labelledby="gsc-h">
        <div className="flex items-center justify-between gap-3">
          <h3 id="gsc-h" className="font-body text-sm font-medium text-foreground">Google Search Console</h3>
          <Status s={g} />
        </div>
        {g?.connected ? (
          <div className="font-body text-xs text-muted-foreground space-y-1">
            <p>Property <code>{g.siteUrl}</code> · signed in as <code>{g.clientEmail}</code> · since {fmtDate(g.since)}</p>
            <button type="button" className="admin-btn" disabled={busy === "g"} onClick={() => run("g", gsc.disconnect, "Search Console disconnected")}>Disconnect</button>
          </div>
        ) : (
          <div className="space-y-2">
            <ol className="font-body text-xs text-muted-foreground list-decimal pl-4 space-y-1">
              <li>The site is already verified in Search Console (the verification tag is on every page).</li>
              <li>In Google Cloud, create a service account (any project), then a JSON key for it.</li>
              <li>In Search Console → Settings → Users and permissions, add the service account's email with Full access.</li>
              <li>Paste the whole JSON key file below. It is checked once, then stored server-side.</li>
            </ol>
            <textarea value={gJson} onChange={(e) => setGJson(e.target.value)} rows={4} placeholder='{ "type": "service_account", "client_email": "…", "private_key": "-----BEGIN PRIVATE KEY-----…" }' className="admin-input font-mono" style={{ fontSize: 11 }} aria-label="Service account JSON" />
            <button type="button" className="admin-btn primary" disabled={busy === "g" || !gJson.trim()} onClick={() => run("g", () => gsc.connect(gJson).then(() => setGJson("")), "Search Console connected")}>{busy === "g" ? "Checking…" : "Connect"}</button>
          </div>
        )}
      </section>

      <section className="rounded-md border bg-card p-4 space-y-3" style={{ borderColor: "hsl(var(--border))" }} aria-labelledby="bing-h">
        <div className="flex items-center justify-between gap-3">
          <h3 id="bing-h" className="font-body text-sm font-medium text-foreground">Bing Webmaster Tools</h3>
          <Status s={b} />
        </div>
        {b?.connected ? (
          <div className="font-body text-xs text-muted-foreground space-y-1">
            <p>Site <code>{b.siteUrl}</code> · since {fmtDate(b.since)}</p>
            <button type="button" className="admin-btn" disabled={busy === "b"} onClick={() => run("b", bing.disconnect, "Bing disconnected")}>Disconnect</button>
          </div>
        ) : (
          <div className="space-y-2">
            <ol className="font-body text-xs text-muted-foreground list-decimal pl-4 space-y-1">
              <li>Sign in at bing.com/webmasters and add the site. Choose "Import from Google Search Console": it verifies at once.</li>
              <li>Settings → API access → Generate API key.</li>
              <li>Paste the key below.</li>
            </ol>
            <input value={bKey} onChange={(e) => setBKey(e.target.value)} placeholder="Bing Webmaster API key" className="admin-input font-mono" style={{ fontSize: 12 }} aria-label="Bing API key" />
            <button type="button" className="admin-btn primary" disabled={busy === "b" || !bKey.trim()} onClick={() => run("b", () => bing.connect(bKey).then(() => setBKey("")), "Bing connected")}>{busy === "b" ? "Checking…" : "Connect"}</button>
          </div>
        )}
      </section>

      <section className="rounded-md border bg-card p-4 space-y-2" style={{ borderColor: "hsl(var(--border))" }} aria-labelledby="in-h">
        <div className="flex items-center justify-between gap-3">
          <h3 id="in-h" className="font-body text-sm font-medium text-foreground">IndexNow</h3>
          <span className="admin-st live">On</span>
        </div>
        <p className="font-body text-xs text-muted-foreground">Every publish tells Bing, Yandex and the other IndexNow engines which page changed, so they recrawl within minutes. Google does not use it; it reads the sitemap. Key file: <code>/{INDEXNOW_KEY}.txt</code>.</p>
        <button type="button" className="admin-btn" disabled={busy === "i"} onClick={() => run("i", indexNow.submitAll, "Every page in the sitemap was submitted")}>{busy === "i" ? "Submitting…" : "Submit all pages now"}</button>
      </section>

      <section className="rounded-md border bg-card p-4 space-y-1" style={{ borderColor: "hsl(var(--border))" }}>
        <h3 className="font-body text-sm font-medium text-foreground">Crawlers</h3>
        <p className="font-body text-xs text-muted-foreground">robots.txt allows every crawler, including the AI training crawlers (GPTBot, CCBot, Google-Extended), as decided. The admin and preview paths are excluded.</p>
      </section>
    </div>
  );
};

export default SearchEnginesSettings;
