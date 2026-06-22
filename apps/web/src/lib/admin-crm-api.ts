import "server-only";

import type {
  CRMAutomationRule,
  CRMAutomationRuleUpdateInput,
  CRMAutomationRun,
  CRMContactDetail,
  CRMContactFilters,
  CRMContactSummary,
  CRMContactUpdateInput,
  CRMMessageTemplate,
  CRMMessageTemplatePreviewInput,
  CRMMessageTemplatePreviewResult,
  CRMMessageTemplateUpdateInput,
  CRMNote,
  CRMNoteCreateInput,
  CRMReminderCreateInput,
  CRMReminderDetail,
  CRMReminderFilters,
  CRMReminderSummary,
  CRMReminderUpdateInput,
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

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

type RequestBody =
  | CRMAutomationRuleUpdateInput
  | CRMContactUpdateInput
  | CRMMessageTemplatePreviewInput
  | CRMMessageTemplateUpdateInput
  | CRMNoteCreateInput
  | CRMReminderCreateInput
  | CRMReminderUpdateInput
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
    method?: "GET" | "PATCH" | "POST";
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

export async function listAdminCrmContacts(filters?: CRMContactFilters) {
  return requestAdminJson<CRMContactSummary[]>("/admin/crm/contacts", { query: filters });
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

export async function createAdminCrmReminder(contactId: number, payload: CRMReminderCreateInput) {
  return requestAdminJson<CRMReminderDetail>(`/admin/crm/contacts/${contactId}/reminders`, {
    body: payload,
    method: "POST",
  });
}

export async function listAdminCrmReminders(filters?: CRMReminderFilters) {
  return requestAdminJson<CRMReminderSummary[]>("/admin/crm/reminders", { query: filters });
}

export async function getAdminCrmReminderDetail(reminderId: number) {
  return requestAdminJson<CRMReminderDetail>(`/admin/crm/reminders/${reminderId}`);
}

export async function updateAdminCrmReminder(reminderId: number, payload: CRMReminderUpdateInput) {
  return requestAdminJson<CRMReminderDetail>(`/admin/crm/reminders/${reminderId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function markAdminCrmReminderSentManual(reminderId: number) {
  return requestAdminJson<CRMReminderDetail>(`/admin/crm/reminders/${reminderId}/mark-sent-manual`, {
    method: "POST",
  });
}

export async function skipAdminCrmReminder(reminderId: number) {
  return requestAdminJson<CRMReminderDetail>(`/admin/crm/reminders/${reminderId}/skip`, {
    method: "POST",
  });
}

export async function listAdminCrmMessageTemplates() {
  return requestAdminJson<CRMMessageTemplate[]>("/admin/crm/message-templates");
}

export async function updateAdminCrmMessageTemplate(
  templateId: number,
  payload: CRMMessageTemplateUpdateInput,
) {
  return requestAdminJson<CRMMessageTemplate>(`/admin/crm/message-templates/${templateId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function previewAdminCrmMessageTemplate(
  templateId: number,
  payload: CRMMessageTemplatePreviewInput,
) {
  return requestAdminJson<CRMMessageTemplatePreviewResult>(
    `/admin/crm/message-templates/${templateId}/preview`,
    {
      body: payload,
      method: "POST",
    },
  );
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
  return requestAdminJson<CRMAutomationRun[]>("/admin/crm/automations/runs", {
    query: { limit },
  });
}
