import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { BackendError, callBackend } from "./backend";
import { rateLimited } from "./rate-limit";
import { normalizeRtc } from "../normalize";
import type { ServiceKey } from "../types";

const COMMON = ["district", "taluk", "hobli", "village", "survey_number"] as const;
const SPEC: Record<ServiceKey, { path: string; required: readonly string[]; optional: readonly string[] }> = {
  rtc: { path: "/api/rtc", required: COMMON, optional: ["hissa_no"] },
  mutation: { path: "/api/mutation", required: COMMON, optional: ["hissa_no", "from_year", "to_year"] },
  loan: { path: "/api/loan", required: [...COMMON, "hissa_no"], optional: [] },
};

function errorBody(reasonCode: string, detail: string) {
  return { status: "error", error: { reasonCode, detail }, fetchedAt: new Date().toISOString() };
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function handleService(service: ServiceKey, req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return json(errorBody("RATE_LIMITED", "Too many requests. Please wait a minute and try again."), 429);
  }
  const spec = SPEC[service];
  const sp = req.nextUrl.searchParams;
  const params: Record<string, string> = {};
  for (const key of [...spec.required, ...spec.optional]) {
    const v = sp.get(key)?.trim();
    if (v) params[key] = v.slice(0, 120);
  }
  const missing = spec.required.filter((k) => !params[k]);
  if (missing.length) {
    return json(errorBody("INVALID_INPUT", `Missing required field(s): ${missing.join(", ")}`), 422);
  }
  if (!/^\d{1,6}$/.test(params.survey_number)) {
    return json(errorBody("INVALID_INPUT", "Survey number must be numeric (digits only)."), 422);
  }

  try {
    const raw = await callBackend<Record<string, unknown>>(spec.path, params);
    const fetchedAt = new Date().toISOString();
    if (service === "rtc") {
      return json(normalizeRtc(raw as never, fetchedAt));
    }
    return json({ ...raw, fetchedAt: (raw.fetchedAt as string) ?? fetchedAt, error: raw.error ?? null });
  } catch (e) {
    if (e instanceof BackendError) return json(errorBody(e.reasonCode, e.message), e.httpStatus);
    return json(errorBody("INTERNAL_ERROR", "Unexpected error while contacting the data service."), 500);
  }
}

export async function handleOptions(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return json(errorBody("RATE_LIMITED", "Too many requests. Please wait a minute and try again."), 429);
  }
  const sp = req.nextUrl.searchParams;
  const params: Record<string, string> = {};
  for (const key of ["level", "district", "taluk", "hobli", "village", "survey_number"]) {
    const v = sp.get(key)?.trim();
    if (v) params[key] = v.slice(0, 120);
  }
  if (!params.level) return json(errorBody("INVALID_INPUT", "level is required"), 422);
  try {
    return json(await callBackend("/api/options", params, 40_000));
  } catch (e) {
    if (e instanceof BackendError) return json(errorBody(e.reasonCode, e.message), e.httpStatus);
    return json(errorBody("INTERNAL_ERROR", "Unexpected error while contacting the data service."), 500);
  }
}
