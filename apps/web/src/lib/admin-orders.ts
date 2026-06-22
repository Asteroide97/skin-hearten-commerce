export type AdminOrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "canceled"
  | "refunded";

export type AdminPaymentStatus =
  | "pending"
  | "requires_action"
  | "paid"
  | "failed"
  | "refunded";

export type AdminPaymentProvider = "mercadopago" | "stripe" | "paypal" | "mock";

export type AdminOrderSummary = {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus | "pending";
  paymentProvider: AdminPaymentProvider | string;
  total: number;
  createdAt: string;
  paidAt: string | null;
};

export type AdminOrderCustomer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
};

export type AdminOrderShippingAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  fullAddress: string;
};

export type AdminOrderItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type AdminOrderPayment = {
  id: number;
  provider: AdminPaymentProvider | string;
  providerReference: string | null;
  status: AdminPaymentStatus | "pending";
  amount: number;
  rawPayloadJson: Record<string, unknown> | null;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminOrderCrmContact = {
  id: number;
  name: string;
  email: string | null;
  whatsapp: string | null;
  lifecycleStatus: string;
};

export type AdminOrderTimestamps = {
  createdAt: string;
  updatedAt: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
};

export type AdminOrderDetail = {
  id: number;
  orderNumber: string;
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus | "pending";
  paymentProvider: AdminPaymentProvider | string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  internalNotes: string | null;
  customer: AdminOrderCustomer;
  shippingAddress: AdminOrderShippingAddress;
  items: AdminOrderItem[];
  payment: AdminOrderPayment;
  rawProviderReference: string | null;
  timestamps: AdminOrderTimestamps;
  crmContact: AdminOrderCrmContact | null;
};

export type AdminOrderFilters = {
  search?: string;
  order_status?: AdminOrderStatus;
  payment_status?: AdminPaymentStatus;
  payment_provider?: AdminPaymentProvider | string;
  date_from?: string;
  date_to?: string;
};

export type AdminOrderUpdateInput = {
  status?: AdminOrderStatus;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  internalNotes?: string | null;
  explicitManualOverride?: boolean;
};

export const ADMIN_ORDER_STATUS_OPTIONS: Array<{ label: string; value: AdminOrderStatus }> = [
  { value: "pending", label: "Pendiente" },
  { value: "paid", label: "Pagada" },
  { value: "preparing", label: "Preparando" },
  { value: "shipped", label: "Enviada" },
  { value: "delivered", label: "Entregada" },
  { value: "canceled", label: "Cancelada" },
  { value: "refunded", label: "Reembolsada" },
];

export const ADMIN_PAYMENT_STATUS_OPTIONS: Array<{ label: string; value: AdminPaymentStatus }> = [
  { value: "pending", label: "Pendiente" },
  { value: "requires_action", label: "Requiere accion" },
  { value: "paid", label: "Pagado" },
  { value: "failed", label: "Fallido" },
  { value: "refunded", label: "Reembolsado" },
];

export const ADMIN_PAYMENT_PROVIDER_OPTIONS: Array<{
  label: string;
  value: AdminPaymentProvider | "all";
}> = [
  { value: "all", label: "Todos los proveedores" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "mock", label: "Mock" },
];

export function getAdminOrderStatusLabel(status: AdminOrderStatus | string) {
  return ADMIN_ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function getAdminPaymentStatusLabel(status: AdminPaymentStatus | string) {
  return ADMIN_PAYMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function getAdminPaymentProviderLabel(provider: AdminPaymentProvider | string) {
  switch (provider) {
    case "mercadopago":
      return "Mercado Pago";
    case "stripe":
      return "Stripe";
    case "paypal":
      return "PayPal";
    case "mock":
      return "Mock";
    default:
      return provider;
  }
}

export function buildAdminOrderWhatsAppHref(phone: string, name: string, orderNumber: string) {
  const normalizedPhone = phone.replace(/\D/g, "");
  const message = `Hola ${name}, te contacto de Skin Hearten sobre tu pedido ${orderNumber}. Estoy disponible para ayudarte con cualquier duda.`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function buildAdminOrderMailtoHref(email: string, orderNumber: string) {
  const params = new URLSearchParams({
    subject: `Seguimiento de tu pedido ${orderNumber}`,
    body: `Hola, te escribimos de Skin Hearten para dar seguimiento a tu pedido ${orderNumber}.`,
  });
  return `mailto:${email}?${params.toString()}`;
}
