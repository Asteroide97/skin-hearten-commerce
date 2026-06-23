import { NextResponse } from "next/server";

import { verifyCustomerOrder } from "@/lib/customer-orders-api";
import type { CustomerOrderLookupInput } from "@/lib/customer-orders";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const parsedOrderId = Number(orderId);

  if (!Number.isFinite(parsedOrderId)) {
    return NextResponse.json(
      { ok: false, reason: "invalid_response", message: "El identificador del pedido no es valido." },
      { status: 400 },
    );
  }

  const payload = (await request.json()) as CustomerOrderLookupInput;
  const result = await verifyCustomerOrder(parsedOrderId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
