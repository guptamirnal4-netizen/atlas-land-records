import type { RtcHissaResult, RtcResponse, PropertyQuery } from "./types";

interface RawRtc {
  success: boolean;
  query: PropertyQuery;
  count: number;
  results: RtcHissaResult[];
}

/**
 * The backend's /api/rtc always answers HTTP 200 and reports failures per
 * hissa. Atlas needs one overall status that never confuses "the portal has
 * no record" with "the lookup failed".
 */
export function normalizeRtc(raw: RawRtc, fetchedAt: string): RtcResponse {
  const results = raw.results ?? [];
  const okCount = results.filter((r) => r.currentStatus).length;
  const failed = results.filter((r) => !r.currentStatus);

  const base = { query: raw.query, count: results.length, results, fetchedAt };

  if (okCount > 0) {
    return { ...base, status: failed.length ? "partial" : "ok", error: null };
  }

  const first = failed[0]?.statusVerification;
  const code = first?.reasonCode ?? "SOURCE_PARSE_FAILED";
  const detail = first?.detail ?? "The portal returned no data for this property.";

  // Definite "not there": the portal lists the hissas it has and the requested one isn't among them.
  if (/Hissa .* not found among options/i.test(detail)) {
    return { ...base, status: "no_records", error: null };
  }
  // Probable "not there" - but the same empty cascade is also how the portal
  // degrades under load, so the UI must offer a retry and say so.
  if (/No Surnoc options|No Hissa options/i.test(detail)) {
    return { ...base, status: "no_records", error: null, ambiguous: true };
  }
  if (/not found (in|under)/i.test(detail)) {
    return { ...base, status: "error", error: { reasonCode: "LOCATION_NOT_FOUND", detail } };
  }
  return { ...base, status: "error", error: { reasonCode: code, detail } };
}
