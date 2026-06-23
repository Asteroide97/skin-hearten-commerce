import "server-only";

import type {
  AdminProduct,
  AdminProductImage,
  AdminProductImageUpdateInput,
} from "@/lib/admin-products";

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
  message?: string;
  status?: number;
};

type AdminApiResult<TData> = AdminApiSuccess<TData> | AdminApiFailure;

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

async function readFailure(response: Response): Promise<AdminApiFailure> {
  let message: string | undefined;
  try {
    const payload = (await response.json()) as { detail?: string };
    if (typeof payload.detail === "string" && payload.detail.trim().length > 0) {
      message = payload.detail;
    }
  } catch {
    // Keep default undefined message.
  }

  if (response.status === 404) {
    return { ok: false, reason: "not_found", status: 404, message };
  }

  return { ok: false, reason: "fetch_failed", status: response.status, message };
}

async function requestAdminJson<TData>(
  path: string,
  options?: {
    body?: AdminProductImageUpdateInput | Record<string, unknown>;
    method?: "GET" | "PATCH" | "DELETE";
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

    const response = await fetch(`${apiBaseUrl}${path}`, {
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

async function requestAdminFormData<TData>(
  path: string,
  formData: FormData,
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

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
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

export async function listAdminProducts() {
  return requestAdminJson<AdminProduct[]>("/admin/products");
}

export async function getAdminProduct(productId: number) {
  return requestAdminJson<AdminProduct>(`/admin/products/${productId}`);
}

export async function uploadAdminProductImage(productId: number, formData: FormData) {
  return requestAdminFormData<AdminProductImage>(`/admin/products/${productId}/images`, formData);
}

export async function updateAdminProductImage(
  productId: number,
  imageId: number,
  payload: AdminProductImageUpdateInput,
) {
  return requestAdminJson<AdminProductImage>(`/admin/products/${productId}/images/${imageId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function deleteAdminProductImage(productId: number, imageId: number) {
  return requestAdminJson<{ message: string }>(`/admin/products/${productId}/images/${imageId}`, {
    method: "DELETE",
  });
}
