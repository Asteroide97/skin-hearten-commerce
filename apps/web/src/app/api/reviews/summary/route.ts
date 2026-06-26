import { NextResponse } from "next/server";

import { getReviewsSummary } from "@/lib/reviews-api";

export async function GET() {
  const result = await getReviewsSummary();
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
