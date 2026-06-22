import "server-only";

import type { SkinQuizAnalyticsResponse } from "@/lib/admin-skin-quiz-analytics";
import type {
  AdminSkinQuizLead,
  AdminSkinQuizLeadDetail,
  AdminSkinQuizLeadFilters,
  AdminSkinQuizLeadUpdateInput,
} from "@/lib/admin-skin-quiz-leads";

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
    body?: AdminSkinQuizLeadUpdateInput | Record<string, unknown>;
    filters?: AdminSkinQuizLeadFilters;
    method?: "GET" | "PATCH";
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
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (typeof value === "string" && value.trim().length > 0) {
          url.searchParams.set(key, value.trim());
        }
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

export async function listAdminSkinQuizLeads(filters?: AdminSkinQuizLeadFilters) {
  return requestAdminJson<AdminSkinQuizLead[]>("/admin/skin-quiz/leads", { filters });
}

export async function getAdminSkinQuizLeadDetail(leadId: number) {
  return requestAdminJson<AdminSkinQuizLeadDetail>(`/admin/skin-quiz/leads/${leadId}`);
}

export async function updateAdminSkinQuizLead(leadId: number, payload: AdminSkinQuizLeadUpdateInput) {
  return requestAdminJson<AdminSkinQuizLeadDetail>(`/admin/skin-quiz/leads/${leadId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function getAdminSkinQuizAnalytics() {
  return requestAdminJson<SkinQuizAnalyticsResponse>("/admin/skin-quiz/analytics");
}
