import { NextResponse } from "next/server";

import { getHealthPayload } from "@/lib/health";

/** Liveness/readiness endpoint. No authentication required. */
export async function GET() {
  return NextResponse.json(getHealthPayload());
}
