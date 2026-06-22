import { NextResponse } from "next/server";

import { updateAdminCrmTask } from "@/lib/admin-crm-api";
import type { CRMTaskUpdateInput } from "@/lib/admin-crm";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { taskId } = await context.params;
  const parsedTaskId = Number(taskId);

  if (!Number.isFinite(parsedTaskId)) {
    return NextResponse.json({ ok: false, reason: "invalid_task_id" }, { status: 400 });
  }

  const payload = (await request.json()) as CRMTaskUpdateInput;
  const result = await updateAdminCrmTask(parsedTaskId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
