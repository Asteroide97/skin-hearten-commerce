import "server-only";

import type {
  CustomerOrderDetail,
  CustomerOrderLookupInput,
  CustomerOrderSummary,
} from "@/lib/customer-orders";

type CustomerOrdersApiFailureReason =
  | "api_url_missing"
  | "fetch_failed"
  | "invalid_response"
  | "not_found";

type CustomerOrdersApiSuccess<TData> = {
  ok: true;
  data: TData;
};

type CustomerOrdersApiFailure = {
  ok: false;
  reason: CustomerOrdersApiFailureReason;
  message?: string;
  status?: number;
};

type CustomerOrdersApiResult<TData> = CustomerOrdersApiSuccess<TData> | CustomerOrdersApiFailure;

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return null;
  }

  return apiUrl.replace(/\/$/, "");
}

async function requestCustomerOrdersJson<TData>(
  path: string,
  payload: CustomerOrderLookupInput,
): Promise<CustomerOrdersApiResult<TData>> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      ok: false,
      reason: "api_url_missing",
      message: "Configura NEXT_PUBLIC_API_URL para consultar pedidos reales.",
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      let message = "No pudimos consultar pedidos por ahora.";
      try {
        const errorPayload = (await response.json()) as { detail?: string };
        if (typeof errorPayload.detail === "string" && errorPayload.detail.trim().length > 0) {
          message = errorPayload.detail;
        }
      } catch {
        // Keep fallback message.
      }

      return {
        ok: false,
        reason: response.status === 404 ? "not_found" : "fetch_failed",
        message,
        status: response.status,
      };
    }

    const data = (await response.json()) as TData;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      reason: "fetch_failed",
      message: "No pudimos conectar con la API de pedidos.",
    };
  }
}

export async function lookupCustomerOrders(payload: CustomerOrderLookupInput) {
  return requestCustomerOrdersJson<CustomerOrderSummary[]>("/customer/orders/lookup", payload);
}

export async function verifyCustomerOrder(orderId: number, payload: CustomerOrderLookupInput) {
  return requestCustomerOrdersJson<CustomerOrderDetail>(`/customer/orders/${orderId}/verify`, payload);
}
