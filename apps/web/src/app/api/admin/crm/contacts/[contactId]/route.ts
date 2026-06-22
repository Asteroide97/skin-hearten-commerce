import { NextResponse } from "next/server";

import { getAdminCrmContactDetail, updateAdminCrmContact } from "@/lib/admin-crm-api";
import type { CRMContactUpdateInput } from "@/lib/admin-crm";

type RouteContext = {
  params: Promise<{
    contactId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { contactId } = await context.params;
  const parsedContactId = Number(contactId);

  if (!Number.isFinite(parsedContactId)) {
    return NextResponse.json({ ok: false, reason: "invalid_contact_id" }, { status: 400 });
  }

  const result = await getAdminCrmContactDetail(parsedContactId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { contactId } = await context.params;
  const parsedContactId = Number(contactId);

  if (!Number.isFinite(parsedContactId)) {
    return NextResponse.json({ ok: false, reason: "invalid_contact_id" }, { status: 400 });
  }

  const payload = (await request.json()) as CRMContactUpdateInput;
  const result = await updateAdminCrmContact(parsedContactId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
