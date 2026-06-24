import "server-only";

import { requestAdminJson } from "@/lib/admin-api-client";
import type {
  AdminOrderDetail,
  AdminOrderFilters,
  AdminOrderSummary,
  AdminOrderUpdateInput,
} from "@/lib/admin-orders";

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
