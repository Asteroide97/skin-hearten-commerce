import { NextResponse } from "next/server";

import { previewAdminCrmMessageTemplate } from "@/lib/admin-crm-api";
import type { CRMMessageTemplatePreviewInput } from "@/lib/admin-crm";

type RouteContext = {
  params: Promise<{
    templateId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { templateId } = await context.params;
  const parsedTemplateId = Number(templateId);

  if (!Number.isFinite(parsedTemplateId)) {
    return NextResponse.json({ ok: false, reason: "invalid_template_id" }, { status: 400 });
  }

  const payload = (await request.json()) as CRMMessageTemplatePreviewInput;
  const result = await previewAdminCrmMessageTemplate(parsedTemplateId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
