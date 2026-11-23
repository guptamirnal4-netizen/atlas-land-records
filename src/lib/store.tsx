"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchService } from "./client-api";
import type { AnyResponse, LoanResponse, MutationResponse, PropertyQuery, RtcResponse, ServiceKey, Status } from "./types";

export interface FormState {
  district: string;
  taluk: string;
  hobli: string;
  village: string;
  survey_number: string;
  hissa_no: string;
  from_year: string;
  to_year: string;
}

export const EMPTY_FORM: FormState = {
  district: "",
  taluk: "",
  hobli: "",
  village: "",
  survey_number: "",
  hissa_no: "",
  from_year: "",
  to_year: "",
};

// Changing a field invalidates everything that depends on it.
const DOWNSTREAM: Record<string, (keyof FormState)[]> = {
  district: ["taluk", "hobli", "village", "hissa_no"],
  taluk: ["hobli", "village", "hissa_no"],
  hobli: ["village", "hissa_no"],
  village: ["hissa_no"],
  survey_number: ["hissa_no"],
};

export interface StoredResult {
  response: AnyResponse;
  at: string;
}

export interface HistoryEntry {
  id: string;
  service: ServiceKey;
  query: PropertyQuery;
  status: Status;
  at: string;
  summary: string;
}

export function formToQuery(form: FormState): PropertyQuery {
  const q: PropertyQuery = {
    district: form.district.trim(),
    taluk: form.taluk.trim(),
    hobli: form.hobli.trim(),
    village: form.village.trim(),
    survey_number: form.survey_number.trim(),
  };
  if (form.hissa_no.trim()) q.hissa_no = form.hissa_no.trim();
  if (form.from_year.trim()) q.from_year = Number(form.from_year);
  if (form.to_year.trim()) q.to_year = Number(form.to_year);
  return q;
}

export function queryToForm(q: Partial<PropertyQuery>): FormState {
  return {
    district: q.district ?? "",
    taluk: q.taluk ?? "",
    hobli: q.hobli ?? "",
    village: q.village ?? "",
    survey_number: q.survey_number ?? "",
    hissa_no: q.hissa_no ?? "",
    from_year: q.from_year ? String(q.from_year) : "",
    to_year: q.to_year ? String(q.to_year) : "",
  };
}

function summarize(service: ServiceKey, r: AnyResponse): string {
  if (r.status === "error") return r.error?.reasonCode ?? "Error";
  if (r.status === "no_records") return "No records found";
  if (service === "rtc") return `${(r as RtcResponse).results.filter((x) => x.currentStatus).length} hissa record(s)`;
  if (service === "mutation") return `${(r as MutationResponse).count} mutation entr${(r as MutationResponse).count === 1 ? "y" : "ies"}`;
  return `${(r as LoanResponse).loanHistory.length} charge event(s)`;
}

interface Store {
  form: FormState;
  setField: (key: keyof FormState, value: string) => void;
  setForm: (f: FormState) => void;
  results: Partial<Record<ServiceKey, StoredResult>>;
  loading: Partial<Record<ServiceKey, boolean>>;
  run: (service: ServiceKey, query: PropertyQuery) => Promise<AnyResponse | undefined>;
  clearResult: (service: ServiceKey) => void;
  history: HistoryEntry[];
  clearHistory: () => void;
  /** True once saved form/history have been restored from browser storage. */
  ready: boolean;
}

const Ctx = createContext<Store | null>(null);

const FORM_KEY = "atlas.form.v1";
const HISTORY_KEY = "atlas.history.v1";
const HISTORY_MAX = 30;

function readJson<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage | undefined, key: string, value: unknown) {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable or full - the app works without it */
  }
}

export function AtlasProvider({ children }: { children: ReactNode }) {
  const [form, setFormState] = useState<FormState>(EMPTY_FORM);
  const [results, setResults] = useState<Partial<Record<ServiceKey, StoredResult>>>({});
  const [loading, setLoading] = useState<Partial<Record<ServiceKey, boolean>>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inFlight = useRef<Partial<Record<ServiceKey, boolean>>>({});
  const hydrated = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const f = readJson<FormState>(window.sessionStorage, FORM_KEY);
    if (f) setFormState({ ...EMPTY_FORM, ...f });
    const h = readJson<HistoryEntry[]>(window.localStorage, HISTORY_KEY);
    if (Array.isArray(h)) setHistory(h);
    hydrated.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (hydrated.current) writeJson(window.sessionStorage, FORM_KEY, form);
  }, [form]);

  useEffect(() => {
    if (hydrated.current) writeJson(window.localStorage, HISTORY_KEY, history);
  }, [history]);

  const setField = useCallback((key: keyof FormState, value: string) => {
    setFormState((prev) => {
      const next = { ...prev, [key]: value };
      for (const k of DOWNSTREAM[key] ?? []) next[k] = "";
      return next;
    });
  }, []);

  const setForm = useCallback((f: FormState) => setFormState(f), []);

  const run = useCallback(async (service: ServiceKey, query: PropertyQuery) => {
    if (inFlight.current[service]) return undefined; // duplicate submission guard
    inFlight.current[service] = true;
    setLoading((l) => ({ ...l, [service]: true }));
    try {
      const response = await fetchService(service, query);
      const at = new Date().toISOString();
      setResults((r) => ({ ...r, [service]: { response, at } }));
      setHistory((h) =>
        [
          { id: `${at}-${service}`, service, query, status: response.status, at, summary: summarize(service, response) },
          ...h,
        ].slice(0, HISTORY_MAX),
      );
      return response;
    } finally {
      inFlight.current[service] = false;
      setLoading((l) => ({ ...l, [service]: false }));
    }
  }, []);

  const clearResult = useCallback((service: ServiceKey) => {
    setResults((r) => {
      const next = { ...r };
      delete next[service];
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const value = useMemo<Store>(
    () => ({ form, setField, setForm, results, loading, run, clearResult, history, clearHistory, ready }),
    [form, setField, setForm, results, loading, run, clearResult, history, clearHistory, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAtlas(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAtlas must be used inside AtlasProvider");
  return v;
}
