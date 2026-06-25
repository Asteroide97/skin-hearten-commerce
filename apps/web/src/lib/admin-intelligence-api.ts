import "server-only";

import { requestAdminJson } from "@/lib/admin-api-client";
import type { IntelligenceAskResponse, IntelligenceDashboard } from "@/lib/admin-intelligence";

export async function getAdminIntelligenceDashboard() {
  return requestAdminJson<IntelligenceDashboard>("/admin/intelligence");
}

export async function askAdminIntelligence(question: string) {
  return requestAdminJson<IntelligenceAskResponse>("/admin/intelligence/ask", {
    method: "POST",
    body: { question },
  });
}
