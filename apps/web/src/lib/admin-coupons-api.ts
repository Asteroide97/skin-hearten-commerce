import "server-only";

import { requestAdminJson } from "@/lib/admin-api-client";
import type { AdminCoupon, AdminCouponUpdateInput, AdminCouponWriteInput } from "@/lib/admin-coupons";

export async function listAdminCoupons() {
  return requestAdminJson<AdminCoupon[]>("/admin/coupons");
}

export async function createAdminCoupon(payload: AdminCouponWriteInput) {
  return requestAdminJson<AdminCoupon>("/admin/coupons", {
    body: payload,
    method: "POST",
  });
}

export async function getAdminCoupon(couponId: number) {
  return requestAdminJson<AdminCoupon>(`/admin/coupons/${couponId}`);
}

export async function updateAdminCoupon(couponId: number, payload: AdminCouponUpdateInput) {
  return requestAdminJson<AdminCoupon>(`/admin/coupons/${couponId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function deleteAdminCoupon(couponId: number) {
  return requestAdminJson<{ message: string }>(`/admin/coupons/${couponId}`, {
    method: "DELETE",
  });
}

export async function duplicateAdminCoupon(couponId: number, code: string) {
  return requestAdminJson<AdminCoupon>(`/admin/coupons/${couponId}/duplicate`, {
    body: { code },
    method: "POST",
  });
}
