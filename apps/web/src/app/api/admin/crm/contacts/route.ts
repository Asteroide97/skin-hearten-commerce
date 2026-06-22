import { NextResponse } from "next/server";

import { listAdminCrmContacts } from "@/lib/admin-crm-api";
import type { CRMContactFilters, CRMContactLifecycleStatus } from "@/lib/admin-crm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filters: CRMContactFilters = {
    accepted_marketing:
      searchParams.get("accepted_marketing") === "true" || searchParams.get("acceptedMarketing") === "true"
        ? "true"
        : searchParams.get("accepted_marketing") === "false" || searchParams.get("acceptedMarketing") === "false"
          ? "false"
          : undefined,
    lifecycle_status: (searchParams.get("lifecycle_status") ??
      searchParams.get("lifecycleStatus") ??
      undefined) as CRMContactLifecycleStatus | undefined,
    main_goal: searchParams.get("main_goal") ?? searchParams.get("mainGoal") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    skin_type: searchParams.get("skin_type") ?? searchParams.get("skinType") ?? undefined,
  };

  const result = await listAdminCrmContacts(filters);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
