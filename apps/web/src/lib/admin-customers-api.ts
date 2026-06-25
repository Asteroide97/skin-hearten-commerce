import "server-only";

import { requestAdminJson } from "@/lib/admin-api-client";
import type {
  AdminCustomerDetail,
  AdminCustomersFilters,
  PaginatedAdminCustomersResponse,
} from "@/lib/admin-customers";

export async function listAdminCustomers(filters?: AdminCustomersFilters) {
  return requestAdminJson<PaginatedAdminCustomersResponse>("/admin/customers", {
    query: filters,
  });
}

export async function getAdminCustomerDetail(customerId: number) {
  return requestAdminJson<AdminCustomerDetail>(`/admin/customers/${customerId}`);
}
