import { NextResponse } from "next/server";

import { createAdminCoupon, listAdminCoupons } from "@/lib/admin-coupons-api";
import type { AdminCouponWriteInput } from "@/lib/admin-coupons";

export async function GET() {
  const result = await listAdminCoupons();
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as AdminCouponWriteInput;
  const result = await createAdminCoupon(payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result, { status: 201 });
}
