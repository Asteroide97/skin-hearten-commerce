import { NextResponse } from "next/server";

import { listAdminProducts } from "@/lib/admin-products-api";

export async function GET() {
  const result = await listAdminProducts();
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
