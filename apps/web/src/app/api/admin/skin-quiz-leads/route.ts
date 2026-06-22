import { NextResponse } from "next/server";

import { listAdminSkinQuizLeads } from "@/lib/admin-skin-quiz-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await listAdminSkinQuizLeads({
    date_from: searchParams.get("date_from") ?? searchParams.get("dateFrom") ?? undefined,
    date_to: searchParams.get("date_to") ?? searchParams.get("dateTo") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    status: (searchParams.get("status") as
      | "new"
      | "contacted"
      | "interested"
      | "purchased"
      | "not_interested"
      | null) ?? undefined,
    source: searchParams.get("source") ?? undefined,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
