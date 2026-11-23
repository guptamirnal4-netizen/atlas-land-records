"use client";

import { useMemo, useState } from "react";
import { History, LayoutList, Table2 } from "lucide-react";
import { buildMutationModel } from "@/lib/exports";
import { CATEGORY_LABEL, categorizeMutation, formatDate, translateTerm, type MutationCategory } from "@/lib/format";
import type { MutationRecord, MutationResponse } from "@/lib/types";
import { ResultFrame } from "../ResultFrame";
import { Badge, KV, SectionTitle } from "../ui";

type Tab = "all" | "sale" | "inheritance" | "partition" | "other";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All entries" },
  { key: "sale", label: "Sale Deeds" },
  { key: "inheritance", label: "Inheritance" },
  { key: "partition", label: "Partition" },
  { key: "other", label: "Other legal changes" },
];

function tabOf(c: MutationCategory): Tab {
  return c === "sale" || c === "inheritance" || c === "partition" ? c : "other";
}

function dateLabel(m: MutationRecord): string {
  if (m.approvedDateIso) return formatDate(m.approvedDateIso);
  return m.approvedDate?.trim() || "Date not available";
}

function TermLabel({ kn }: { kn: string }) {
  const t = translateTerm(kn);
  if (!kn?.trim()) return <span className="muted">Not available</span>;
  if (!t.en) return <span className="kn">{kn}</span>;
  return (
    <span>
      {t.en} <span className="kn muted small">({kn})</span>
    </span>
  );
}

function badgeTone(c: MutationCategory) {
  if (c === "sale") return "green" as const;
  if (c === "mortgage" || c === "court") return "warn" as const;
  if (c === "release") return undefined;
  return "accent" as const;
}

export function MutationResults({ response }: { response: MutationResponse }) {
  const [tab, setTab] = useState<Tab>("all");
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const model = buildMutationModel(response);

  const records = useMemo(
    () => response.records.map((m) => ({ m, cat: categorizeMutation(m.acquisitionType, m.mutationType) })),
    [response.records],
  );
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: records.length, sale: 0, inheritance: 0, partition: 0, other: 0 };
    records.forEach((r) => (c[tabOf(r.cat)] += 1));
    return c;
  }, [records]);
  const activeTab = counts[tab] === 0 ? "all" : tab;
  const shown = activeTab === "all" ? records : records.filter((r) => tabOf(r.cat) === activeTab);

  const dates = response.records.map((m) => m.approvedDateIso).filter((d): d is string => !!d).sort();
  const span = dates.length
    ? dates[0] === dates[dates.length - 1]
      ? formatDate(dates[0])
      : `${formatDate(dates[0])} to ${formatDate(dates[dates.length - 1])}`
    : null;
  const total = response.totalOnPortalForSurvey;
  const filtered = typeof total === "number" && total !== response.count;

  return (
    <ResultFrame service="mutation" response={response} model={model}>
      <div className="stat-grid">
        <div className="stat">
          <div className="n">{response.count}</div>
          <div className="l">Mutation {response.count === 1 ? "entry" : "entries"} shown</div>
        </div>
        <div className="stat">
          <div className="n" style={{ fontSize: 16 }}>{span ?? "Not available"}</div>
          <div className="l">Approved-date span</div>
        </div>
        {filtered && (
          <div className="stat">
            <div className="n">{response.count} of {total}</div>
            <div className="l">On the portal for this survey</div>
            <div className="muted small" style={{ marginTop: 4 }}>
              A hissa or year filter was applied, so the other entries are hidden.
            </div>
          </div>
        )}
      </div>

      <div className="card stack">
        <div className="spread no-print">
          <SectionTitle icon={<History size={16} />} count={shown.length}>Legal History</SectionTitle>
          <div className="tabs" role="group" aria-label="View">
            <button className="tab" aria-pressed={view === "timeline"} onClick={() => setView("timeline")}>
              <LayoutList size={13} style={{ verticalAlign: -2 }} /> Timeline
            </button>
            <button className="tab" aria-pressed={view === "table"} onClick={() => setView("table")}>
              <Table2 size={13} style={{ verticalAlign: -2 }} /> Table
            </button>
          </div>
        </div>

        <div className="tabs no-print" role="group" aria-label="Filter by type of change">
          {TABS.filter((t) => t.key === "all" || counts[t.key] > 0).map((t) => (
            <button key={t.key} className="tab" aria-pressed={activeTab === t.key} onClick={() => setTab(t.key)}>
              {t.label}<span className="n">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No entries in this category.</p>
        ) : view === "timeline" ? (
          <ol className="timeline" style={{ listStyle: "none", margin: 0 }}>
            {shown.map(({ m, cat }, i) => (
              <li key={`${m.mrNo}-${m.transactionNo}-${m.surveyNo}-${i}`} className={`tl-item ${cat === "release" ? "release" : ""}`}>
                <div className="card flat stack" style={{ gap: 10, padding: 16 }}>
                  <div className="spread">
                    <strong>{dateLabel(m)}</strong>
                    <Badge tone={badgeTone(cat)}>{CATEGORY_LABEL[cat]}</Badge>
                  </div>
                  <div className="kv-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    <KV label="Acquisition type" value={<TermLabel kn={m.acquisitionType} />} />
                    <KV label="Mutation type" value={<TermLabel kn={m.mutationType} />} />
                  </div>
                  <div className="kv-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                    <KV label="MR no." value={m.mrNo} mono />
                    <KV label="Transaction no." value={m.transactionNo} mono />
                    <KV label="Transaction year" value={m.transactionYear} />
                    <KV label="Survey no." value={m.surveyNo} mono />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Survey no.</th>
                  <th>MR no.</th>
                  <th>Transaction</th>
                  <th>Acquisition type</th>
                  <th>Mutation type</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ m, cat }, i) => (
                  <tr key={`${m.mrNo}-${m.transactionNo}-${m.surveyNo}-${i}`}>
                    <td>{dateLabel(m)}</td>
                    <td className="mono">{m.surveyNo}</td>
                    <td className="mono">{m.mrNo}</td>
                    <td>{m.transactionNo} <span className="muted small">({m.transactionYear})</span></td>
                    <td><TermLabel kn={m.acquisitionType} /></td>
                    <td><TermLabel kn={m.mutationType} /></td>
                    <td><Badge tone={badgeTone(cat)}>{CATEGORY_LABEL[cat]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="muted small">
        The portal&apos;s mutation list does not include the parties to each transaction, so none are shown. English
        labels are given only for terms with an established meaning; other terms appear in the original Kannada.
      </p>
    </ResultFrame>
  );
}
