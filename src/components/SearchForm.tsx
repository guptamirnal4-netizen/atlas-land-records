"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { fetchOptions } from "@/lib/client-api";
import { titleCase } from "@/lib/format";
import { SERVICES } from "@/lib/services";
import { EMPTY_FORM, formToQuery, useAtlas, type FormState } from "@/lib/store";
import type { PropertyQuery, ServiceKey } from "@/lib/types";
import { Combobox } from "./Combobox";
import { Spinner } from "./ui";

type Level = "district" | "taluk" | "hobli" | "village" | "hissa";
type Parents = Partial<Record<"district" | "taluk" | "hobli" | "village" | "survey_number", string>>;

interface OptState {
  list: string[];
  loading: boolean;
  error: string | null;
}
const IDLE: OptState = { list: [], loading: false, error: null };
const CACHE = new Map<string, string[]>();

function useOptions(level: Level, parents: Parents, enabled: boolean, debounceMs = 0) {
  const [state, setState] = useState<OptState>(IDLE);
  const [attempt, setAttempt] = useState(0);
  const key = enabled ? `${level}|${JSON.stringify(parents)}|${attempt}` : "";

  useEffect(() => {
    if (!enabled) {
      setState(IDLE);
      return;
    }
    const cacheKey = `${level}|${JSON.stringify(parents)}`;
    const cached = level === "hissa" ? undefined : CACHE.get(cacheKey);
    if (cached && attempt === 0) {
      setState({ list: cached, loading: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    setState({ list: [], loading: true, error: null });
    const t = setTimeout(async () => {
      try {
        const r = await fetchOptions(level, parents, ctrl.signal);
        if (!r.error && level !== "hissa") CACHE.set(cacheKey, r.options);
        setState({ list: r.options, loading: false, error: r.error });
      } catch {
        /* aborted: a newer request replaced this one */
      }
    }, debounceMs);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ...state, retry: () => setAttempt((a) => a + 1) };
}

export type FormErrors = Partial<Record<keyof FormState, string>>;

export function validateForm(form: FormState, service: ServiceKey | ServiceKey[]): FormErrors {
  const keys = Array.isArray(service) ? service : [service];
  const def = {
    hissaRequired: keys.some((k) => SERVICES[k].hissaRequired),
    yearRange: keys.some((k) => SERVICES[k].yearRange),
  };
  const e: FormErrors = {};
  if (!form.district) e.district = "Select a district";
  if (!form.taluk) e.taluk = "Select a taluk";
  if (!form.hobli) e.hobli = "Select a hobli";
  if (!form.village) e.village = "Select a village";
  if (!form.survey_number.trim()) e.survey_number = "Enter the survey number";
  else if (!/^\d{1,6}$/.test(form.survey_number.trim())) e.survey_number = "Digits only, for example 56";
  if (def.hissaRequired && !form.hissa_no.trim()) e.hissa_no = "Enter or select the hissa";
  if (def.yearRange) {
    const year = new Date().getFullYear() + 1;
    for (const k of ["from_year", "to_year"] as const) {
      const v = form[k].trim();
      if (v && (!/^\d{4}$/.test(v) || +v < 1900 || +v > year)) e[k] = "Enter a 4-digit year";
    }
    if (!e.from_year && !e.to_year && form.from_year && form.to_year && +form.from_year > +form.to_year) {
      e.to_year = "To year must not be before From year";
    }
  }
  return e;
}

export function SearchForm({
  service,
  services,
  loading,
  onSubmit,
  submitLabel,
  busyLabel,
  hint,
  extra,
}: {
  service?: ServiceKey;
  /** Report mode: validate for several services at once. */
  services?: ServiceKey[];
  loading: boolean;
  onSubmit: (q: PropertyQuery) => void;
  submitLabel?: string;
  busyLabel?: string;
  hint?: string;
  extra?: React.ReactNode;
}) {
  const active: ServiceKey[] = services ?? [service!];
  const def = {
    ...SERVICES[active[0]],
    hissaRequired: active.some((k) => SERVICES[k].hissaRequired),
    yearRange: active.some((k) => SERVICES[k].yearRange),
  };
  const { form, setField, setForm } = useAtlas();
  const [touched, setTouched] = useState(false);
  const errors = touched ? validateForm(form, active) : {};

  const districts = useOptions("district", {}, true);
  const taluks = useOptions("taluk", { district: form.district }, !!form.district);
  const hoblis = useOptions("hobli", { district: form.district, taluk: form.taluk }, !!(form.district && form.taluk));
  const villages = useOptions(
    "village",
    { district: form.district, taluk: form.taluk, hobli: form.hobli },
    !!(form.district && form.taluk && form.hobli),
  );
  const surveyOk = /^\d{1,6}$/.test(form.survey_number.trim());
  const hissas = useOptions(
    "hissa",
    { district: form.district, taluk: form.taluk, hobli: form.hobli, village: form.village, survey_number: form.survey_number.trim() },
    !!(form.district && form.taluk && form.hobli && form.village && surveyOk),
    600,
  );

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setTouched(true);
    if (loading || Object.keys(validateForm(form, active)).length) return;
    onSubmit(formToQuery(form));
  };

  const loadError = districts.error || taluks.error || hoblis.error || villages.error;
  const retryAll = () => [districts, taluks, hoblis, villages].forEach((o) => o.error && o.retry());

  return (
    <form className="card search-card" onSubmit={submit} noValidate aria-label={services ? "Property search" : `${def.title} search`}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 17 }}>Search Land Record</h2>
        <p className="muted small" style={{ margin: "2px 0 0" }}>
          Fill in the details to fetch the verified record. The same details are kept when you switch services.
        </p>
      </div>

      <div className="form-grid">
        <Combobox label="District" required value={form.district} onChange={(v) => setField("district", v)}
          options={districts.list} display={titleCase} loading={districts.loading} placeholder="Search district"
          error={errors.district} />
        <Combobox label="Taluk" required value={form.taluk} onChange={(v) => setField("taluk", v)}
          options={taluks.list} display={titleCase} loading={taluks.loading} disabled={!form.district}
          placeholder={form.district ? "Search taluk" : "Select district first"} error={errors.taluk} />
        <Combobox label="Hobli" required value={form.hobli} onChange={(v) => setField("hobli", v)}
          options={hoblis.list} display={titleCase} loading={hoblis.loading} disabled={!form.taluk}
          placeholder={form.taluk ? "Search hobli" : "Select taluk first"} error={errors.hobli} />
        <Combobox label="Village" required value={form.village} onChange={(v) => setField("village", v)}
          options={villages.list} display={titleCase} loading={villages.loading} disabled={!form.hobli}
          placeholder={form.hobli ? "Search village" : "Select hobli first"} error={errors.village} />

        <div className="field">
          <label htmlFor="survey">
            Survey Number<span className="req" aria-hidden> *</span>
          </label>
          <input id="survey" className="input" inputMode="numeric" autoComplete="off" maxLength={6}
            placeholder="e.g. 56" value={form.survey_number}
            aria-required aria-invalid={errors.survey_number ? true : undefined}
            onChange={(e) => setField("survey_number", e.target.value.replace(/\s/g, ""))} />
          {errors.survey_number ? (
            <span className="field-error" role="alert">{errors.survey_number}</span>
          ) : (
            <span className="field-hint">Digits only</span>
          )}
        </div>

        <Combobox label="Hissa" required={def.hissaRequired} value={form.hissa_no} onChange={(v) => setField("hissa_no", v)}
          options={hissas.list} loading={hissas.loading} allowCustom clearable
          disabled={!form.village || !form.survey_number}
          placeholder={def.hissaRequired ? "Select or type hissa" : "All hissas"}
          emptyText="No hissas listed"
          hint={
            !form.survey_number
              ? "Enter the survey number to load hissas"
              : hissas.error
                ? "Could not load hissas - type the number"
                : def.hissaRequired
                  ? undefined
                  : "Leave blank to include every hissa"
          }
          error={errors.hissa_no} />

        {def.yearRange && (
          <>
            <div className="field">
              <label htmlFor="from_year">From year</label>
              <input id="from_year" className="input" inputMode="numeric" maxLength={4} placeholder="e.g. 2004 (optional)"
                value={form.from_year} aria-invalid={errors.from_year ? true : undefined}
                onChange={(e) => setField("from_year", e.target.value.trim())} />
              {errors.from_year && <span className="field-error" role="alert">{errors.from_year}</span>}
            </div>
            <div className="field">
              <label htmlFor="to_year">To year</label>
              <input id="to_year" className="input" inputMode="numeric" maxLength={4} placeholder="e.g. 2020 (optional)"
                value={form.to_year} aria-invalid={errors.to_year ? true : undefined}
                onChange={(e) => setField("to_year", e.target.value.trim())} />
              {errors.to_year && <span className="field-error" role="alert">{errors.to_year}</span>}
            </div>
          </>
        )}
      </div>

      {loadError && (
        <div className="banner warn" style={{ marginTop: 16, padding: "10px 14px" }} role="status">
          <div className="banner-body small" style={{ flex: 1 }}>
            Some dropdown options could not be loaded: {loadError}
          </div>
          <button type="button" className="btn sm" onClick={retryAll}>Retry</button>
        </div>
      )}

      {extra}

      <div className="form-actions">
        <span className="muted small">
          {loading ? "Contacting the live government portal. This can take a little while." : (hint ?? `Fetching the most detailed ${def.populates.toLowerCase()} from your search.`)}
        </span>
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => { setForm(EMPTY_FORM); setTouched(false); }} disabled={loading}>
            <RotateCcw size={14} /> Reset
          </button>
          <button type="submit" className="btn primary" disabled={loading} aria-busy={loading}>
            {loading ? <Spinner /> : <Search size={15} />} {loading ? (busyLabel ?? "Fetching...") : (submitLabel ?? def.fetchLabel)}
          </button>
        </div>
      </div>
    </form>
  );
}
