import { NextResponse } from "next/server";

import { getAdminProduct } from "@/lib/admin-products-api";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { productId } = await context.params;
  const parsedProductId = Number(productId);

  if (!Number.isFinite(parsedProductId)) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const result = await getAdminProduct(parsedProductId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
