import { NextResponse } from "next/server";

import { listAdminCrmAutomationRuns } from "@/lib/admin-crm-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 50;

  const result = await listAdminCrmAutomationRuns(limit);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
