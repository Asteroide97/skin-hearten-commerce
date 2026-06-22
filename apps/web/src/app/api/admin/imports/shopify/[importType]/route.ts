import { NextResponse } from "next/server";

import { uploadAdminShopifyImport } from "@/lib/admin-imports-api";
import type { AdminImportType } from "@/lib/admin-imports";

type RouteContext = {
  params: Promise<{ importType: string }>;
};

function isSupportedImportType(value: string): value is AdminImportType {
  return value === "customers" || value === "orders" || value === "products";
}

export async function POST(request: Request, context: RouteContext) {
  const { importType } = await context.params;
  if (!isSupportedImportType(importType)) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: "invalid_response" }, { status: 400 });
  }

  const result = await uploadAdminShopifyImport(importType, file);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
