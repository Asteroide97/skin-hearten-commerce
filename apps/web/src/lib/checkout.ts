import type { CartItem } from "@/store/cart-store";

export const LAST_CHECKOUT_ORDER_STORAGE_KEY = "skin-hearten.last-checkout-order";
export const CHECKOUT_SUCCESS_TRACKING_KEY = "skin-hearten.checkout-success-tracked";

export type CheckoutPaymentMethod = "mercadopago" | "paypal" | "stripe" | "mock";

export type CheckoutCustomerPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type CheckoutShippingAddressPayload = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type CheckoutItemPayload = {
  productId: string;
  slug: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type CheckoutRequestPayload = {
  customer: CheckoutCustomerPayload;
  shippingAddress: CheckoutShippingAddressPayload;
  items: CheckoutItemPayload[];
  couponCode?: string;
  paymentMethod: CheckoutPaymentMethod;
};

export type CheckoutNextAction =
  | {
      type: "redirect";
      provider: "mercadopago" | "stripe";
      url: string;
    }
  | {
      type: "show_order_confirmation";
      provider?: string;
      url?: string | null;
    };

export type CheckoutOrderSummary = {
  orderId: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  nextAction: CheckoutNextAction;
};

export type StoredCheckoutOrder = CheckoutOrderSummary & {
  createdAt: string;
  customerName: string;
};

type CheckoutResult =
  | { ok: true; data: CheckoutOrderSummary; source: "api" | "local_mock" }
  | { ok: false; reason: "api_url_missing" | "fetch_failed" | "invalid_response"; message: string };

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return null;
  }

  return apiUrl.replace(/\/$/, "");
}

function getLocalStorage() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  return window.localStorage;
}

function isCheckoutNextAction(value: unknown): value is CheckoutNextAction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.type === "show_order_confirmation") {
    return true;
  }

  return (
    candidate.type === "redirect" &&
    (candidate.provider === "mercadopago" || candidate.provider === "stripe") &&
    typeof candidate.url === "string" &&
    candidate.url.length > 0
  );
}

function isCheckoutOrderSummary(value: unknown): value is CheckoutOrderSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.orderId === "number" &&
    typeof candidate.orderNumber === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.paymentStatus === "string" &&
    typeof candidate.subtotal === "number" &&
    typeof candidate.discount === "number" &&
    typeof candidate.shipping === "number" &&
    typeof candidate.total === "number" &&
    isCheckoutNextAction(candidate.nextAction)
  );
}

function buildMockCheckoutResponse(payload: CheckoutRequestPayload) {
  const subtotal = payload.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const normalizedCoupon = payload.couponCode?.trim().toUpperCase();
  const discount = normalizedCoupon === "GLOW10" ? Number((subtotal * 0.1).toFixed(2)) : 0;
  const shipping = normalizedCoupon === "ENVIOGRATIS" || subtotal >= 1999 ? 0 : 149;
  const total = Number((subtotal - discount + shipping).toFixed(2));
  const createdSeed = Date.now();
  const isMockPaid = payload.paymentMethod === "stripe";

  return {
    orderId: createdSeed,
    orderNumber: `SH-LOCAL-${String(createdSeed).slice(-6)}`,
    status: isMockPaid ? "paid" : "pending",
    paymentStatus: isMockPaid ? "mock_paid" : "pending",
    subtotal,
    discount,
    shipping,
    total,
    nextAction: {
      type: "show_order_confirmation",
      provider: "mock",
    },
  } satisfies CheckoutOrderSummary;
}

export function buildCheckoutRequestPayload(input: {
  couponCode?: string;
  customer: CheckoutCustomerPayload;
  items: CartItem[];
  paymentMethod: CheckoutPaymentMethod;
  shippingAddress: CheckoutShippingAddressPayload;
}): CheckoutRequestPayload {
  return {
    customer: input.customer,
    shippingAddress: input.shippingAddress,
    items: input.items.map((item) => ({
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
    })),
    couponCode: input.couponCode,
    paymentMethod: input.paymentMethod,
  };
}

export async function submitCheckoutOrder(
  payload: CheckoutRequestPayload,
  idempotencyKey: string,
): Promise<CheckoutResult> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      ok: true,
      data: buildMockCheckoutResponse(payload),
      source: "local_mock",
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = "No pudimos crear tu pedido. Intenta de nuevo.";
      try {
        const errorPayload = (await response.json()) as { detail?: string };
        if (typeof errorPayload.detail === "string" && errorPayload.detail.trim().length > 0) {
          message = errorPayload.detail;
        }
      } catch {
        // Ignore JSON parse issues and keep the fallback copy.
      }

      return {
        ok: false,
        reason: "fetch_failed",
        message,
      };
    }

    const data = (await response.json()) as CheckoutOrderSummary;
    if (!isCheckoutOrderSummary(data)) {
      return {
        ok: false,
        reason: "invalid_response",
        message: "La API devolvio una respuesta de checkout invalida.",
      };
    }

    return { ok: true, data, source: "api" };
  } catch (error) {
    return {
      ok: false,
      reason: "fetch_failed",
      message: error instanceof Error ? error.message : "No pudimos conectar con la API.",
    };
  }
}

export function saveLastCheckoutOrder(order: StoredCheckoutOrder) {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.setItem(LAST_CHECKOUT_ORDER_STORAGE_KEY, JSON.stringify(order));
}

export function updateLastCheckoutOrder(patch: Partial<StoredCheckoutOrder>) {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  const current = readLastCheckoutOrder();
  if (!current) {
    return null;
  }

  const nextValue = { ...current, ...patch };
  storage.setItem(LAST_CHECKOUT_ORDER_STORAGE_KEY, JSON.stringify(nextValue));
  return nextValue;
}

export function readLastCheckoutOrder() {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(LAST_CHECKOUT_ORDER_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredCheckoutOrder;
    if (
      isCheckoutOrderSummary(parsed) &&
      typeof parsed.customerName === "string" &&
      typeof parsed.createdAt === "string"
    ) {
      return parsed;
    }

    storage.removeItem(LAST_CHECKOUT_ORDER_STORAGE_KEY);
    return null;
  } catch {
    storage.removeItem(LAST_CHECKOUT_ORDER_STORAGE_KEY);
    return null;
  }
}

export function markCheckoutSuccessTracked(orderId: number) {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.setItem(CHECKOUT_SUCCESS_TRACKING_KEY, String(orderId));
}

export function hasCheckoutSuccessBeenTracked(orderId: number) {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  return storage.getItem(CHECKOUT_SUCCESS_TRACKING_KEY) === String(orderId);
}

export function buildCheckoutIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `checkout-${Date.now()}`;
}
