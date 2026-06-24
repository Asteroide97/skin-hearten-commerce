import "server-only";

import { requestAdminFormData, requestAdminJson } from "@/lib/admin-api-client";
import type {
  AdminProduct,
  AdminProductImage,
  AdminProductImageUpdateInput,
} from "@/lib/admin-products";

export async function listAdminProducts() {
  return requestAdminJson<AdminProduct[]>("/admin/products");
}

export async function getAdminProduct(productId: number) {
  return requestAdminJson<AdminProduct>(`/admin/products/${productId}`);
}

export async function uploadAdminProductImage(productId: number, formData: FormData) {
  return requestAdminFormData<AdminProductImage>(`/admin/products/${productId}/images`, formData);
}

export async function updateAdminProductImage(
  productId: number,
  imageId: number,
  payload: AdminProductImageUpdateInput,
) {
  return requestAdminJson<AdminProductImage>(`/admin/products/${productId}/images/${imageId}`, {
    body: payload,
    method: "PATCH",
  });
}

export async function deleteAdminProductImage(productId: number, imageId: number) {
  return requestAdminJson<{ message: string }>(`/admin/products/${productId}/images/${imageId}`, {
    method: "DELETE",
  });
}
