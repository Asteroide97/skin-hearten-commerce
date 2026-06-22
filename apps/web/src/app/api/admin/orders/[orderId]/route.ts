import { NextResponse } from "next/server";

import { getAdminOrderDetail, updateAdminOrder } from "@/lib/admin-orders-api";
import type { AdminOrderUpdateInput } from "@/lib/admin-orders";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const parsedOrderId = Number(orderId);

  if (!Number.isFinite(parsedOrderId)) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const result = await getAdminOrderDetail(parsedOrderId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const parsedOrderId = Number(orderId);

  if (!Number.isFinite(parsedOrderId)) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const payload = (await request.json()) as AdminOrderUpdateInput;
  const result = await updateAdminOrder(parsedOrderId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
