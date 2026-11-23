import type { NextRequest } from "next/server";
import { handleOptions } from "@/lib/server/route-helpers";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handleOptions(req);
}
