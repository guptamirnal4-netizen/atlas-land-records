"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { titleCase } from "@/lib/format";
import { Badge, ErrorBanner, Spinner } from "./ui";

interface District { district: string; rtc_rate: number; mutation_rate: number; overall: number; status: "ok" | "degraded" | "fail"; fetches: number }
interface CostDay { day: string; proxy: number; captcha: number; compute: number }
interface UptimeDay { day: string; uptime: number }
interface Failure { time: string; district: string; service: string; reason: string; cost: number | string }
interface Data { districts: District[]; cost: CostDay[]; reliability: UptimeDay[]; failures: Failure[] }

type Tab = "districts" | "services" | "cost" | "reliability";
const TABS: { id: Tab; label: string }[] = [
  { id: "districts", label: "District Ledger" },
  { id: "services", label: "RTC / Mutation" },
  { id: "cost", label: "Fetch Cost" },
  { id: "reliability", label: "Portal Reliability" },
];

const NODATA = { label: "No data", tone: undefined, color: "var(--muted)" } as const;
const STATUS: Record<District["status"], { label: string; tone: "ok" | "warn" | "danger"; color: string }> = {
  ok: { label: "Cleared", tone: "ok", color: "var(--green)" },
  degraded: { label: "Partial", tone: "warn", color: "var(--warn)" },
  fail: { label: "Rejected", tone: "danger", color: "var(--danger)" },
};
const rateColor = (v: number) => (v < 70 ? "var(--danger)" : v < 88 ? "var(--warn)" : "var(--green)");

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api/monitor/${path}`, { cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(body?.error?.detail ?? `HTTP ${res.status}`), { code: body?.error?.reasonCode ?? "BACKEND_ERROR" });
  return body as T;
}

const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 10, fontSize: 12, color: "var(--text)" };
const tick = { fontSize: 11, fill: "var(--muted)" };

export function Monitor() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<{ code: string; detail: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("districts");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [districts, cost, reliability, failures] = await Promise.all([
        get<District[]>("districts?days=1"),
        get<CostDay[]>("cost?days=14"),
        get<UptimeDay[]>("reliability?days=30"),
        get<Failure[]>("failures/recent?limit=8"),
      ]);
      setData({ districts, cost, reliability, failures });
      setUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      const err = e as Error & { code?: string };
      setError({ code: err.code ?? "BACKEND_ERROR", detail: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    if (!data) return null;
    const d = data.districts;
    // A district with no recorded fetches has no success rate - it is "no data", not "failing".
    const withData = d.filter((x) => x.fetches > 0);
    const count = (s: District["status"]) => withData.filter((x) => x.status === s).length;
    const avg = (k: "rtc_rate" | "mutation_rate") =>
      withData.length ? Math.round(withData.reduce((a, x) => a + x[k], 0) / withData.length) : null;
    const today = data.cost.at(-1);
    const todayTotal = today ? today.proxy + today.captcha + today.compute : null;
    const fetches = d.reduce((a, x) => a + x.fetches, 0);
    return {
      ok: count("ok"), degraded: count("degraded"), fail: count("fail"), noData: d.length - withData.length,
      withData,
      avgRtc: avg("rtc_rate"), avgMut: avg("mutation_rate"),
      uptime: data.reliability.length ? data.reliability[data.reliability.length - 1].uptime : null,
      today, todayTotal, fetches,
      perFetch: todayTotal !== null && fetches > 0 ? todayTotal / fetches : null,
    };
  }, [data]);

  return (
    <div className="stack" style={{ gap: 20 }} data-service="rtc">
      <div className="page-head">
        <div className="page-icon"><Activity size={22} /></div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Bhoomi Monitor</h1>
          <p className="muted" style={{ margin: "2px 0 0" }}>
            Health of the scraping pipeline across Karnataka&apos;s districts: success rates, cost and portal reliability.
          </p>
        </div>
        <button className="btn" onClick={() => void load()} disabled={loading}>
          {loading ? <Spinner /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>

      {error && <ErrorBanner response={{ status: "error", error: { reasonCode: error.code, detail: error.detail }, fetchedAt: "" }} onRetry={() => void load()} />}
      {loading && !data && <div className="card"><div className="skeleton" style={{ height: 120 }} /></div>}

      {data && stats && (
        <>
          <div className="stat-grid">
            <div className="stat"><div className="n" style={{ color: stats.uptime !== null && stats.uptime > 88 ? "var(--green)" : "var(--warn)" }}>{stats.uptime !== null ? `${stats.uptime}%` : "-"}</div><div className="l">Portal uptime (latest day)</div></div>
            <div className="stat"><div className="n">{stats.todayTotal !== null ? `₹${stats.todayTotal}` : "-"}</div><div className="l">Cost (latest day)</div></div>
            <div className="stat"><div className="n">{stats.fetches.toLocaleString("en-IN")}</div><div className="l">Fetches (last day)</div></div>
            {(["ok", "degraded", "fail"] as const).map((s) => (
              <div className="stat" key={s}><div className="n" style={{ color: STATUS[s].color }}>{s === "ok" ? stats.ok : s === "degraded" ? stats.degraded : stats.fail}</div><div className="l">{STATUS[s].label} districts</div></div>
            ))}
            <div className="stat"><div className="n" style={{ color: "var(--muted)" }}>{stats.noData}</div><div className="l">No data districts</div></div>
          </div>
          {stats.fetches === 0 && (
            <div className="banner info" role="status">
              <Activity size={18} />
              <div className="banner-body">
                <h4>No fetch events in the last day</h4>
                <p>The monitor only shows recorded activity, so districts without recent fetches appear as &quot;No data&quot; rather than failing. Figures fill in as the scraper logs fetches.</p>
              </div>
            </div>
          )}
          <span className="muted small">Live from the monitoring backend{updated ? `, updated ${updated}` : ""}. Figures come only from recorded fetch events.</span>

          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" className="tab" aria-pressed={tab === t.id} aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {tab === "districts" && (
            <div className="card stack">
              <span className="muted small">Each tile is one district&apos;s status for the last day, worst first.</span>
              {data.districts.length === 0 ? <p className="muted">No districts returned by the backend.</p> : (
                <div className="kv-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
                  {data.districts.map((d) => (
                    <div key={d.district} className="stat" tabIndex={0}>
                      <div className="spread" style={{ marginBottom: 6 }}>
                        <strong>{titleCase(d.district)}</strong>
                        <Badge tone={d.fetches > 0 ? STATUS[d.status].tone : NODATA.tone}>{d.fetches > 0 ? STATUS[d.status].label : NODATA.label}</Badge>
                      </div>
                      <div className="row mono small muted" style={{ justifyContent: "space-between" }}>
                        {d.fetches > 0 ? (<><span>RTC {d.rtc_rate}%</span><span>Mut {d.mutation_rate}%</span><span>{d.fetches} fetches</span></>) : <span>No fetches recorded</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "services" && (
            <div className="stack">
              <div className="service-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
                {([["rtc_rate", "RTC fetch success", stats.avgRtc], ["mutation_rate", "Mutation fetch success", stats.avgMut]] as const).map(([key, title, avg]) => (
                  <div className="card stack" key={key}>
                    <div><h3 className="section-title">{title}</h3><span className="muted small">Average across districts: <strong>{avg ?? "-"}%</strong> (12 lowest shown)</span></div>
                    {stats.withData.length === 0 ? <p className="muted">No fetches recorded in the last day.</p> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.withData.slice(0, 12).map((d) => ({ ...d, name: titleCase(d.district) }))} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid stroke="var(--border)" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={tick} />
                        <YAxis type="category" dataKey="name" width={110} tick={tick} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
                        <Bar dataKey={key} name={title} radius={[0, 4, 4, 0]}>
                          {stats.withData.slice(0, 12).map((d) => <Cell key={d.district} fill={rateColor(d[key])} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>)}
                  </div>
                ))}
              </div>
              <div className="card stack">
                <div><h3 className="section-title">Latest recorded failures</h3><span className="muted small">The backend reports time of day only, so these may not be from today.</span></div>
                {data.failures.length === 0 ? <p className="muted">No failures recorded recently.</p> : (
                  <div className="table-wrap"><table className="data"><thead><tr><th>Time</th><th>District</th><th>Service</th><th>Reason</th><th style={{ textAlign: "right" }}>Cost</th></tr></thead>
                    <tbody>{data.failures.map((f, i) => (
                      <tr key={i}><td className="mono">{f.time}</td><td>{titleCase(f.district)}</td><td>{f.service}</td><td className="muted">{f.reason}</td><td className="mono" style={{ textAlign: "right" }}>₹{f.cost}</td></tr>
                    ))}</tbody></table></div>
                )}
              </div>
            </div>
          )}

          {tab === "cost" && (
            <div className="stack">
              <div className="stat-grid">
                {([["Proxy", stats.today?.proxy], ["CAPTCHA solve", stats.today?.captcha], ["Compute", stats.today?.compute]] as const).map(([l, v]) => (
                  <div className="stat" key={l}><div className="n">{v !== undefined ? `₹${v}` : "-"}</div><div className="l">{l} (latest day)</div></div>
                ))}
                <div className="stat"><div className="n">{stats.perFetch !== null ? `₹${stats.perFetch.toFixed(2)}` : "n/a"}</div><div className="l">Cost per fetch (latest day)</div></div>
              </div>
              <div className="card stack">
                <h3 className="section-title">Daily cost breakdown, last 14 days</h3>
                {data.cost.length === 0 ? <p className="muted">No cost recorded in the last 14 days.</p> : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.cost}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={tick} /><YAxis tick={tick} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
                    <Bar dataKey="proxy" stackId="c" fill="var(--blue)" name="Proxy" />
                    <Bar dataKey="captcha" stackId="c" fill="var(--warn)" name="CAPTCHA solve" />
                    <Bar dataKey="compute" stackId="c" fill="var(--purple)" name="Compute" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>)}
              </div>
            </div>
          )}

          {tab === "reliability" && (
            <div className="card stack">
              <div><h3 className="section-title">Portal uptime, last 30 days</h3><span className="muted small">Share of fetch attempts (any district, any service) that returned valid data without retry.</span></div>
              {data.reliability.length === 0 ? <p className="muted">No fetch events in the last 30 days, so there is no uptime to chart.</p> : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={data.reliability}>
                  <defs><linearGradient id="upt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--blue)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--blue)" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={tick} interval={2} /><YAxis domain={[70, 100]} tick={tick} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="uptime" stroke="var(--blue)" strokeWidth={2} fill="url(#upt)" name="Uptime %" />
                </AreaChart>
              </ResponsiveContainer>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
