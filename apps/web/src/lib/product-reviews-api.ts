import "server-only";

import type {
  ProductReviewCreateInput,
  ProductReviewCreateResponse,
  ProductReviewSummary,
} from "@/lib/product-reviews";

type ProductReviewsApiFailureReason =
  | "api_url_missing"
  | "fetch_failed"
  | "invalid_response"
  | "not_found";

type ProductReviewsApiSuccess<TData> = {
  ok: true;
  data: TData;
};

type ProductReviewsApiFailure = {
  ok: false;
  reason: ProductReviewsApiFailureReason;
  message?: string;
  status?: number;
};

type ProductReviewsApiResult<TData> = ProductReviewsApiSuccess<TData> | ProductReviewsApiFailure;

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return null;
  }

  return apiUrl.replace(/\/$/, "");
}

export async function getProductReviews(productRef: string): Promise<ProductReviewsApiResult<ProductReviewSummary>> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      ok: false,
      reason: "api_url_missing",
      message: "Configura NEXT_PUBLIC_API_URL para consultar resenas reales.",
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/products/${encodeURIComponent(productRef)}/reviews`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      return { ok: false, reason: "not_found", status: 404, message: "Producto no encontrado." };
    }

    if (!response.ok) {
      return { ok: false, reason: "fetch_failed", status: response.status };
    }

    const data = (await response.json()) as ProductReviewSummary;
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "fetch_failed", message: "No pudimos cargar las resenas." };
  }
}

export async function createProductReview(
  productRef: string,
  payload: ProductReviewCreateInput,
): Promise<ProductReviewsApiResult<ProductReviewCreateResponse>> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      ok: false,
      reason: "api_url_missing",
      message: "Configura NEXT_PUBLIC_API_URL para enviar resenas.",
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/products/${encodeURIComponent(productRef)}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (response.status === 404) {
      return { ok: false, reason: "not_found", status: 404, message: "Producto no encontrado." };
    }

    if (!response.ok) {
      let message = "No pudimos enviar tu resena.";
      try {
        const errorPayload = (await response.json()) as { detail?: string };
        if (typeof errorPayload.detail === "string" && errorPayload.detail.trim().length > 0) {
          message = errorPayload.detail;
        }
      } catch {
        // Keep fallback message.
      }

      return { ok: false, reason: "fetch_failed", status: response.status, message };
    }

    const data = (await response.json()) as ProductReviewCreateResponse;
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "fetch_failed", message: "No pudimos enviar tu resena." };
  }
}
