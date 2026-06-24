import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/admin-session";

export async function POST() {
  const response = NextResponse.json({
    ok: true,
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
