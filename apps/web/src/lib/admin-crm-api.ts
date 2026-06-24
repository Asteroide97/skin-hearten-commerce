import "server-only";

import { requestAdminJson } from "@/lib/admin-api-client";
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
