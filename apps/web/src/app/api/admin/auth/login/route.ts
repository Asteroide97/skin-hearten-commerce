import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE_NAME, getAdminApiBaseUrl } from "@/lib/admin-session";

type LoginResponse = {
  access_token?: string;
  scope?: string;
};

type LoginRequestBody = {
  email?: string;
  password?: string;
};

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: string };
    if (typeof payload.detail === "string" && payload.detail.trim().length > 0) {
      return payload.detail;
    }
  } catch {
    // Ignore malformed payloads and fall back to generic messaging.
  }

  return "No pudimos iniciar sesion por ahora.";
}

export async function POST(request: Request) {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        reason: "api_url_missing",
        message: "Configura NEXT_PUBLIC_API_URL para autenticar el panel admin.",
      },
      { status: 503 },
    );
  }

  let body: LoginRequestBody;
  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        reason: "invalid_request",
        message: "No pudimos leer las credenciales enviadas.",
      },
      { status: 400 },
    );
  }

  const email = body.email?.trim() ?? "";
  const password = body.password?.trim() ?? "";

  if (!email || !password) {
    return NextResponse.json(
      {
        ok: false,
        reason: "invalid_request",
        message: "Email y contrasena son obligatorios.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      return NextResponse.json(
        {
          ok: false,
          reason: response.status === 401 ? "invalid_credentials" : "fetch_failed",
          message,
        },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as LoginResponse;
    if (payload.scope !== "admin" || typeof payload.access_token !== "string" || payload.access_token.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          reason: "forbidden",
          message: "Esta cuenta no tiene acceso de SuperAdmin.",
        },
        { status: 403 },
      );
    }

    const nextResponse = NextResponse.json({
      ok: true,
      data: { scope: payload.scope },
    });

    nextResponse.cookies.set({
      name: ADMIN_SESSION_COOKIE_NAME,
      value: payload.access_token,
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return nextResponse;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        reason: "fetch_failed",
        message: "No pudimos conectar con la API de autenticacion.",
      },
      { status: 503 },
    );
  }
}
