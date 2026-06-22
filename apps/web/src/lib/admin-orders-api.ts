import "server-only";

import type {
  AdminOrderDetail,
  AdminOrderFilters,
  AdminOrderSummary,
  AdminOrderUpdateInput,
} from "@/lib/admin-orders";

type AdminApiFailureReason =
  | "api_url_missing"
  | "auth_failed"
  | "fetch_failed"
  | "invalid_response"
  | "not_found";

type AdminApiSuccess<TData> = {
  ok: true;
  data: TData;
};

type AdminApiFailure = {
  ok: false;
  reason: AdminApiFailureReason;
  status?: number;
};

type AdminApiResult<TData> = AdminApiSuccess<TData> | AdminApiFailure;

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

const DEFAULT_ADMIN_EMAIL = "admin@skinhearten.com";
const DEFAULT_ADMIN_PASSWORD = "Admin123!";

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return null;
  }

  return apiUrl.replace(/\/$/, "");
}

async function getAdminAccessToken(): Promise<string | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return null;
  }

  const email = process.env.SKIN_HEARTEN_ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL;
  const password = process.env.SKIN_HEARTEN_ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;

  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { access_token?: string };
  return typeof payload.access_token === "string" ? payload.access_token : null;
}

async function requestAdminJson<TData>(
  path: string,
  options?: {
    body?: AdminOrderUpdateInput | Record<string, unknown>;
    method?: "GET" | "PATCH";
    query?: QueryParams;
  },
): Promise<AdminApiResult<TData>> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return { ok: false, reason: "api_url_missing" };
  }

  try {
    const token = await getAdminAccessToken();
    if (!token) {
      return { ok: false, reason: "auth_failed", status: 401 };
    }

    const url = new URL(`${apiBaseUrl}${path}`);
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === null || value === undefined) {
          continue;
        }
        if (typeof value === "string" && value.trim().length === 0) {
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      method: options?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    if (response.status === 404) {
      return { ok: false, reason: "not_found", status: 404 };
    }

    if (!response.ok) {
      return { ok: false, reason: "fetch_failed", status: response.status };
    }

    const data = (await response.json()) as TData;
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }
}

export async function listAdminOrders(filters?: AdminOrderFilters) {
  return requestAdminJson<AdminOrderSummary[]>("/admin/orders", { query: filters });
}

export async function getAdminOrderDetail(orderId: number) {
  return requestAdminJson<AdminOrderDetail>(`/admin/orders/${orderId}`);
}

export async function updateAdminOrder(orderId: number, payload: AdminOrderUpdateInput) {
  return requestAdminJson<AdminOrderDetail>(`/admin/orders/${orderId}`, {
    body: payload,
    method: "PATCH",
  });
}
