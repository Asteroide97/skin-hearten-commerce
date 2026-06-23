import { NextResponse } from "next/server";

import { createProductReview, getProductReviews } from "@/lib/product-reviews-api";
import type { ProductReviewCreateInput } from "@/lib/product-reviews";

type RouteContext = {
  params: Promise<{ productRef: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { productRef } = await context.params;
  const result = await getProductReviews(productRef);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request, context: RouteContext) {
  const { productRef } = await context.params;
  const payload = (await request.json()) as ProductReviewCreateInput;
  const result = await createProductReview(productRef, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result, { status: 201 });
}
