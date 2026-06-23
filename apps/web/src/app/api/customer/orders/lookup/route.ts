import { NextResponse } from "next/server";

import { lookupCustomerOrders } from "@/lib/customer-orders-api";
import type { CustomerOrderLookupInput } from "@/lib/customer-orders";

export async function POST(request: Request) {
  const payload = (await request.json()) as CustomerOrderLookupInput;
  const result = await lookupCustomerOrders(payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
