import { NextResponse } from "next/server";

import { listAdminOrders } from "@/lib/admin-orders-api";
import type { AdminOrderFilters, AdminOrderStatus, AdminPaymentStatus } from "@/lib/admin-orders";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filters: AdminOrderFilters = {
    search: searchParams.get("search") ?? undefined,
    order_status: (searchParams.get("order_status") ??
      searchParams.get("orderStatus") ??
      undefined) as AdminOrderStatus | undefined,
    payment_status: (searchParams.get("payment_status") ??
      searchParams.get("paymentStatus") ??
      undefined) as AdminPaymentStatus | undefined,
    payment_provider:
      searchParams.get("payment_provider") ?? searchParams.get("paymentProvider") ?? undefined,
    date_from: searchParams.get("date_from") ?? searchParams.get("dateFrom") ?? undefined,
    date_to: searchParams.get("date_to") ?? searchParams.get("dateTo") ?? undefined,
  };

  const result = await listAdminOrders(filters);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
