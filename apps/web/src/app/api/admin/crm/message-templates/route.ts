import { NextResponse } from "next/server";

import { listAdminCrmMessageTemplates } from "@/lib/admin-crm-api";

export async function GET() {
  const result = await listAdminCrmMessageTemplates();
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
