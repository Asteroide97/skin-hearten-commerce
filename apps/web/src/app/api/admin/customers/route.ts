import { NextResponse } from "next/server";

import { listAdminCustomers } from "@/lib/admin-customers-api";
import type { AdminCustomersFilters } from "@/lib/admin-customers";
import type { CRMContactLifecycleStatus } from "@/lib/admin-crm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filters: AdminCustomersFilters = {
    accepted_marketing:
      searchParams.get("accepted_marketing") === "true" || searchParams.get("acceptedMarketing") === "true"
        ? "true"
        : searchParams.get("accepted_marketing") === "false" || searchParams.get("acceptedMarketing") === "false"
          ? "false"
          : undefined,
    has_orders:
      searchParams.get("has_orders") === "true" || searchParams.get("hasOrders") === "true"
        ? "true"
        : searchParams.get("has_orders") === "false" || searchParams.get("hasOrders") === "false"
          ? "false"
          : undefined,
    lifecycle_status: (searchParams.get("lifecycle_status") ??
      searchParams.get("lifecycleStatus") ??
      undefined) as CRMContactLifecycleStatus | undefined,
    main_goal: searchParams.get("main_goal") ?? searchParams.get("mainGoal") ?? undefined,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined,
    search: searchParams.get("search") ?? undefined,
    skin_type: searchParams.get("skin_type") ?? searchParams.get("skinType") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortDir: (searchParams.get("sortDir") ?? undefined) as "asc" | "desc" | undefined,
  };

  const result = await listAdminCustomers(filters);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
