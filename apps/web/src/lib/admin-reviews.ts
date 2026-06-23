export type AdminProductReviewStatus = "pending" | "approved" | "rejected";
export type AdminProductReviewSource = "customer" | "imported" | "admin";

export type AdminProductReview = {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  customerName: string;
  customerEmail: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: AdminProductReviewStatus;
  source: AdminProductReviewSource;
  createdAt: string;
  approvedAt: string | null;
};

export type AdminProductReviewFilters = {
  product?: string;
  rating?: number;
  search?: string;
  status?: AdminProductReviewStatus;
};

export type AdminProductReviewUpdateInput = {
  status?: AdminProductReviewStatus;
  title?: string | null;
  body?: string;
};

export const ADMIN_PRODUCT_REVIEW_STATUS_OPTIONS: Array<{
  value: AdminProductReviewStatus;
  label: string;
}> = [
  { value: "pending", label: "Pendiente" },
  { value: "approved", label: "Aprobada" },
  { value: "rejected", label: "Rechazada" },
];

export const ADMIN_PRODUCT_REVIEW_RATING_OPTIONS = [
  { value: "all", label: "Todas las calificaciones" },
  { value: "5", label: "5 estrellas" },
  { value: "4", label: "4 estrellas" },
  { value: "3", label: "3 estrellas" },
  { value: "2", label: "2 estrellas" },
  { value: "1", label: "1 estrella" },
] as const;

export function getAdminProductReviewStatusLabel(status: AdminProductReviewStatus) {
  return ADMIN_PRODUCT_REVIEW_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function getAdminProductReviewSourceLabel(source: AdminProductReviewSource) {
  switch (source) {
    case "customer":
      return "Clienta";
    case "imported":
      return "Importada";
    case "admin":
      return "Admin";
    default:
      return source;
  }
}
