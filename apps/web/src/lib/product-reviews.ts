export type ProductReview = {
  id: number;
  customerName: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  createdAt: string;
};

export type ProductReviewSummary = {
  productId: number;
  averageRating: number;
  reviewCount: number;
  reviews: ProductReview[];
};

export type ProductReviewCreateInput = {
  customerName: string;
  customerEmail?: string;
  rating: number;
  title?: string;
  body: string;
};

export type ProductReviewCreateResponse = {
  id: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export function createEmptyProductReviewSummary(productId: number): ProductReviewSummary {
  return {
    productId,
    averageRating: 0,
    reviewCount: 0,
    reviews: [],
  };
}
