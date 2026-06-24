import "server-only";

import { requestAdminFormData, requestAdminJson } from "@/lib/admin-api-client";
import type {
  AdminImportJobDetail,
  AdminImportJobSummary,
  AdminImportType,
} from "@/lib/admin-imports";

export async function listAdminImportJobs() {
  return requestAdminJson<AdminImportJobSummary[]>("/admin/imports");
}

export async function getAdminImportJobDetail(jobId: number) {
  return requestAdminJson<AdminImportJobDetail>(`/admin/imports/${jobId}`);
}

export async function uploadAdminShopifyImport(
  importType: AdminImportType,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file, file.name);

  return requestAdminFormData<AdminImportJobDetail>(`/admin/imports/shopify/${importType}`, formData);
}
