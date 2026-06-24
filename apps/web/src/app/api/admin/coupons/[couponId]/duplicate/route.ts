import { NextResponse } from "next/server";

import { duplicateAdminCoupon } from "@/lib/admin-coupons-api";

type RouteContext = {
  params: Promise<{ couponId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { couponId } = await context.params;
  const parsedCouponId = Number(couponId);

  if (!Number.isFinite(parsedCouponId)) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const payload = (await request.json()) as { code?: string };
  const result = await duplicateAdminCoupon(parsedCouponId, String(payload.code ?? ""));
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result, { status: 201 });
}
