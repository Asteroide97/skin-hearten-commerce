import { NextResponse } from "next/server";

import { updateAdminReview } from "@/lib/admin-reviews-api";
import type { AdminProductReviewUpdateInput } from "@/lib/admin-reviews";

type RouteContext = {
  params: Promise<{ reviewId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { reviewId } = await context.params;
  const parsedReviewId = Number(reviewId);

  if (!Number.isFinite(parsedReviewId)) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const payload = (await request.json()) as AdminProductReviewUpdateInput;
  const result = await updateAdminReview(parsedReviewId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
