import { NextResponse } from "next/server";

import { uploadAdminProductImage } from "@/lib/admin-products-api";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const parsedProductId = Number(productId);

  if (!Number.isFinite(parsedProductId)) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const formData = await request.formData();
  const result = await uploadAdminProductImage(parsedProductId, formData);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result, { status: 201 });
}
