import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, Copy, ExternalLink } from "lucide-react";
import { bing, gsc, indexNow, EngineError, INDEXNOW_KEY, type EngineStatus } from "@/services/searchEngines";
import { readServiceAccountKey, searchConsoleUsersUrl } from "./serviceAccountKey";
import { adminPath } from "./navigation";

/**
 * Settings → Search engines: two guided setups (Google Search Console,
 * Bing Webmaster Tools), IndexNow, and the crawler policy.
 *
 * Each setup is a numbered list. A step has a one-line instruction, a
 * button that opens the exact outside page, and either a "Done" tick the
 * owner sets (for things that happen on Google's or Bing's site) or a
 * tick that sets itself (a key that reads correctly, a connection that
 * works). Ticks are remembered in this browser so a setup interrupted
 * halfway picks up where it stopped. Keys are sent once to the edge
 * function and stored where only it can read them.
 */

const SITE = "themagiccoffin.com";
const LINKS = {
  cloudServiceAccounts: "https://console.cloud.google.com/iam-admin/serviceaccounts",
  cloudNewProject: "https://console.cloud.google.com/projectcreate",
  cloudSearchConsoleApi: "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com",
  bingHome: "https://www.bing.com/webmasters/",
};

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

const Status = ({ s }: { s: EngineStatus | null | undefined }) => (
  <span className={`admin-st ${s?.connected ? "live" : "draft"}`}>{s ? (s.connected ? "Connected" : "Not connected") : "Checking…"}</span>
);

/* ── remembered ticks ─────────────────────────────────────────────── */

const useTicks = (key: string) => {
  const [ticks, setTicks] = useState<number[]>(() => {
    try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v.map(Number) : []; } catch { return []; }
  });
  const toggle = (n: number) => setTicks((t) => {
    const next = t.includes(n) ? t.filter((x) => x !== n) : [...t, n];
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* fine without */ }
    return next;
  });
  const clear = () => { setTicks([]); try { localStorage.removeItem(key); } catch { /* fine */ } };
  return { ticks, toggle, clear };
};

/* ── building blocks ──────────────────────────────────────────────── */

const Open = ({ href, children }: { href: string; children: ReactNode }) => (
  <a className="admin-btn" href={href} target="_blank" rel="noreferrer">{children}<ExternalLink size={12} aria-hidden /></a>
);

const DoneToggle = ({ done, onToggle }: { done: boolean; onToggle: () => void }) => (
  <button type="button" className={`admin-btn ${done ? "" : "ghost"}`} aria-pressed={done} onClick={onToggle}>
    {done ? <><Check size={12} aria-hidden /> Done</> : "Mark as done"}
  </button>
);

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* the text stays visible beside the button */ }
  };
  return (
    <button type="button" className="admin-btn" onClick={copy} aria-label="Copy">
      {copied ? <><Check size={12} aria-hidden /> Copied</> : <><Copy size={12} aria-hidden /> Copy</>}
    </button>
  );
};

const Step = ({ n, title, done, hint, actions, children }: { n: number; title: string; done: boolean; hint?: ReactNode; actions?: ReactNode; children?: ReactNode }) => (
  <li className="flex gap-3 py-3" style={{ borderTop: "1px solid hsl(var(--border))" }} data-step={n} data-done={done || undefined}>
    <span
      className="w-6 h-6 rounded-full shrink-0 inline-flex items-center justify-center font-body text-[11px] font-semibold"
      style={done ? { background: "hsl(var(--admin-ok))", color: "hsl(var(--background))" } : { border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
      aria-hidden
    >
      {done ? <Check size={12} /> : n}
    </span>
    <div className="min-w-0 flex-1 space-y-2">
      <p className="font-body text-sm font-medium text-foreground" style={done ? { color: "hsl(var(--muted-foreground))" } : undefined}>{title}</p>
      {hint && <p className="font-body text-xs text-muted-foreground">{hint}</p>}
      {children}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </li>
);

const Progress = ({ done, total }: { done: number; total: number }) => (
  <span className="font-body text-[11px] text-muted-foreground">{done} of {total} steps done</span>
);

const Trouble = ({ error }: { error: EngineError | null }) => {
  if (!error) return null;
  return (
    <div className="rounded-md p-3 space-y-1" style={{ background: "hsl(var(--admin-bad) / .08)", border: "1px solid hsl(var(--admin-bad) / .35)" }} role="alert">
      <p className="font-body text-xs" style={{ color: "hsl(var(--admin-bad))" }}>{error.message}</p>
      {error.sites && (
        <p className="font-body text-xs text-muted-foreground">
          {error.sites.length ? <>This account can see: {error.sites.join(", ")}.</> : <>This account cannot see any site yet.</>}
        </p>
      )}
    </div>
  );
};

/* ── Google Search Console ────────────────────────────────────────── */

const GoogleSetup = ({ status, onChange }: { status: EngineStatus | null | undefined; onChange: () => Promise<void> }) => {
  const { ticks, toggle, clear } = useTicks("tmc_setup_gsc");
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<EngineError | null>(null);
  const reading = readServiceAccountKey(json);
  const host = status?.host || SITE;

  const done = { 1: ticks.includes(1), 2: ticks.includes(2), 3: reading.ok, 4: ticks.includes(4) };
  const count = Object.values(done).filter(Boolean).length;

  const connect = async () => {
    setBusy(true); setError(null);
    try {
      await gsc.connect(json);
      setJson(""); clear();
      toast.success("Search Console connected");
      await onChange();
    } catch (e) {
      setError(e instanceof EngineError ? e : new EngineError(e instanceof Error ? e.message : "Something went wrong"));
    } finally { setBusy(false); }
  };

  const disconnect = async () => {
    setBusy(true);
    try { await gsc.disconnect(); toast.success("Search Console disconnected"); await onChange(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-md border bg-card p-4 space-y-3" style={{ borderColor: "hsl(var(--border))" }} aria-labelledby="gsc-h" data-setup="google">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 id="gsc-h" className="font-body text-sm font-medium text-foreground">Google Search Console</h3>
          <p className="font-body text-xs text-muted-foreground">What people typed into Google before they found the site, and which pages Google shows.</p>
        </div>
        <div className="flex items-center gap-3">{!status?.connected && status !== undefined && <Progress done={count} total={5} />}<Status s={status} /></div>
      </div>

      {status?.connected ? (
        <div className="space-y-2">
          <p className="font-body text-xs text-muted-foreground">Reading <code>{status.siteUrl}</code> as <code>{status.clientEmail}</code> since {fmtDate(status.since)}. Google's numbers trail by about two days, so a fresh connection shows figures from the day before yesterday backwards.</p>
          <div className="flex flex-wrap gap-2">
            <Link className="admin-btn primary" to={`${adminPath("insights", "seo")}&view=search`}>See search performance</Link>
            <button type="button" className="admin-btn" disabled={busy} onClick={disconnect}>Disconnect</button>
          </div>
        </div>
      ) : status === undefined ? null : (
        <ol className="list-none m-0 p-0">
          <Step
            n={1}
            title="Create a service account in Google Cloud"
            done={done[1]}
            hint={<>A service account is a sign-in for this admin, not for a person, so it never expires and needs no pop-ups. Open the page, pick any project (or make one called "Magic Coffin"), press <strong>Create service account</strong>, name it <strong>magic-coffin-search</strong>, skip the roles, press <strong>Done</strong>.</>}
            actions={<><Open href={LINKS.cloudServiceAccounts}>Open service accounts</Open><Open href={LINKS.cloudNewProject}>Make a project first</Open><DoneToggle done={done[1]} onToggle={() => toggle(1)} /></>}
          />
          <Step
            n={2}
            title="Turn on the Search Console API for that project"
            done={done[2]}
            hint={<>Open the page, make sure the same project is chosen at the top, press <strong>Enable</strong>. Without this Google refuses every request from the account.</>}
            actions={<><Open href={LINKS.cloudSearchConsoleApi}>Open the API page</Open><DoneToggle done={done[2]} onToggle={() => toggle(2)} /></>}
          />
          <Step
            n={3}
            title="Download a key file and paste it here"
            done={done[3]}
            hint={<>Open the service account → <strong>Keys</strong> → <strong>Add key</strong> → <strong>Create new key</strong> → <strong>JSON</strong> → <strong>Create</strong>. A file downloads. Open it in any text editor, select all, copy, paste below. Google only lets you download it once; if you lose it, make another.</>}
            actions={<Open href={LINKS.cloudServiceAccounts}>Open service accounts</Open>}
          >
            <textarea
              value={json}
              onChange={(e) => { setJson(e.target.value); setError(null); }}
              rows={4}
              placeholder='Paste the whole file: { "type": "service_account", "client_email": "…", "private_key": "-----BEGIN PRIVATE KEY-----…" }'
              className="admin-input font-mono"
              style={{ fontSize: 11 }}
              aria-label="Service account key file"
              spellCheck={false}
            />
            {reading.ok ? (
              <p className="font-body text-xs" style={{ color: "hsl(var(--admin-ok))" }}><Check size={12} className="inline align-[-2px]" aria-hidden /> Key for <code>{reading.email}</code>{reading.project ? <> in project <code>{reading.project}</code></> : null}.</p>
            ) : reading.reason ? (
              <p className="font-body text-xs" style={{ color: "hsl(var(--admin-bad))" }}>{reading.reason}</p>
            ) : null}
          </Step>
          <Step
            n={4}
            title="Let that account read Search Console"
            done={done[4]}
            hint={<>Open the page, press <strong>Add user</strong>, paste the email, choose <strong>Full</strong> permission, press <strong>Add</strong>. {reading.ok ? null : <>The email appears here once step 3 is done.</>}</>}
            actions={<><Open href={searchConsoleUsersUrl(host)}>Open users and permissions</Open><DoneToggle done={done[4]} onToggle={() => toggle(4)} /></>}
          >
            {reading.ok && (
              <div className="flex flex-wrap items-center gap-2">
                <code className="admin-input font-mono" style={{ width: "auto", fontSize: 11 }}>{reading.email}</code>
                <CopyButton text={reading.email} />
              </div>
            )}
          </Step>
          <Step
            n={5}
            title="Connect"
            done={false}
            hint="The key is checked once against Google, then stored where only the server can read it. The browser never sees it again."
            actions={<button type="button" className="admin-btn primary" disabled={busy || !reading.ok} onClick={connect}>{busy ? "Checking with Google…" : "Connect Search Console"}</button>}
          >
            <Trouble error={error} />
          </Step>
        </ol>
      )}
    </section>
  );
};

/* ── Bing Webmaster Tools ─────────────────────────────────────────── */

const BingSetup = ({ status, onChange }: { status: EngineStatus | null | undefined; onChange: () => Promise<void> }) => {
  const { ticks, toggle, clear } = useTicks("tmc_setup_bing");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<EngineError | null>(null);
  const keyOk = key.trim().length >= 20;
  const done = { 1: ticks.includes(1), 2: ticks.includes(2), 3: keyOk };
  const count = Object.values(done).filter(Boolean).length;

  const connect = async () => {
    setBusy(true); setError(null);
    try {
      await bing.connect(key.trim());
      setKey(""); clear();
      toast.success("Bing connected");
      await onChange();
    } catch (e) {
      setError(e instanceof EngineError ? e : new EngineError(e instanceof Error ? e.message : "Something went wrong"));
    } finally { setBusy(false); }
  };

  const disconnect = async () => {
    setBusy(true);
    try { await bing.disconnect(); toast.success("Bing disconnected"); await onChange(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-md border bg-card p-4 space-y-3" style={{ borderColor: "hsl(var(--border))" }} aria-labelledby="bing-h" data-setup="bing">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 id="bing-h" className="font-body text-sm font-medium text-foreground">Bing Webmaster Tools</h3>
          <p className="font-body text-xs text-muted-foreground">The same for Bing, which also feeds DuckDuckGo, Yahoo and Copilot. Ten minutes, no code.</p>
        </div>
        <div className="flex items-center gap-3">{!status?.connected && status !== undefined && <Progress done={count} total={4} />}<Status s={status} /></div>
      </div>

      {status?.connected ? (
        <div className="space-y-2">
          <p className="font-body text-xs text-muted-foreground">Reading <code>{status.siteUrl}</code> since {fmtDate(status.since)}.</p>
          <div className="flex flex-wrap gap-2">
            <Link className="admin-btn primary" to={`${adminPath("insights", "seo")}&view=search`}>See search performance</Link>
            <button type="button" className="admin-btn" disabled={busy} onClick={disconnect}>Disconnect</button>
          </div>
        </div>
      ) : status === undefined ? null : (
        <ol className="list-none m-0 p-0">
          <Step
            n={1}
            title="Add the site to Bing Webmaster Tools"
            done={done[1]}
            hint={<>Sign in with the Google account that owns Search Console. Press <strong>Add a site</strong> and choose <strong>Import from Google Search Console</strong>: tick <strong>{SITE}</strong> and it is verified at once, nothing to paste into the site.</>}
            actions={<><Open href={LINKS.bingHome}>Open Bing Webmaster Tools</Open><DoneToggle done={done[1]} onToggle={() => toggle(1)} /></>}
          />
          <Step
            n={2}
            title="Make an API key"
            done={done[2]}
            hint={<>In Bing Webmaster Tools press the gear icon (top right) → <strong>API access</strong> → <strong>API Key</strong> → <strong>Generate</strong>. Copy the key it shows.</>}
            actions={<><Open href={LINKS.bingHome}>Open Bing Webmaster Tools</Open><DoneToggle done={done[2]} onToggle={() => toggle(2)} /></>}
          />
          <Step n={3} title="Paste the key" done={done[3]}>
            <input value={key} onChange={(e) => { setKey(e.target.value); setError(null); }} placeholder="A long string of letters and numbers" className="admin-input font-mono" style={{ fontSize: 12 }} aria-label="Bing API key" spellCheck={false} autoComplete="off" />
          </Step>
          <Step
            n={4}
            title="Connect"
            done={false}
            hint="The key is checked once against Bing, then stored where only the server can read it."
            actions={<button type="button" className="admin-btn primary" disabled={busy || !keyOk} onClick={connect}>{busy ? "Checking with Bing…" : "Connect Bing"}</button>}
          >
            <Trouble error={error} />
          </Step>
        </ol>
      )}
    </section>
  );
};

/* ── screen ───────────────────────────────────────────────────────── */

const SearchEnginesSettings = () => {
  const [g, setG] = useState<EngineStatus | null | undefined>(undefined);
  const [b, setB] = useState<EngineStatus | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [gs, bs] = await Promise.allSettled([gsc.status(), bing.status()]);
    setG(gs.status === "fulfilled" ? gs.value : null);
    setB(bs.status === "fulfilled" ? bs.value : null);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitAll = async () => {
    setBusy(true);
    try { const r = await indexNow.submitAll(); toast.success(`${r.submitted} pages submitted`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  };

  return (
    <div className="admin-page space-y-4">
      <div className="admin-page-head">
        <div>
          <h2 className="admin-h2">Search engines</h2>
          <p className="admin-sub">Connect Google and Bing once and their search numbers appear under Insights → SEO checks → Search performance. Each setup is a short list; ticks are remembered in this browser, so you can stop and come back.</p>
        </div>
      </div>

      <GoogleSetup status={g} onChange={load} />
      <BingSetup status={b} onChange={load} />

      <section className="rounded-md border bg-card p-4 space-y-2" style={{ borderColor: "hsl(var(--border))" }} aria-labelledby="in-h">
        <div className="flex items-center justify-between gap-3">
          <h3 id="in-h" className="font-body text-sm font-medium text-foreground">IndexNow</h3>
          <span className="admin-st live">On</span>
        </div>
        <p className="font-body text-xs text-muted-foreground">Nothing to set up. Every publish tells Bing, Yandex and the other IndexNow engines which page changed, so they recrawl within minutes. Google does not use it; it reads the sitemap. Key file: <code>/{INDEXNOW_KEY}.txt</code>.</p>
        <button type="button" className="admin-btn" disabled={busy} onClick={submitAll}>{busy ? "Submitting…" : "Submit all pages now"}</button>
      </section>

      <section className="rounded-md border bg-card p-4 space-y-1" style={{ borderColor: "hsl(var(--border))" }}>
        <h3 className="font-body text-sm font-medium text-foreground">Crawlers</h3>
        <p className="font-body text-xs text-muted-foreground">robots.txt allows every crawler, including the AI training crawlers (GPTBot, CCBot, Google-Extended), as decided. The admin and preview paths are excluded.</p>
      </section>
    </div>
  );
};

export default SearchEnginesSettings;
