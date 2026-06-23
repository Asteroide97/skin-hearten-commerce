import { NextResponse } from "next/server";

import { deleteAdminProductImage, updateAdminProductImage } from "@/lib/admin-products-api";
import type { AdminProductImageUpdateInput } from "@/lib/admin-products";

type RouteContext = {
  params: Promise<{ imageId: string; productId: string }>;
};

function parseRouteIds(productId: string, imageId: string) {
  const parsedProductId = Number(productId);
  const parsedImageId = Number(imageId);

  if (!Number.isFinite(parsedProductId) || !Number.isFinite(parsedImageId)) {
    return null;
  }

  return { imageId: parsedImageId, productId: parsedProductId };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { imageId, productId } = await context.params;
  const routeIds = parseRouteIds(productId, imageId);
  if (!routeIds) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const payload = (await request.json()) as AdminProductImageUpdateInput;
  const result = await updateAdminProductImage(routeIds.productId, routeIds.imageId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}

export async function DELETE(_: Request, context: RouteContext) {
  const { imageId, productId } = await context.params;
  const routeIds = parseRouteIds(productId, imageId);
  if (!routeIds) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const result = await deleteAdminProductImage(routeIds.productId, routeIds.imageId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
