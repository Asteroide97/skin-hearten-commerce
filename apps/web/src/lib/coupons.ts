import type { CartItem } from "@/store/cart-store";

export type CouponValidationRequest = {
  code: string;
  items: Array<{
    productId?: string;
    slug?: string;
    name?: string;
    quantity: number;
    unitPrice: number;
  }>;
  customerEmail?: string;
  customerPhone?: string;
  subtotal: number;
};

export type CouponValidationResponse = {
  valid: boolean;
  code: string | null;
  discountType: "percentage" | "fixed_amount" | "free_shipping" | null;
  discountAmount: number;
  freeShipping: boolean;
  reasonCode:
    | "invalid_code"
    | "inactive"
    | "not_started"
    | "expired"
    | "usage_limit_reached"
    | "per_customer_limit_reached"
    | "subtotal_too_low"
    | "valid";
  message: string;
};

type CouponValidationResult =
  | { ok: true; data: CouponValidationResponse; source: "api" | "local_mock" }
  | { ok: false; reason: "fetch_failed" | "invalid_response"; message: string };

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return null;
  }

  return apiUrl.replace(/\/$/, "");
}

function isCouponValidationResponse(value: unknown): value is CouponValidationResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.valid === "boolean" &&
    (candidate.code === null || typeof candidate.code === "string") &&
    (candidate.discountType === null || typeof candidate.discountType === "string") &&
    typeof candidate.discountAmount === "number" &&
    typeof candidate.freeShipping === "boolean" &&
    typeof candidate.reasonCode === "string" &&
    typeof candidate.message === "string"
  );
}

function buildLocalCouponValidation(payload: CouponValidationRequest): CouponValidationResponse {
  const normalizedCode = payload.code.trim().toUpperCase();
  const subtotal = Math.max(0, Number(payload.subtotal || 0));

  if (!normalizedCode) {
    return {
      valid: false,
      code: null,
      discountType: null,
      discountAmount: 0,
      freeShipping: false,
      reasonCode: "invalid_code",
      message: "Ingresa un codigo de cupon.",
    };
  }

  if (normalizedCode === "GLOW10" && subtotal >= 500) {
    return {
      valid: true,
      code: normalizedCode,
      discountType: "percentage",
      discountAmount: Number((subtotal * 0.1).toFixed(2)),
      freeShipping: false,
      reasonCode: "valid",
      message: "Cupon aplicado correctamente.",
    };
  }

  if (normalizedCode === "GLOW10") {
    return {
      valid: false,
      code: normalizedCode,
      discountType: null,
      discountAmount: 0,
      freeShipping: false,
      reasonCode: "subtotal_too_low",
      message: "Este cupon requiere un subtotal minimo de $500.00.",
    };
  }

  if (normalizedCode === "ENVIOGRATIS" && subtotal >= 1200) {
    return {
      valid: true,
      code: normalizedCode,
      discountType: "free_shipping",
      discountAmount: 0,
      freeShipping: true,
      reasonCode: "valid",
      message: "Envio gratis aplicado.",
    };
  }

  if (normalizedCode === "ENVIOGRATIS") {
    return {
      valid: false,
      code: normalizedCode,
      discountType: null,
      discountAmount: 0,
      freeShipping: false,
      reasonCode: "subtotal_too_low",
      message: "Este cupon requiere un subtotal minimo de $1200.00.",
    };
  }

  if (normalizedCode === "BIENVENIDA15") {
    return {
      valid: true,
      code: normalizedCode,
      discountType: "percentage",
      discountAmount: Number((subtotal * 0.15).toFixed(2)),
      freeShipping: false,
      reasonCode: "valid",
      message: "Cupon aplicado correctamente.",
    };
  }

  return {
    valid: false,
    code: normalizedCode,
    discountType: null,
    discountAmount: 0,
    freeShipping: false,
    reasonCode: "invalid_code",
    message: "Cupon invalido.",
  };
}

export function buildCouponValidationRequest(input: {
  code: string;
  items: CartItem[];
  subtotal: number;
  customerEmail?: string;
  customerPhone?: string;
}): CouponValidationRequest {
  return {
    code: input.code,
    items: input.items.map((item) => ({
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
    })),
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    subtotal: input.subtotal,
  };
}

export async function validateCouponCode(
  payload: CouponValidationRequest,
): Promise<CouponValidationResult> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      ok: true,
      data: buildLocalCouponValidation(payload),
      source: "local_mock",
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/coupons/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        ok: true,
        data: buildLocalCouponValidation(payload),
        source: "local_mock",
      };
    }

    const data = (await response.json()) as CouponValidationResponse;
    if (!isCouponValidationResponse(data)) {
      return {
        ok: false,
        reason: "invalid_response",
        message: "La API devolvio una respuesta invalida para cupones.",
      };
    }

    return { ok: true, data, source: "api" };
  } catch {
    return {
      ok: true,
      data: buildLocalCouponValidation(payload),
      source: "local_mock",
    };
  }
}
