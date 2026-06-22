import { NextResponse } from "next/server";

import { updateAdminCrmAutomationRule } from "@/lib/admin-crm-api";
import type { CRMAutomationRuleUpdateInput } from "@/lib/admin-crm";

type RouteContext = {
  params: Promise<{
    ruleId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { ruleId } = await context.params;
  const parsedRuleId = Number(ruleId);

  if (!Number.isFinite(parsedRuleId)) {
    return NextResponse.json({ ok: false, reason: "invalid_rule_id" }, { status: 400 });
  }

  const payload = (await request.json()) as CRMAutomationRuleUpdateInput;
  const result = await updateAdminCrmAutomationRule(parsedRuleId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
