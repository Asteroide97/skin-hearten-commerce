import { NextResponse } from "next/server";

import { getAdminIntelligenceDashboard } from "@/lib/admin-intelligence-api";

export async function GET() {
  const result = await getAdminIntelligenceDashboard();

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
