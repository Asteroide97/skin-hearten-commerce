import { NextResponse } from "next/server";

import { getAdminSkinQuizLeadDetail } from "@/lib/admin-skin-quiz-api";

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { leadId } = await context.params;
  const parsedLeadId = Number(leadId);

  if (!Number.isFinite(parsedLeadId)) {
    return NextResponse.json({ ok: false, reason: "invalid_lead_id" }, { status: 400 });
  }

  const result = await getAdminSkinQuizLeadDetail(parsedLeadId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
