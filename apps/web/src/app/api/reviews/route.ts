import { NextResponse } from "next/server";

import { getApprovedReviews } from "@/lib/reviews-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPage = searchParams.get("page");
  const rawPageSize = searchParams.get("pageSize");
  const rawRating = searchParams.get("rating");

  const page = rawPage ? Number(rawPage) : undefined;
  const pageSize = rawPageSize ? Number(rawPageSize) : undefined;
  const rating = rawRating ? Number(rawRating) : undefined;

  const result = await getApprovedReviews({
    page: typeof page === "number" && Number.isFinite(page) ? page : undefined,
    pageSize: typeof pageSize === "number" && Number.isFinite(pageSize) ? pageSize : undefined,
    product: searchParams.get("product") ?? undefined,
    rating: typeof rating === "number" && Number.isFinite(rating) ? rating : undefined,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
