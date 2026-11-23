import { NextResponse, type NextRequest } from "next/server";
import { BackendError, callBackend } from "@/lib/server/backend";
import { rateLimited } from "@/lib/server/rate-limit";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Read-only monitoring endpoints the dashboard may call. Anything else is refused.
const ALLOWED = new Set(["districts", "services", "cost", "reliability", "failures/recent", "summary"]);
const NUMERIC_PARAMS = ["days", "limit"];

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = path.join("/");
  const headers = { "Cache-Control": "no-store" };
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json({ error: { reasonCode: "RATE_LIMITED", detail: "Too many requests." } }, { status: 429, headers });
  }
  if (!ALLOWED.has(key)) {
    return NextResponse.json({ error: { reasonCode: "INVALID_INPUT", detail: "Unknown monitor endpoint." } }, { status: 404, headers });
  }
  const params: Record<string, string> = {};
  for (const p of NUMERIC_PARAMS) {
    const v = req.nextUrl.searchParams.get(p);
    if (v && /^\d{1,4}$/.test(v)) params[p] = v;
  }
  try {
    return NextResponse.json(await callBackend(`/api/${key}`, params, 20_000), { headers });
  } catch (e) {
    if (e instanceof BackendError) {
      return NextResponse.json({ error: { reasonCode: e.reasonCode, detail: e.message } }, { status: e.httpStatus, headers });
    }
    return NextResponse.json({ error: { reasonCode: "INTERNAL_ERROR", detail: "Unexpected error." } }, { status: 500, headers });
  }
}
