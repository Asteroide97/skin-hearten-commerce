import "server-only";

import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE_NAME, getAdminApiBaseUrl } from "@/lib/admin-session";

export type AdminApiFailureReason =
  | "api_url_missing"
  | "auth_failed"
  | "fetch_failed"
  | "forbidden"
  | "invalid_response"
  | "not_found";

export type AdminApiSuccess<TData> = {
  ok: true;
  data: TData;
};

export type AdminApiFailure = {
  ok: false;
  reason: AdminApiFailureReason;
  message?: string;
  status?: number;
};

export type AdminApiResult<TData> = AdminApiSuccess<TData> | AdminApiFailure;

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

type RequestMethod = "DELETE" | "GET" | "PATCH" | "POST";

async function getAdminAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
}

async function readFailure(response: Response): Promise<AdminApiFailure> {
  let message: string | undefined;

  try {
    const payload = (await response.json()) as { detail?: string };
    if (typeof payload.detail === "string" && payload.detail.trim().length > 0) {
      message = payload.detail;
    }
  } catch {
    // Keep default undefined message when backend does not return JSON.
  }

  if (response.status === 401) {
    return { ok: false, reason: "auth_failed", status: 401, message };
  }

  if (response.status === 403) {
    return { ok: false, reason: "forbidden", status: 403, message };
  }

  if (response.status === 404) {
    return { ok: false, reason: "not_found", status: 404, message };
  }

  return { ok: false, reason: "fetch_failed", status: response.status, message };
}

function appendQueryParams(url: URL, query?: QueryParams) {
  if (!query) {
    return;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === "string" && value.trim().length === 0) {
      continue;
    }
    url.searchParams.set(key, String(value));
  }
}

export async function requestAdminJson<TData>(
  path: string,
  options?: {
    body?: Record<string, unknown>;
    method?: RequestMethod;
    query?: QueryParams;
  },
): Promise<AdminApiResult<TData>> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) {
    return { ok: false, reason: "api_url_missing" };
  }

  const token = await getAdminAccessToken();
  if (!token) {
    return {
      ok: false,
      reason: "auth_failed",
      status: 401,
      message: "Inicia sesion como SuperAdmin para continuar.",
    };
  }

  try {
    const url = new URL(`${apiBaseUrl}${path}`);
    appendQueryParams(url, options?.query);

    const response = await fetch(url.toString(), {
      method: options?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return readFailure(response);
    }

    const data = (await response.json()) as TData;
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }
}

export async function requestAdminFormData<TData>(
  path: string,
  formData: FormData,
  options?: {
    method?: Exclude<RequestMethod, "PATCH">;
    query?: QueryParams;
  },
): Promise<AdminApiResult<TData>> {
  const apiBaseUrl = getAdminApiBaseUrl();
  if (!apiBaseUrl) {
    return { ok: false, reason: "api_url_missing" };
  }

  const token = await getAdminAccessToken();
  if (!token) {
    return {
      ok: false,
      reason: "auth_failed",
      status: 401,
      message: "Inicia sesion como SuperAdmin para continuar.",
    };
  }

  try {
    const url = new URL(`${apiBaseUrl}${path}`);
    appendQueryParams(url, options?.query);

    const response = await fetch(url.toString(), {
      method: options?.method ?? "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      cache: "no-store",
    });

    if (!response.ok) {
      return readFailure(response);
    }

    const data = (await response.json()) as TData;
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }
}
