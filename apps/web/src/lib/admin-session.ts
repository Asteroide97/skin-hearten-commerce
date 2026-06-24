export const ADMIN_SESSION_COOKIE_NAME = "skin_hearten_admin_token";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME_PATH = "/admin";

export function getAdminApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return null;
  }

  return apiUrl.replace(/\/$/, "");
}

export function isAdminLoginPath(pathname: string) {
  return pathname === ADMIN_LOGIN_PATH;
}

export function isProtectedAdminPath(pathname: string) {
  return pathname === ADMIN_HOME_PATH || pathname.startsWith("/admin/");
}

export function isProtectedAdminApiPath(pathname: string) {
  return pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth/");
}

export function normalizeAdminNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return ADMIN_HOME_PATH;
  }

  return value;
}
