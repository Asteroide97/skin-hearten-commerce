import "server-only";

import { requestAdminJson } from "@/lib/admin-api-client";
import type {
  AdminProductReview,
  AdminProductReviewFilters,
  AdminProductReviewUpdateInput,
} from "@/lib/admin-reviews";

export async function listAdminReviews(filters?: AdminProductReviewFilters) {
  return requestAdminJson<AdminProductReview[]>("/admin/reviews", { query: filters });
}

export async function updateAdminReview(reviewId: number, payload: AdminProductReviewUpdateInput) {
  return requestAdminJson<AdminProductReview>(`/admin/reviews/${reviewId}`, {
    body: payload,
    method: "PATCH",
  });
}
