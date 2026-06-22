import { NextResponse } from "next/server";

import { listAdminCrmReminders } from "@/lib/admin-crm-api";
import type {
  CRMReminderChannel,
  CRMReminderFilters,
  CRMReminderStatus,
  CRMReminderType,
} from "@/lib/admin-crm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filters: CRMReminderFilters = {
    channel: (searchParams.get("channel") ?? undefined) as CRMReminderChannel | undefined,
    date_from: searchParams.get("date_from") ?? searchParams.get("dateFrom") ?? undefined,
    date_to: searchParams.get("date_to") ?? searchParams.get("dateTo") ?? undefined,
    reminder_type: (searchParams.get("reminder_type") ??
      searchParams.get("reminderType") ??
      undefined) as CRMReminderType | undefined,
    search: searchParams.get("search") ?? undefined,
    status: (searchParams.get("status") ?? undefined) as CRMReminderStatus | undefined,
  };

  const result = await listAdminCrmReminders(filters);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
