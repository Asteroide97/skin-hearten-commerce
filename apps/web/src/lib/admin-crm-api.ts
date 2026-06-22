import "server-only";

import type {
  CRMAutomationRule,
  CRMAutomationRuleUpdateInput,
  CRMAutomationRun,
  CRMContactDetail,
  CRMContactFilters,
  CRMContactSummary,
  CRMContactUpdateInput,
  CRMNote,
  CRMNoteCreateInput,
  CRMTask,
  CRMTaskCreateInput,
  CRMTaskUpdateInput,
} from "@/lib/admin-crm";

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

type RequestBody =
  | CRMContactUpdateInput
  | CRMAutomationRuleUpdateInput
  | CRMNoteCreateInput
  | CRMTaskCreateInput
  | CRMTaskUpdateInput
  | Record<string, unknown>;

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
    body?: RequestBody;
    filters?: CRMContactFilters;
    method?: "GET" | "PATCH" | "POST";
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

export async function listAdminCrmContacts(filters?: CRMContactFilters) {
  return requestAdminJson<CRMContactSummary[]>("/admin/crm/contacts", { filters });
}

export async function getAdminCrmContactDetail(contactId: number) {
  return requestAdminJson<CRMContactDetail>(`/admin/crm/contacts/${contactId}`);
}

export async function updateAdminCrmContact(contactId: number, payload: CRMContactUpdateInput) {
  return requestAdminJson<CRMContactDetail>(`/admin/crm/contacts/${contactId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function createAdminCrmNote(contactId: number, payload: CRMNoteCreateInput) {
  return requestAdminJson<CRMNote>(`/admin/crm/contacts/${contactId}/notes`, {
    body: payload,
    method: "POST",
  });
}

export async function createAdminCrmTask(contactId: number, payload: CRMTaskCreateInput) {
  return requestAdminJson<CRMTask>(`/admin/crm/contacts/${contactId}/tasks`, {
    body: payload,
    method: "POST",
  });
}

export async function updateAdminCrmTask(taskId: number, payload: CRMTaskUpdateInput) {
  return requestAdminJson<CRMTask>(`/admin/crm/tasks/${taskId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function listAdminCrmAutomationRules() {
  return requestAdminJson<CRMAutomationRule[]>("/admin/crm/automations/rules");
}

export async function updateAdminCrmAutomationRule(
  ruleId: number,
  payload: CRMAutomationRuleUpdateInput,
) {
  return requestAdminJson<CRMAutomationRule>(`/admin/crm/automations/rules/${ruleId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function listAdminCrmAutomationRuns(limit = 50) {
  return requestAdminJson<CRMAutomationRun[]>(`/admin/crm/automations/runs?limit=${limit}`);
}
