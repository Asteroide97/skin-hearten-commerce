import { NextResponse } from "next/server";

import { getAdminSkinQuizAnalytics } from "@/lib/admin-skin-quiz-api";

export async function GET() {
  const result = await getAdminSkinQuizAnalytics();

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
