import { NextResponse } from "next/server";

import { listAdminReviews } from "@/lib/admin-reviews-api";
import type { AdminProductReviewFilters, AdminProductReviewStatus } from "@/lib/admin-reviews";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawRating = searchParams.get("rating") ?? undefined;
  const rating = rawRating && rawRating !== "all" ? Number(rawRating) : undefined;

  const filters: AdminProductReviewFilters = {
    product: searchParams.get("product") ?? undefined,
    rating: typeof rating === "number" && Number.isFinite(rating) ? rating : undefined,
    search: searchParams.get("search") ?? undefined,
    status: (searchParams.get("status") ?? undefined) as AdminProductReviewStatus | undefined,
  };

  const result = await listAdminReviews(filters);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
