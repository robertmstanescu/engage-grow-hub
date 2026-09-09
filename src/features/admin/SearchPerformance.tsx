import { useCallback, useEffect, useState } from "react";
import { bing, gsc, isNotConnected, type SearchQueryResult, type SearchReport } from "@/services/searchEngines";

/**
 * Search performance — what people searched before they clicked, from
 * Google Search Console and Bing Webmaster Tools (last 28 days).
 * Connected under Settings → Search engines.
 */

const pct = (v?: number) => (v === undefined ? "—" : `${(v * 100).toFixed(1)}%`);
const pos = (v?: number) => (v === undefined || v === 0 ? "—" : v.toFixed(1));
const n = (v: number) => v.toLocaleString("en-GB");

const Bars = ({ rows }: { rows: Array<{ date: string; clicks: number; impressions: number }> }) => {
  const max = Math.max(1, ...rows.map((r) => r.impressions));
  return (
    <div className="flex items-end gap-[2px] h-16" aria-label="Impressions and clicks by day">
      {rows.map((r) => (
        <div key={r.date} className="flex-1 flex flex-col justify-end h-full" title={`${r.date}: ${r.clicks} clicks, ${r.impressions} impressions`}>
          <div style={{ height: `${(r.impressions / max) * 100}%`, background: "hsl(var(--muted-foreground) / .35)" }} />
          <div style={{ height: `${(r.clicks / max) * 100}%`, background: "hsl(var(--foreground))", marginTop: -1 }} />
        </div>
      ))}
    </div>
  );
};

const Table = ({ rows, label, name }: { rows: Array<{ query?: string; page?: string; country?: string; clicks: number; impressions: number; ctr?: number; position?: number }>; label: string; name: (r: { query?: string; page?: string; country?: string }) => string }) => (
  <div className="overflow-x-auto">
    <table className="admin-table w-full text-xs">
      <thead><tr><th className="text-left">{label}</th><th className="text-right">Clicks</th><th className="text-right">Impr.</th><th className="text-right">CTR</th><th className="text-right">Pos.</th></tr></thead>
      <tbody>
        {rows.slice(0, 12).map((r, i) => (
          <tr key={i}><td className="truncate max-w-[260px]" title={name(r)}>{name(r)}</td><td className="text-right tabular-nums">{n(r.clicks)}</td><td className="text-right tabular-nums">{n(r.impressions)}</td><td className="text-right tabular-nums">{pct(r.ctr)}</td><td className="text-right tabular-nums">{pos(r.position)}</td></tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Engine = ({ title, load }: { title: string; load: () => Promise<SearchQueryResult> }) => {
  const [report, setReport] = useState<SearchReport | null>(null);
  const [state, setState] = useState<"loading" | "off" | "error" | "ok">("loading");
  const [message, setMessage] = useState("");
  const fetchIt = useCallback(async () => {
    setState("loading");
    try {
      const result = await load();
      if (isNotConnected(result)) { setReport(null); setState("off"); return; }
      setReport(result); setState("ok");
    }
    catch (e) { const m = e instanceof Error ? e.message : ""; setMessage(m); setState(/not connected/i.test(m) ? "off" : "error"); }
  }, [load]);
  useEffect(() => { fetchIt(); }, [fetchIt]);

  return (
    <section className="rounded-md border bg-card p-4 space-y-3" style={{ borderColor: "hsl(var(--border))" }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-body text-sm font-medium text-foreground">{title}</h3>
        {report && <span className="font-body text-[11px] text-muted-foreground">{report.startDate} → {report.endDate}</span>}
      </div>
      {state === "loading" && <p className="font-body text-xs text-muted-foreground">Fetching…</p>}
      {state === "off" && <p className="font-body text-xs text-muted-foreground">Not connected. Connect it under Settings → Search engines.</p>}
      {state === "error" && <p className="font-body text-xs" style={{ color: "hsl(var(--admin-bad))" }}>{message}</p>}
      {state === "ok" && report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[["Clicks", n(report.totals.clicks)], ["Impressions", n(report.totals.impressions)], ["Click rate", pct(report.totals.ctr)], ["Position", pos(report.totals.position)]].map(([l, v]) => (
              <div key={l} className="admin-tile"><div className="admin-tile-n">{v}</div><div className="admin-tile-l">{l}</div></div>
            ))}
          </div>
          {report.byDate.length > 0 && <Bars rows={report.byDate} />}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Table rows={report.byQuery} label="What they searched" name={(r) => r.query || ""} />
            <Table rows={report.byPage} label="Which page" name={(r) => (r.page || "").replace(/^https?:\/\/[^/]+/, "") || "/"} />
          </div>
          {report.byCountry && report.byCountry.length > 0 && (
            <p className="font-body text-xs text-muted-foreground">Countries (clicks): {report.byCountry.slice(0, 6).map((c) => `${(c.country || "").toUpperCase()} ${n(c.clicks)}`).join(" · ")}</p>
          )}
        </>
      )}
    </section>
  );
};

const SearchPerformance = () => (
  <div className="space-y-4">
    <p className="font-body text-sm text-muted-foreground">What people searched before they clicked, last 28 days. Google's data trails by two days.</p>
    <Engine title="Google Search" load={() => gsc.query(28)} />
    <Engine title="Bing" load={() => bing.query(28)} />
  </div>
);

export default SearchPerformance;
