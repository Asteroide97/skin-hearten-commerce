import { NextResponse } from "next/server";

import { listAdminImportJobs } from "@/lib/admin-imports-api";

export async function GET() {
  const result = await listAdminImportJobs();
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
