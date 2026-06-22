import { NextResponse } from "next/server";

import { getAdminCrmReminderDetail, updateAdminCrmReminder } from "@/lib/admin-crm-api";
import type { CRMReminderUpdateInput } from "@/lib/admin-crm";

type RouteContext = {
  params: Promise<{
    reminderId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { reminderId } = await context.params;
  const parsedReminderId = Number(reminderId);

  if (!Number.isFinite(parsedReminderId)) {
    return NextResponse.json({ ok: false, reason: "invalid_reminder_id" }, { status: 400 });
  }

  const result = await getAdminCrmReminderDetail(parsedReminderId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { reminderId } = await context.params;
  const parsedReminderId = Number(reminderId);

  if (!Number.isFinite(parsedReminderId)) {
    return NextResponse.json({ ok: false, reason: "invalid_reminder_id" }, { status: 400 });
  }

  const payload = (await request.json()) as CRMReminderUpdateInput;
  const result = await updateAdminCrmReminder(parsedReminderId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
