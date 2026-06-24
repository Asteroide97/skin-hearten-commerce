import "server-only";

import { requestAdminJson } from "@/lib/admin-api-client";
import type { SkinQuizAnalyticsResponse } from "@/lib/admin-skin-quiz-analytics";
import type {
  AdminSkinQuizLead,
  AdminSkinQuizLeadDetail,
  AdminSkinQuizLeadFilters,
  AdminSkinQuizLeadUpdateInput,
} from "@/lib/admin-skin-quiz-leads";

export async function listAdminSkinQuizLeads(filters?: AdminSkinQuizLeadFilters) {
  return requestAdminJson<AdminSkinQuizLead[]>("/admin/skin-quiz/leads", { query: filters });
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
