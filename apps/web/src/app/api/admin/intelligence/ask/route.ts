import { NextResponse } from "next/server";

import { askAdminIntelligence } from "@/lib/admin-intelligence-api";

export async function POST(request: Request) {
  let payload: { question?: string } = {};

  try {
    payload = (await request.json()) as { question?: string };
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_response", message: "No pudimos leer la pregunta enviada." },
      { status: 400 },
    );
  }

  const question = payload.question?.trim();
  if (!question) {
    return NextResponse.json(
      { ok: false, reason: "invalid_response", message: "Escribe una pregunta para consultar el modulo." },
      { status: 400 },
    );
  }

  const result = await askAdminIntelligence(question);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status ?? 503 });
  }

  return NextResponse.json(result);
}
