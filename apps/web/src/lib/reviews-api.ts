import "server-only";

import type {
  ReviewsListResponse,
  ReviewsSummary,
  VerifiedReviewCreateInput,
  VerifiedReviewCreateResponse,
} from "@/lib/reviews";

type ReviewsApiFailureReason =
  | "api_url_missing"
  | "fetch_failed"
  | "invalid_response"
  | "not_found";

type ReviewsApiSuccess<TData> = {
  ok: true;
  data: TData;
};

type ReviewsApiFailure = {
  ok: false;
  reason: ReviewsApiFailureReason;
  message?: string;
  status?: number;
};

type ReviewsApiResult<TData> = ReviewsApiSuccess<TData> | ReviewsApiFailure;

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return null;
  }

  return apiUrl.replace(/\/$/, "");
}

export async function getReviewsSummary(): Promise<ReviewsApiResult<ReviewsSummary>> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      ok: false,
      reason: "api_url_missing",
      message: "Configura NEXT_PUBLIC_API_URL para consultar resenas reales.",
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/reviews/summary`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, reason: "fetch_failed", status: response.status };
    }

    const data = (await response.json()) as ReviewsSummary;
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "fetch_failed", message: "No pudimos cargar el resumen de resenas." };
  }
}

export async function getApprovedReviews(params?: {
  page?: number;
  pageSize?: number;
  product?: string;
  rating?: number;
}): Promise<ReviewsApiResult<ReviewsListResponse>> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      ok: false,
      reason: "api_url_missing",
      message: "Configura NEXT_PUBLIC_API_URL para consultar resenas reales.",
    };
  }

  const query = new URLSearchParams();
  if (typeof params?.page === "number") {
    query.set("page", String(params.page));
  }
  if (typeof params?.pageSize === "number") {
    query.set("pageSize", String(params.pageSize));
  }
  if (params?.product && params.product.trim().length > 0) {
    query.set("product", params.product.trim());
  }
  if (typeof params?.rating === "number") {
    query.set("rating", String(params.rating));
  }

  const queryString = query.toString().length > 0 ? `?${query.toString()}` : "";

  try {
    const response = await fetch(`${apiBaseUrl}/reviews${queryString}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, reason: "fetch_failed", status: response.status };
    }

    const data = (await response.json()) as ReviewsListResponse;
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "fetch_failed", message: "No pudimos cargar las resenas." };
  }
}

export async function createVerifiedReview(
  payload: VerifiedReviewCreateInput,
): Promise<ReviewsApiResult<VerifiedReviewCreateResponse>> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      ok: false,
      reason: "api_url_missing",
      message: "Configura NEXT_PUBLIC_API_URL para enviar resenas verificadas.",
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/reviews/verified`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      let message = "No pudimos validar tu compra para registrar la resena.";
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

    const data = (await response.json()) as VerifiedReviewCreateResponse;
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "fetch_failed", message: "No pudimos enviar tu resena verificada." };
  }
}
