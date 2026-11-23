"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, FileText, History, Info, Trash2 } from "lucide-react";
import { buildQueryString } from "@/lib/client-api";
import { formatDateTime, titleCase } from "@/lib/format";
import { SERVICES, SERVICE_ORDER } from "@/lib/services";
import { useAtlas } from "@/lib/store";
import type { Status } from "@/lib/types";
import { SERVICE_ICON } from "./Shell";
import { Badge } from "./ui";

const STEPS = [
  { t: "Choose Service", d: "Pick Trial Centre, Mutation or Loan." },
  { t: "Fill Search Details", d: "District, Taluk, Hobli, Village, Survey Number and Hissa." },
  { t: "Click Fetch", d: "Atlas reads the live government portal for you." },
  { t: "View Results", d: "Records are shown in a structured, easy to read layout." },
  { t: "Download / Export", d: "Save as PDF, Excel or CSV, or print the report." },
];

const STATUS_TONE: Record<Status, "ok" | "warn" | "accent" | "danger"> = {
  ok: "ok",
  partial: "warn",
  no_records: "accent",
  error: "danger",
};
const STATUS_LABEL: Record<Status, string> = { ok: "Success", partial: "Partial", no_records: "No records", error: "Failed" };

export function Home() {
  const { history, clearHistory, ready } = useAtlas();

  return (
    <div className="stack" style={{ gap: 26 }}>
      <div>
        <h1 className="page-title">ATLAS - Land Records</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>Land Records &amp; Property Intelligence</p>
      </div>

      <div className="service-grid">
        {SERVICE_ORDER.map((k) => {
          const s = SERVICES[k];
          const Icon = SERVICE_ICON[k];
          return (
            <div key={k} data-service={k} className="home-card-wrap">
              <Link href={s.summaryPath} className="card hoverable home-service">
                <div className="page-icon"><Icon size={22} /></div>
                <div className="stack" style={{ gap: 6 }}>
                  <h2 style={{ fontSize: 17, color: "var(--accent-ink)" }}>{s.title}</h2>
                  <strong style={{ fontSize: 13 }}>{s.subtitle}</strong>
                  <span className="muted">{s.description}</span>
                </div>
                <div className="row">
                  {s.chips.map((c) => (
                    <span key={c} className="badge accent">{c}</span>
                  ))}
                </div>
                <span className="home-open row">Open {s.navLabel} <ArrowRight size={15} /></span>
              </Link>
            </div>
          );
        })}
      </div>

      <section className="stack" aria-labelledby="journey-h">
        <h2 id="journey-h" style={{ fontSize: 18, textAlign: "center" }}>User Journey (All Services)</h2>
        <div className="journey">
          {STEPS.map((s, i) => (
            <div key={s.t} className="step">
              <div className="num">{i + 1}</div>
              <strong>{s.t}</strong>
              <p className="muted small" style={{ margin: "4px 0 0" }}>{s.d}</p>
            </div>
          ))}
        </div>
        <div className="banner info">
          <Info size={20} />
          <div className="banner-body">
            <h4>Important Note</h4>
            <p>
              Ensure the survey number is correct for accurate and comprehensive results. Some records may be
              available for selected years only.
            </p>
          </div>
        </div>
      </section>

      <div className="home-two">
        <section className="card stack" aria-labelledby="recent-h">
          <div className="spread">
            <h2 id="recent-h" className="section-title"><History size={16} /> Recent searches</h2>
            {ready && history.length > 0 && (
              <button className="btn sm ghost" onClick={clearHistory}><Trash2 size={13} /> Clear history</button>
            )}
          </div>
          {!ready ? (
            <div className="skeleton" style={{ height: 60 }} />
          ) : history.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No searches yet. Choose a service above and your searches will appear here.
            </p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {history.slice(0, 8).map((e) => {
                const Icon = SERVICE_ICON[e.service];
                return (
                  <div key={e.id} className="home-hist" data-service={e.service}>
                    <div className="page-icon" style={{ width: 34, height: 34 }}><Icon size={16} /></div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <strong>{SERVICES[e.service].navLabel}</strong>
                        <Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                      </div>
                      <div className="small">
                        {titleCase(e.query.village)}, Survey {e.query.survey_number}
                        {e.query.hissa_no ? ` / Hissa ${e.query.hissa_no}` : ""}
                        <span className="muted"> - {e.summary}</span>
                      </div>
                      <div className="muted small">{formatDateTime(e.at)}</div>
                    </div>
                    <Link
                      className="btn sm"
                      href={`${SERVICES[e.service].summaryPath}?${buildQueryString({ ...e.query, autorun: 1 })}`}
                    >
                      Re-run
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
          <p className="muted small" style={{ margin: 0 }}>
            History is stored only in this browser. Re-running a search fetches fresh data from the portal; past
            results themselves are not saved.
          </p>
        </section>

        <div className="stack">
          <Link href="/report" className="card hoverable home-link">
            <FileText size={20} />
            <div>
              <strong>Property Report</strong>
              <p className="muted small" style={{ margin: "2px 0 0" }}>
                Combine ownership, legal history and financial charges for one property.
              </p>
            </div>
            <ArrowRight size={16} />
          </Link>
          <Link href="/docs" className="card hoverable home-link">
            <BookOpen size={20} />
            <div>
              <strong>API Documentation</strong>
              <p className="muted small" style={{ margin: "2px 0 0" }}>
                Parameters, response formats and error handling for every service.
              </p>
            </div>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
