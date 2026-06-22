import { NextResponse } from "next/server";

import { getAdminImportJobDetail } from "@/lib/admin-imports-api";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const parsedJobId = Number(jobId);

  if (!Number.isFinite(parsedJobId)) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const result = await getAdminImportJobDetail(parsedJobId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
