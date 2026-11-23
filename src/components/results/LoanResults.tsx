"use client";

import { useState } from "react";
import { Building2, FileText, Landmark, Layers, ListChecks, ShieldCheck } from "lucide-react";
import { buildLoanModel, eventLabel, releaseLabel } from "@/lib/exports";
import { formatDate, formatInr, portalDateToIso, titleCase } from "@/lib/format";
import { reasonText } from "@/lib/reasons";
import type { LoanCharge, LoanEvent, LoanResponse } from "@/lib/types";
import { ResultFrame } from "../ResultFrame";
import { Badge, Disclosure, PartialBanner, SectionTitle, VerifyNote } from "../ui";

function dateText(raw: string): string {
  const iso = portalDateToIso(raw);
  return iso ? formatDate(iso) : raw || "Date not available";
}

function EventBadge({ e }: { e: LoanEvent }) {
  return <Badge tone={e.instrumentClass === "charge_creation" ? "purple" : undefined}>{eventLabel(e)}</Badge>;
}

function StatusBadge({ e }: { e: LoanEvent }) {
  if (e.instrumentClass === "charge_creation") {
    return <Badge tone={e.releaseStatus === "released" ? "ok" : "warn"}>{releaseLabel(e)}</Badge>;
  }
  if (e.instrumentClass === "charge_release") {
    if (e.releasedMrNo) {
      return (
        <Badge tone={e.releasedChargeMatched ? "ok" : "warn"}>
          Releases MR {e.releasedMrNo}
          {e.releasedTransactionYear ? `/${e.releasedTransactionYear}` : ""}
          {e.releasedChargeMatched ? "" : " (unmatched)"}
        </Badge>
      );
    }
    return <Badge tone="warn">Charge not identified</Badge>;
  }
  return null;
}

function amountText(c: LoanCharge): string {
  if (c.amount !== null && c.amount !== undefined) return formatInr(c.amount);
  return c.amountRaw || "Amount not stated";
}

function bankText(c: LoanCharge): string {
  return c.bank ?? "Lender not stated in record";
}

export function LoanResults({ response }: { response: LoanResponse }) {
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const model = buildLoanModel(response);
  const events = response.loanHistory;

  const created = events.filter((e) => e.instrumentClass === "charge_creation");
  const released = created.filter((e) => e.releaseStatus === "released").length;
  const noRelease = created.filter((e) => e.releaseStatus === "unreleased_as_of_crawl").length;
  const needsVerification = events.filter((e) => e.sourceVerification.verificationRequired);
  const allCharges = events.flatMap((e) => e.charges);
  const withAmount = allCharges.filter((c) => c.amount !== null && c.amount !== undefined);
  const withoutAmount = allCharges.length - withAmount.length;
  const total = withAmount.reduce((s, c) => s + (c.amount as number), 0);

  const banks = new Map<string, { bank: string; raw: Set<string>; score: number | null; count: number }>();
  for (const c of allCharges) {
    if (!c.bank) continue;
    const b = banks.get(c.bank) ?? { bank: c.bank, raw: new Set<string>(), score: null, count: 0 };
    if (c.bankRaw) b.raw.add(c.bankRaw);
    if (c.bankNameMatchScore !== null && c.bankNameMatchScore !== undefined) {
      b.score = b.score === null ? c.bankNameMatchScore : Math.max(b.score, c.bankNameMatchScore);
    }
    b.count += 1;
    banks.set(c.bank, b);
  }

  const chargeRows = events.flatMap((e) => e.charges.map((c) => ({ e, c })));

  return (
    <ResultFrame service="loan" response={response} model={model}>
      {response.status === "partial" && (
        <PartialBanner>
          {response.previewsFailed} of {response.mutationsChecked} mutation entries could not be read, so the charges
          below may be incomplete.{" "}
          {response.failures.map((f) => `MR ${f.mrNo}: ${reasonText(f.reasonCode)}`).join(" | ")}
        </PartialBanner>
      )}

      <SectionTitle icon={<Layers size={16} />}>Financial Overview</SectionTitle>
      <div className="stat-grid">
        <div className="stat">
          <div className="n">{events.length}</div>
          <div className="l">Charge events</div>
        </div>
        <div className="stat">
          <div className="n">{created.length}</div>
          <div className="l">Charges created</div>
        </div>
        <div className="stat">
          <div className="n">{released}</div>
          <div className="l">Released</div>
        </div>
        <div className="stat">
          <div className="n">{noRelease}</div>
          <div className="l">No release found in mutation history</div>
          <div className="muted small loan-note">Not proof that a loan is outstanding.</div>
        </div>
        <div className="stat">
          <div className="n">{needsVerification.length}</div>
          <div className="l">Entries needing verification</div>
        </div>
        {withAmount.length > 0 && (
          <div className="stat">
            <div className="n" style={{ fontSize: 20 }}>{formatInr(total)}</div>
            <div className="l">Total of amounts stated</div>
            {withoutAmount > 0 && (
              <div className="muted small loan-note">
                {withoutAmount} charge{withoutAmount === 1 ? "" : "s"} {withoutAmount === 1 ? "has" : "have"} no stated
                amount and {withoutAmount === 1 ? "is" : "are"} not included.
              </div>
            )}
          </div>
        )}
      </div>

      <Disclosure defaultOpen icon={<Landmark size={16} />} title="Loan Details" badge={<Badge>{events.length}</Badge>}>
        <div className="stack" style={{ gap: 14 }}>
          <div className="tabs loan-toggle no-print" role="group" aria-label="Loan details view">
            <button className="tab" aria-pressed={view === "timeline"} onClick={() => setView("timeline")}>Timeline</button>
            <button className="tab" aria-pressed={view === "table"} onClick={() => setView("table")}>Table</button>
          </div>

          {view === "timeline" ? (
            <div className="timeline">
              {events.map((e) => (
                <div key={`${e.sequence}-${e.mrNo}`} className={`tl-item card flat ${e.instrumentClass === "charge_release" ? "release" : ""}`}>
                  <div className="spread">
                    <div className="row">
                      <strong>{dateText(e.approvedDateRaw)}</strong>
                      <span className="muted small">MR {e.mrNo}</span>
                    </div>
                    <div className="row">
                      <EventBadge e={e} />
                      <StatusBadge e={e} />
                      {e.sourceVerification.verificationRequired && <Badge tone="warn">Verify</Badge>}
                    </div>
                  </div>
                  {e.charges.length > 0 && (
                    <ul className="loan-charges">
                      {e.charges.map((c, i) => (
                        <li key={i}>
                          <span>{bankText(c)}</span> <strong>{amountText(c)}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>MR no.</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={`${e.sequence}-${e.mrNo}`}>
                      <td>{e.sequence}</td>
                      <td>{dateText(e.approvedDateRaw)}</td>
                      <td className="mono">{e.mrNo}</td>
                      <td><EventBadge e={e} /></td>
                      <td><StatusBadge e={e} /></td>
                      <td>
                        {e.sourceVerification.verificationRequired ? (
                          <Badge tone="warn">{reasonText(e.sourceVerification.reasonCode)}</Badge>
                        ) : (
                          <span className="muted">None needed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Disclosure>

      <Disclosure defaultOpen icon={<Building2 size={16} />} title="Charge Holder" badge={<Badge>{chargeRows.length}</Badge>}>
        {chargeRows.length === 0 ? (
          <p className="muted">No individual charges were extracted from these entries.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Event #</th>
                  <th>MR no.</th>
                  <th>Lender</th>
                  <th>As written in record</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {chargeRows.map(({ e, c }, i) => (
                  <tr key={i}>
                    <td>{e.sequence}</td>
                    <td className="mono">{e.mrNo}</td>
                    <td className={c.bank ? "" : "muted"} style={c.bank ? { fontWeight: 600 } : { fontStyle: "italic" }}>
                      {bankText(c)}
                    </td>
                    <td className="kn">{c.bankRaw || <span className="muted">Not available</span>}</td>
                    <td className={c.amount === null && !c.amountRaw ? "muted" : ""}>
                      {amountText(c)}
                      {c.amount !== null && c.amountRaw && <div className="muted small mono">{c.amountRaw}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Disclosure>

      <Disclosure icon={<ShieldCheck size={16} />} title="Encumbrance">
        <div className="stack" style={{ gap: 14 }}>
          {events.map((e) => (
            <div key={`${e.sequence}-${e.mrNo}`} className="card flat stack" style={{ gap: 8 }}>
              <div className="row">
                <strong>Event {e.sequence}</strong>
                <span className="muted small">MR {e.mrNo}</span>
                <EventBadge e={e} />
                {e.instrumentClass === "charge_release" && (
                  <>
                    {e.releasedMrNo ? (
                      <span>
                        Releases MR {e.releasedMrNo}
                        {e.releasedTransactionYear ? `/${e.releasedTransactionYear}` : ""}
                      </span>
                    ) : (
                      <span className="muted">No referenced charge identified</span>
                    )}
                    <Badge tone={e.releasedChargeMatched ? "ok" : "warn"}>
                      {e.releasedChargeMatched ? "Matched" : "Unmatched"}
                    </Badge>
                  </>
                )}
              </div>
              <div className="small">
                <span className="muted">Affected area: </span>
                {e.sourceVerification.areaCell ? <span className="kn">{e.sourceVerification.areaCell}</span> : <span className="muted">Not available</span>}
              </div>
              {e.priorMrRefs.length > 0 && (
                <div className="small">
                  <span className="muted">Referenced MRs: </span>
                  {e.priorMrRefs.join(", ")}
                </div>
              )}
              {e.sourceVerification.narrativeText && (
                <blockquote className="loan-quote kn">{e.sourceVerification.narrativeText}</blockquote>
              )}
            </div>
          ))}
        </div>
      </Disclosure>

      <Disclosure icon={<ListChecks size={16} />} title="Bank Information" badge={<Badge>{banks.size}</Badge>}>
        {banks.size === 0 ? (
          <p className="muted">No lender is named in the records for this hissa.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>As written in record</th>
                  <th>Charges</th>
                  <th>Name match score</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(banks.values()).map((b) => (
                  <tr key={b.bank}>
                    <td style={{ fontWeight: 600 }}>{titleCase(b.bank)}</td>
                    <td className="kn">{Array.from(b.raw).join(", ") || <span className="muted">Not available</span>}</td>
                    <td>{b.count}</td>
                    <td>{b.score === null ? <span className="muted">Not available</span> : b.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Disclosure>

      <Disclosure icon={<FileText size={16} />} title="Additional Financial Information">
        <div className="stack" style={{ gap: 14 }}>
          {events.map((e) => (
            <div key={`${e.sequence}-${e.mrNo}`} className="stack" style={{ gap: 8 }}>
              <div className="row">
                <strong>Event {e.sequence}</strong>
                <span className="muted small">MR {e.mrNo}</span>
              </div>
              {e.sourceVerification.verificationRequired && (
                <VerifyNote>
                  <strong>Verify before relying on this entry.</strong> {reasonText(e.sourceVerification.reasonCode)}
                </VerifyNote>
              )}
              {e.sourceVerification.rawSourceText ? (
                <pre className="raw kn">{e.sourceVerification.rawSourceText}</pre>
              ) : (
                <span className="muted small">No source text was captured for this entry.</span>
              )}
            </div>
          ))}
        </div>
      </Disclosure>
    </ResultFrame>
  );
}
