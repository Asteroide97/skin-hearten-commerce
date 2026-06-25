import { NextResponse } from "next/server";

import { getAdminCustomerDetail } from "@/lib/admin-customers-api";

type RouteContext = {
  params: Promise<{ customerId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { customerId } = await context.params;
  const parsedCustomerId = Number(customerId);

  if (!Number.isFinite(parsedCustomerId)) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const result = await getAdminCustomerDetail(parsedCustomerId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
