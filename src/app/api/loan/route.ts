import type { NextRequest } from "next/server";
import { handleService } from "@/lib/server/route-helpers";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handleService("loan", req);
}
