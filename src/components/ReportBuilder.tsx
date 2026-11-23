"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Clock, FileText, Loader2 } from "lucide-react";
import { buildModel, mergeModels, SOURCE_NOTE, type ExportModel } from "@/lib/exports";
import { formatDateTime } from "@/lib/format";
import { SERVICES, SERVICE_ORDER } from "@/lib/services";
import { formToQuery, useAtlas } from "@/lib/store";
import type { AnyResponse, LoanResponse, MutationResponse, PropertyQuery, RtcResponse, ServiceKey } from "@/lib/types";
import { ExportMenu, EmbeddedContext, PropertyOverview } from "./ResultFrame";
import { SERVICE_ICON } from "./Shell";
import { SearchForm } from "./SearchForm";
import { Badge, ErrorBanner, NoRecordsBanner, RawResponse } from "./ui";
import { LoanResults } from "./results/LoanResults";
import { MutationResults } from "./results/MutationResults";
import { RtcResults } from "./results/RtcResults";

const SECTION_TITLE: Record<ServiceKey, string> = {
  rtc: "Ownership (RTC)",
  mutation: "Legal History (Mutation)",
  loan: "Financial Charges (Loan)",
};

const KEYS = ["district", "taluk", "hobli", "village", "survey_number", "hissa_no", "from_year", "to_year"] as const;
const sameQuery = (a: PropertyQuery, b: PropertyQuery) => KEYS.every((k) => String(a[k] ?? "") === String(b[k] ?? ""));

type Progress = "pending" | "running" | "done";

function Section({ service, response, onRetry }: { service: ServiceKey; response: AnyResponse; onRetry: () => void }) {
  const Icon = SERVICE_ICON[service];
  let body: React.ReactNode;
  if (response.status === "error") body = <ErrorBanner response={response} onRetry={onRetry} />;
  else if (response.status === "no_records") {
    body = <NoRecordsBanner what={SERVICES[service].populates.toLowerCase()} ambiguous={response.ambiguous} onRetry={onRetry} />;
  } else if (service === "rtc") body = <RtcResults response={response as RtcResponse} />;
  else if (service === "mutation") body = <MutationResults response={response as MutationResponse} />;
  else body = <LoanResults response={response as LoanResponse} />;

  return (
    <section className="stack" data-service={service} style={{ gap: 14, breakBefore: "auto" }}>
      <div className="row" style={{ borderBottom: "2px solid var(--accent)", paddingBottom: 8 }}>
        <span className="page-icon" style={{ width: 34, height: 34 }}><Icon size={18} /></span>
        <h2 style={{ fontSize: 18 }}>{SECTION_TITLE[service]}</h2>
      </div>
      <EmbeddedContext.Provider value>{body}</EmbeddedContext.Provider>
    </section>
  );
}

export function ReportBuilder() {
  const { form, results, run } = useAtlas();
  const [selected, setSelected] = useState<ServiceKey[]>(["rtc", "mutation"]);
  const [reuse, setReuse] = useState(true);
  const [progress, setProgress] = useState<Partial<Record<ServiceKey, Progress>>>({});
  const [report, setReport] = useState<{ query: PropertyQuery; services: ServiceKey[]; at: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (k: ServiceKey) =>
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : SERVICE_ORDER.filter((o) => o === k || s.includes(o))));

  const generate = async (query: PropertyQuery) => {
    if (busy || selected.length === 0) return;
    setBusy(true);
    setReport(null);
    setProgress(Object.fromEntries(selected.map((k) => [k, "pending"])));
    const fetched: ServiceKey[] = [];
    for (const k of selected) {
      const q: PropertyQuery = { ...query };
      if (k !== "mutation") { delete q.from_year; delete q.to_year; }
      if (k === "rtc" && !SERVICES.rtc.hissaRequired && !query.hissa_no) delete q.hissa_no;
      const existing = results[k];
      if (reuse && existing && existing.response.status !== "error" && sameQuery(existing.response.query, q)) {
        setProgress((p) => ({ ...p, [k]: "done" }));
        fetched.push(k);
        continue;
      }
      setProgress((p) => ({ ...p, [k]: "running" }));
      await run(k, q);
      setProgress((p) => ({ ...p, [k]: "done" }));
      fetched.push(k);
    }
    setReport({ query, services: fetched, at: new Date().toISOString() });
    setBusy(false);
  };

  const liveQuery = useMemo(() => (report ? report.query : formToQuery(form)), [report, form]);
  const entries = report
    ? report.services.map((k) => ({ k, stored: results[k] })).filter((e): e is { k: ServiceKey; stored: NonNullable<typeof e.stored> } => !!e.stored)
    : [];

  const exportModel: ExportModel | null = useMemo(() => {
    if (!report || entries.length === 0) return null;
    const usable = entries
      .filter((e) => e.stored.response.status === "ok" || e.stored.response.status === "partial")
      .map((e) => ({ label: SERVICES[e.k].navLabel, model: buildModel(e.k, e.stored.response as never) }));
    const merged = mergeModels(report.query, report.at, usable);
    for (const e of entries) {
      const st = e.stored.response.status;
      const note = st === "error" ? `Not retrieved: ${e.stored.response.error?.reasonCode}` : st === "no_records" ? "No records found" : st === "partial" ? "Partially retrieved" : "Retrieved";
      merged.meta.splice(merged.meta.length - 1, 0, [SECTION_TITLE[e.k], note]);
    }
    return merged;
  }, [report, entries]);

  const glance = entries.map((e) => {
    const r = e.stored.response;
    let text = "";
    if (r.status === "error") text = "Could not be retrieved";
    else if (r.status === "no_records") text = "No records found";
    else if (e.k === "rtc") text = `${(r as RtcResponse).results.filter((x) => x.currentStatus).length} hissa record(s)`;
    else if (e.k === "mutation") text = `${(r as MutationResponse).count} mutation entr${(r as MutationResponse).count === 1 ? "y" : "ies"}`;
    else text = `${(r as LoanResponse).loanHistory.length} charge event(s)`;
    return { k: e.k, status: r.status, text };
  });

  const selector = (
    <fieldset style={{ border: 0, padding: 0, margin: "18px 0 0" }}>
      <legend className="label" style={{ fontSize: 12, fontWeight: 650, marginBottom: 8, padding: 0 }}>
        Include in the report <span className="muted" style={{ fontWeight: 500 }}>(only the services you tick are fetched)</span>
      </legend>
      <div className="service-grid">
        {SERVICE_ORDER.map((k) => {
          const s = SERVICES[k];
          const Icon = SERVICE_ICON[k];
          const on = selected.includes(k);
          return (
            <label key={k} data-service={k} className="card flat" style={{ cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start", padding: 14, borderColor: on ? "var(--accent)" : undefined, background: on ? "var(--accent-soft)" : undefined }}>
              <input type="checkbox" checked={on} onChange={() => toggle(k)} style={{ marginTop: 3, accentColor: "var(--accent)" }} />
              <span className="stack" style={{ gap: 2 }}>
                <strong className="row" style={{ gap: 6 }}><Icon size={15} /> {s.navLabel}</strong>
                <span className="muted small">{s.populates}{s.hissaRequired ? " (hissa required)" : ""}</span>
              </span>
            </label>
          );
        })}
      </div>
      <label className="row small" style={{ marginTop: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={reuse} onChange={(e) => setReuse(e.target.checked)} />
        Reuse results already fetched in this session for the same property (avoids repeat portal requests)
      </label>
    </fieldset>
  );

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div className="page-icon" style={{ background: "var(--blue-soft)", color: "var(--blue-ink)" }}><FileText size={22} /></div>
        <div>
          <h1 className="page-title">Property Report</h1>
          <p className="muted" style={{ margin: "2px 0 0" }}>
            One consolidated report of ownership, legal history and financial charges for a single property.
          </p>
        </div>
      </div>

      <SearchForm
        services={selected.length ? selected : ["rtc"]}
        loading={busy}
        onSubmit={(q) => void generate(q)}
        submitLabel="Generate Report"
        busyLabel="Generating..."
        hint={selected.length === 0 ? "Select at least one service to include." : `Will fetch: ${selected.map((k) => SERVICES[k].navLabel).join(", ")}.`}
        extra={selector}
      />

      {busy && (
        <div className="card stack fade-in" role="status" aria-live="polite">
          <strong>Building your report...</strong>
          {selected.map((k) => (
            <div key={k} className="row" data-service={k}>
              {progress[k] === "done" ? <CheckCircle2 size={16} color="var(--green)" /> : progress[k] === "running" ? <Loader2 size={16} className="spinner" style={{ border: 0, animation: "spin 1s linear infinite" }} /> : <Clock size={16} className="muted" />}
              <span>{SECTION_TITLE[k]}</span>
              <span className="muted small">{progress[k] === "running" ? "fetching from the portal..." : progress[k] === "done" ? "done" : "waiting"}</span>
            </div>
          ))}
          <span className="muted small">Services are fetched one at a time to avoid overloading the government portal.</span>
        </div>
      )}

      {!busy && report && (
        <div className="stack fade-in print-area" style={{ gap: 22 }}>
          <div className="print-only" style={{ borderBottom: "2px solid #111", paddingBottom: 8 }}>
            <div style={{ fontWeight: 800, letterSpacing: "0.05em", fontSize: 16 }}>ATLAS - Land Records</div>
            <div style={{ fontSize: 15, fontWeight: 650 }}>Property Report</div>
            <div className="small">Retrieved {formatDateTime(report.at)}</div>
          </div>

          <div className="spread no-print">
            <div>
              <h2 style={{ fontSize: 18 }}>Report ready</h2>
              <span className="muted small">Generated {formatDateTime(report.at)} from the live government portal</span>
            </div>
            {exportModel && exportModel.sections.length > 0 ? (
              <ExportMenu model={exportModel} label="Export report" />
            ) : (
              <Badge tone="warn"><CircleAlert size={13} /> Nothing to export</Badge>
            )}
          </div>

          <PropertyOverview query={liveQuery} />

          <div className="stat-grid">
            {glance.map((g) => (
              <div key={g.k} className="stat" data-service={g.k} style={{ borderLeft: "3px solid var(--accent)" }}>
                <div className="l">{SECTION_TITLE[g.k]}</div>
                <div className="n" style={{ fontSize: 17, marginTop: 4 }}>{g.text}</div>
                <Badge tone={g.status === "ok" ? "ok" : g.status === "partial" ? "warn" : g.status === "error" ? "danger" : "accent"}>
                  {g.status === "no_records" ? "no records" : g.status}
                </Badge>
              </div>
            ))}
          </div>

          {entries.map((e) => (
            <Section key={e.k} service={e.k} response={e.stored.response} onRetry={() => void run(e.k, e.stored.response.query)} />
          ))}

          <div className="no-print stack" style={{ gap: 8 }}>
            {entries.map((e) => (
              <RawResponse key={e.k} data={e.stored.response} />
            ))}
          </div>
          <p className="muted small print-only">{SOURCE_NOTE}</p>
        </div>
      )}
    </div>
  );
}
