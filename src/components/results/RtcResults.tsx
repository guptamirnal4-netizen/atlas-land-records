"use client";

import { BadgeCheck, Layers, Map, ShieldAlert, Users } from "lucide-react";
import { buildRtcModel } from "@/lib/exports";
import { formatExtent, parseExtent, titleCase } from "@/lib/format";
import { reasonText } from "@/lib/reasons";
import type { RtcHissaResult, RtcResponse } from "@/lib/types";
import { ResultFrame } from "../ResultFrame";
import { Badge, Disclosure, KV, PartialBanner, SectionTitle, VerifyNote } from "../ui";

function YesNo({ value }: { value: string | null | undefined }) {
  const v = (value ?? "").trim();
  if (!v) return <span className="muted">Not available</span>;
  return <Badge tone={/^yes$/i.test(v) ? "warn" : undefined}>{v}</Badge>;
}

function HissaCard({ h }: { h: RtcHissaResult }) {
  const c = h.currentStatus!;
  const verified = /verified/i.test(c.verification?.status ?? "");
  return (
    <div className="card stack" style={{ gap: 18 }}>
      <div className="spread">
        <div className="row">
          <h3 style={{ fontSize: 17 }}>Hissa {h.hissa_no ?? c.details.hissa_no ?? ""}</h3>
          {c.land_id && <Badge tone="accent">Land ID {c.land_id}</Badge>}
        </div>
        <div className="row">
          {c.verification && (
            <Badge tone={verified ? "ok" : "warn"}>
              <BadgeCheck size={13} /> {verified ? "Verified by portal" : c.verification.status}
            </Badge>
          )}
          {c.ongoing_mutation && /^yes$/i.test(c.ongoing_mutation) && <Badge tone="warn">Mutation in progress</Badge>}
        </div>
      </div>

      {h.statusVerification.verificationRequired && (
        <VerifyNote>
          <strong>Verify before relying on this record.</strong> {reasonText(h.statusVerification.reasonCode)}{" "}
          {h.statusVerification.detail}
        </VerifyNote>
      )}

      <div className="stat-grid">
        <div className="stat">
          <div className="n">{c.owners.length}</div>
          <div className="l">{c.owners.length === 1 ? "Current owner" : "Current owners"}</div>
        </div>
        {c.owners.length === 1 && (
          <div className="stat">
            <div className="n" style={{ fontSize: 18 }}>{formatExtent(c.owners[0].extent)}</div>
            <div className="l">Land area (acres, guntas, anas)</div>
          </div>
        )}
        <div className="stat">
          <div className="n" style={{ fontSize: 18 }}>{c.ongoing_mutation ?? "Not available"}</div>
          <div className="l">Ongoing mutation</div>
        </div>
      </div>

      <Disclosure defaultOpen icon={<Users size={16} />} title="Current Owner" badge={<Badge>{c.owners.length}</Badge>}>
        {c.owners.length === 0 ? (
          <p className="muted">The portal listed no owners for this hissa.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Extent</th>
                  <th>Category</th>
                  <th>Govt restriction</th>
                  <th>Court stay</th>
                  <th>Alienated</th>
                </tr>
              </thead>
              <tbody>
                {c.owners.map((o, i) => (
                  <tr key={i}>
                    <td className="kn" style={{ fontWeight: 600 }}>{o.name || <span className="muted">Not available</span>}</td>
                    <td>
                      {formatExtent(o.extent)}
                      {parseExtent(o.extent) && <div className="muted small mono">{o.extent}</div>}
                    </td>
                    <td>{o.owner_category ? titleCase(o.owner_category) : <span className="muted">Not available</span>}</td>
                    <td><YesNo value={o.gov_restriction} /></td>
                    <td><YesNo value={o.court_stay} /></td>
                    <td><YesNo value={o.alienated} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {c.owners.length > 1 && (
          <p className="muted small" style={{ marginBottom: 0 }}>
            Extents are shown as listed for each owner; Atlas does not add them together.
          </p>
        )}
      </Disclosure>

      <Disclosure defaultOpen icon={<ShieldAlert size={16} />} title="Restrictions & Flags">
        <div className="kv-grid">
          <KV label="Ongoing mutation" value={<YesNo value={c.ongoing_mutation} />} />
          <KV label="PYKI" value={<YesNo value={c.pyki} />} />
          <KV
            label="Any govt restriction"
            value={c.owners.length ? <YesNo value={c.owners.some((o) => /^yes$/i.test(o.gov_restriction)) ? "Yes" : "No"} /> : null}
          />
          <KV
            label="Any court stay"
            value={c.owners.length ? <YesNo value={c.owners.some((o) => /^yes$/i.test(o.court_stay)) ? "Yes" : "No"} /> : null}
          />
        </div>
      </Disclosure>

      <Disclosure icon={<Map size={16} />} title="RTC Details & Survey Information">
        <div className="kv-grid">
          <KV label="Land ID" value={c.land_id} mono />
          <KV label="Village" value={c.details.village ? titleCase(c.details.village) : null} />
          <KV label="Survey number" value={c.details.survey_number} />
          <KV label="Surnoc" value={c.details.surnoc} />
          <KV label="Hissa" value={c.details.hissa_no} />
          <KV label="Year" value={c.details.year} />
          <KV label="Period" value={c.details.period} />
          <KV label="Portal verification" value={c.verification?.message} />
        </div>
      </Disclosure>
    </div>
  );
}

export function RtcResults({ response }: { response: RtcResponse }) {
  const ok = response.results.filter((r) => r.currentStatus);
  const failed = response.results.filter((r) => !r.currentStatus);
  const model = buildRtcModel(response);
  return (
    <ResultFrame service="rtc" response={response} model={model}>
      {failed.length > 0 && (
        <PartialBanner>
          {failed.map((f) => `Hissa ${f.hissa_no ?? "?"}: ${f.statusVerification.detail ?? reasonText(f.statusVerification.reasonCode)}`).join(" | ")}
        </PartialBanner>
      )}
      <SectionTitle icon={<Layers size={16} />} count={`${ok.length} hissa${ok.length === 1 ? "" : "s"}`}>
        Ownership Overview
      </SectionTitle>
      {ok.map((h, i) => (
        <HissaCard key={`${h.hissa_no}-${i}`} h={h} />
      ))}
      <p className="muted small">
        Cultivation details are not part of the portal&apos;s current-RTC response, so they are not shown here.
      </p>
    </ResultFrame>
  );
}
