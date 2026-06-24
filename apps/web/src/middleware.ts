import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ADMIN_LOGIN_PATH,
  ADMIN_SESSION_COOKIE_NAME,
  isAdminLoginPath,
  isProtectedAdminApiPath,
  isProtectedAdminPath,
  normalizeAdminNextPath,
} from "@/lib/admin-session";

function buildRequestedPath(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  return `${pathname}${search}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const hasToken = typeof token === "string" && token.trim().length > 0;

  if (isProtectedAdminApiPath(pathname) && !hasToken) {
    return NextResponse.json(
      {
        ok: false,
        reason: "auth_failed",
        message: "Inicia sesion como SuperAdmin para continuar.",
      },
      { status: 401 },
    );
  }

  if (!isProtectedAdminPath(pathname)) {
    return NextResponse.next();
  }

  if (isAdminLoginPath(pathname)) {
    if (!hasToken) {
      return NextResponse.next();
    }

    const nextPath = normalizeAdminNextPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (hasToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
  loginUrl.searchParams.set("next", buildRequestedPath(request));
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
