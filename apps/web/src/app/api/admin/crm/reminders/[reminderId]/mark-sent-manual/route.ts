import { NextResponse } from "next/server";

import { markAdminCrmReminderSentManual } from "@/lib/admin-crm-api";

type RouteContext = {
  params: Promise<{
    reminderId: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { reminderId } = await context.params;
  const parsedReminderId = Number(reminderId);

  if (!Number.isFinite(parsedReminderId)) {
    return NextResponse.json({ ok: false, reason: "invalid_reminder_id" }, { status: 400 });
  }

  const result = await markAdminCrmReminderSentManual(parsedReminderId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
