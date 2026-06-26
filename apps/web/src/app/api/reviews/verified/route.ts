import { NextResponse } from "next/server";

import { createVerifiedReview } from "@/lib/reviews-api";
import type { VerifiedReviewCreateInput } from "@/lib/reviews";

export async function POST(request: Request) {
  const payload = (await request.json()) as VerifiedReviewCreateInput;
  const result = await createVerifiedReview(payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result, { status: 201 });
}
