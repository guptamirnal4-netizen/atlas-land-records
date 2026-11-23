import "server-only";

export class BackendError extends Error {
  constructor(
    public reasonCode: string,
    message: string,
    public httpStatus: number = 502,
  ) {
    super(message);
  }
}

/** Calls the Bhoomi backend. The API key lives only here, on the server. */
export async function callBackend<T>(
  path: string,
  params: Record<string, string | undefined>,
  timeoutMs = 55_000,
): Promise<T> {
  const base = process.env.ATLAS_API_BASE_URL?.replace(/\/+$/, "");
  if (!base) {
    throw new BackendError(
      "BACKEND_NOT_CONFIGURED",
      "The data service is not configured on this deployment (ATLAS_API_BASE_URL is not set).",
      503,
    );
  }

  const url = new URL(base + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.ATLAS_API_KEY) headers["X-API-Key"] = process.env.ATLAS_API_KEY;

  let res: Response;
  try {
    res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new BackendError(
        "BACKEND_TIMEOUT",
        "The government portal took too long to respond. Please try again.",
        504,
      );
    }
    throw new BackendError("BACKEND_UNREACHABLE", "The data service could not be reached.", 502);
  }

  if (res.ok) return (await res.json()) as T;

  let detail = "";
  try {
    const body = await res.json();
    detail = typeof body?.detail === "string" ? body.detail : JSON.stringify(body?.detail ?? "");
  } catch {
    /* non-JSON error body */
  }

  switch (res.status) {
    case 401:
      throw new BackendError("BACKEND_AUTH_FAILED", "The data service rejected this deployment's API key.", 502);
    case 404:
    case 422:
      throw new BackendError("INVALID_INPUT", detail || "The search details were not accepted.", 422);
    case 429:
      throw new BackendError("BACKEND_BUSY", detail || "The service is busy. Please retry in a few seconds.", 429);
    default:
      throw new BackendError("BACKEND_ERROR", detail || `The data service returned HTTP ${res.status}.`, 502);
  }
}
