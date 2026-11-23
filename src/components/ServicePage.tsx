"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { SERVICES, SERVICE_ORDER } from "@/lib/services";
import { queryToForm, useAtlas } from "@/lib/store";
import type { AnyResponse, LoanResponse, MutationResponse, PropertyQuery, RtcResponse, ServiceKey } from "@/lib/types";
import { SERVICE_ICON } from "./Shell";
import { SearchForm } from "./SearchForm";
import { LoadingCard, ErrorBanner, NoRecordsBanner } from "./ui";
import { LoanResults } from "./results/LoanResults";
import { MutationResults } from "./results/MutationResults";
import { RtcResults } from "./results/RtcResults";

const NOUN: Record<ServiceKey, string> = {
  rtc: "ownership record",
  mutation: "mutation entries",
  loan: "financial charges",
};

function Outcome({ service, response, onRetry }: { service: ServiceKey; response: AnyResponse; onRetry: () => void }) {
  if (response.status === "error") return <ErrorBanner response={response} onRetry={onRetry} />;
  if (response.status === "no_records") {
    return <NoRecordsBanner what={NOUN[service]} ambiguous={response.ambiguous} onRetry={onRetry} />;
  }
  if (service === "rtc") return <RtcResults response={response as RtcResponse} />;
  if (service === "mutation") return <MutationResults response={response as MutationResponse} />;
  return <LoanResults response={response as LoanResponse} />;
}

export function ServicePage({ service }: { service: ServiceKey }) {
  const def = SERVICES[service];
  const Icon = SERVICE_ICON[service];
  const { results, loading, run, setForm, ready, form } = useAtlas();
  const params = useSearchParams();
  const autorun = useRef(false);

  // Re-opening a search from History: /service?district=...&autorun=1
  useEffect(() => {
    if (!ready || autorun.current) return;
    if (!params.get("district") || !params.get("survey_number")) return;
    autorun.current = true;
    const q: Partial<PropertyQuery> = {
      district: params.get("district") ?? "",
      taluk: params.get("taluk") ?? "",
      hobli: params.get("hobli") ?? "",
      village: params.get("village") ?? "",
      survey_number: params.get("survey_number") ?? "",
      hissa_no: params.get("hissa_no") ?? undefined,
      from_year: params.get("from_year") ? Number(params.get("from_year")) : undefined,
      to_year: params.get("to_year") ? Number(params.get("to_year")) : undefined,
    };
    setForm(queryToForm(q));
    if (params.get("autorun") === "1") void run(service, q as PropertyQuery);
  }, [ready, params, run, service, setForm]);

  const stored = results[service];
  const isLoading = !!loading[service];
  const hasDetails = !!(form.district && form.survey_number);

  return (
    <div data-service={service} className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div className="page-icon"><Icon size={22} /></div>
        <div>
          <h1 className="page-title">{def.title}</h1>
          <p className="muted" style={{ margin: "2px 0 0" }}>{def.description}</p>
        </div>
      </div>

      <SearchForm service={service} loading={isLoading} onSubmit={(q) => void run(service, q)} />

      {isLoading ? (
        <LoadingCard label={`Fetching ${def.populates.toLowerCase()}...`} />
      ) : stored ? (
        <Outcome service={service} response={stored.response} onRetry={() => void run(service, stored.response.query)} />
      ) : (
        <div className="card flat stack fade-in">
          <h3 className="section-title">What you get in {def.navLabel}</h3>
          <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
            <div className="page-icon"><Icon size={22} /></div>
            <div className="stack" style={{ gap: 8 }}>
              <strong>Populates {def.populates}</strong>
              <span className="muted">{def.description}</span>
              <div className="row">
                {def.chips.map((c) => (
                  <span key={c} className="badge accent">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {hasDetails && (
        <div className="card flat no-print">
          <div className="stack" style={{ gap: 10 }}>
            <strong>Check the same property in another service</strong>
            <div className="row">
              {SERVICE_ORDER.filter((k) => k !== service).map((k) => {
                const o = SERVICES[k];
                const OIcon = SERVICE_ICON[k];
                return (
                  <Link key={k} href={o.summaryPath} className="btn" data-service={k}>
                    <OIcon size={15} /> {o.navLabel} <ArrowRight size={14} />
                  </Link>
                );
              })}
              <Link href="/report" className="btn">Build a combined report <ArrowRight size={14} /></Link>
            </div>
            <span className="muted small">Your search details carry over. Nothing is fetched until you ask.</span>
          </div>
        </div>
      )}
    </div>
  );
}
