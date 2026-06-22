import { NextResponse } from "next/server";

import { createAdminCrmNote } from "@/lib/admin-crm-api";
import type { CRMNoteCreateInput } from "@/lib/admin-crm";

type RouteContext = {
  params: Promise<{
    contactId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { contactId } = await context.params;
  const parsedContactId = Number(contactId);

  if (!Number.isFinite(parsedContactId)) {
    return NextResponse.json({ ok: false, reason: "invalid_contact_id" }, { status: 400 });
  }

  const payload = (await request.json()) as CRMNoteCreateInput;
  const result = await createAdminCrmNote(parsedContactId, payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result, { status: 201 });
}
