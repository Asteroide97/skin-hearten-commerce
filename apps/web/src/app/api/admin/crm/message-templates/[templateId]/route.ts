import { NextResponse } from "next/server";

import { updateAdminCrmMessageTemplate } from "@/lib/admin-crm-api";
import type { CRMMessageTemplateUpdateInput } from "@/lib/admin-crm";

type RouteContext = {
  params: Promise<{
    templateId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { templateId } = await context.params;
  const parsedTemplateId = Number(templateId);

  if (!Number.isFinite(parsedTemplateId)) {
    return NextResponse.json({ ok: false, reason: "invalid_template_id" }, { status: 400 });
  }

  const payload = (await request.json()) as CRMMessageTemplateUpdateInput;
  const result = await updateAdminCrmMessageTemplate(parsedTemplateId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
