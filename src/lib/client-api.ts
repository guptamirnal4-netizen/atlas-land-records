import type { AnyResponse, OptionsResponse, PropertyQuery, ServiceKey } from "./types";

const TIMEOUT_MS = 90_000;

function errorEnvelope(reasonCode: string, detail: string) {
  return { status: "error" as const, error: { reasonCode, detail }, fetchedAt: new Date().toISOString() };
}

async function getJson(url: string, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const res = await fetch(url, { signal: combined, cache: "no-store" });
  return res.json();
}

export function buildQueryString(q: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && String(v).trim() !== "") sp.set(k, String(v));
  return sp.toString();
}

export async function fetchService(
  service: ServiceKey,
  query: PropertyQuery,
  signal?: AbortSignal,
): Promise<AnyResponse> {
  try {
    const data = await getJson(`/api/${service}?${buildQueryString({ ...query })}`, signal);
    if (data && typeof data.status === "string") {
      return { query, ...data } as AnyResponse; // success and structured errors alike
    }
    return { query, ...errorEnvelope("BACKEND_ERROR", "Unexpected response from Atlas.") } as AnyResponse;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return {
      query,
      ...errorEnvelope(
        timedOut ? "BACKEND_TIMEOUT" : "NETWORK",
        timedOut ? "The lookup took too long and was stopped." : "Could not reach Atlas. Check your connection.",
      ),
    } as AnyResponse;
  }
}

export async function fetchOptions(
  level: "district" | "taluk" | "hobli" | "village" | "hissa",
  parents: Partial<Record<"district" | "taluk" | "hobli" | "village" | "survey_number", string>>,
  signal?: AbortSignal,
): Promise<{ options: string[]; error: string | null }> {
  try {
    const data = (await getJson(`/api/options?${buildQueryString({ level, ...parents })}`, signal)) as
      | OptionsResponse
      | { status: "error"; error: { detail: string } };
    if ("options" in data) return { options: data.options, error: null };
    return { options: [], error: data.error?.detail ?? "Could not load options." };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    return { options: [], error: "Could not load options. Check your connection." };
  }
}
