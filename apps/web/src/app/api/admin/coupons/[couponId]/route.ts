import { NextResponse } from "next/server";

import { deleteAdminCoupon, getAdminCoupon, updateAdminCoupon } from "@/lib/admin-coupons-api";
import type { AdminCouponUpdateInput } from "@/lib/admin-coupons";

type RouteContext = {
  params: Promise<{ couponId: string }>;
};

function parseCouponId(value: string) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export async function GET(_: Request, context: RouteContext) {
  const { couponId } = await context.params;
  const parsedCouponId = parseCouponId(couponId);

  if (parsedCouponId === null) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const result = await getAdminCoupon(parsedCouponId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { couponId } = await context.params;
  const parsedCouponId = parseCouponId(couponId);

  if (parsedCouponId === null) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const payload = (await request.json()) as AdminCouponUpdateInput;
  const result = await updateAdminCoupon(parsedCouponId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}

export async function DELETE(_: Request, context: RouteContext) {
  const { couponId } = await context.params;
  const parsedCouponId = parseCouponId(couponId);

  if (parsedCouponId === null) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const result = await deleteAdminCoupon(parsedCouponId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
