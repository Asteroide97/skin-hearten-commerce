export type CustomerOrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "canceled"
  | "refunded"
  | string;

export type CustomerPaymentStatus =
  | "pending"
  | "requires_action"
  | "paid"
  | "failed"
  | "refunded"
  | "mock_paid"
  | string;

export type CustomerPaymentProvider = "mercadopago" | "stripe" | "paypal" | "mock" | string;

export type CustomerOrderLookupInput = {
  email?: string;
  phone?: string;
};

export type CustomerOrderSummary = {
  orderId: number;
  orderNumber: string;
  status: CustomerOrderStatus;
  paymentStatus: CustomerPaymentStatus;
  paymentProvider: CustomerPaymentProvider;
  total: number;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  trackingNumber: string | null;
  shippingCarrier: string | null;
};

export type CustomerOrderItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type CustomerOrderCustomer = {
  name: string;
  email: string | null;
  phone: string | null;
};

export type CustomerOrderShippingAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  fullAddress: string;
};

export type CustomerOrderTracking = {
  trackingNumber: string | null;
  shippingCarrier: string | null;
};

export type CustomerOrderTimestamps = {
  createdAt: string;
  updatedAt: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
};

export type CustomerOrderDetail = {
  orderId: number;
  orderNumber: string;
  customer: CustomerOrderCustomer;
  shippingAddress: CustomerOrderShippingAddress;
  items: CustomerOrderItem[];
  paymentStatus: CustomerPaymentStatus;
  paymentProvider: CustomerPaymentProvider;
  orderStatus: CustomerOrderStatus;
  tracking: CustomerOrderTracking;
  timestamps: CustomerOrderTimestamps;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
};

const SUPPORT_WHATSAPP_NUMBER = "525500000000";

export function getCustomerOrderStatusLabel(status: CustomerOrderStatus) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "paid":
      return "Pagada";
    case "preparing":
      return "Preparando";
    case "shipped":
      return "Enviada";
    case "delivered":
      return "Entregada";
    case "canceled":
      return "Cancelada";
    case "refunded":
      return "Reembolsada";
    default:
      return status;
  }
}

export function getCustomerPaymentStatusLabel(status: CustomerPaymentStatus) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "requires_action":
      return "Requiere accion";
    case "paid":
      return "Pagado";
    case "failed":
      return "Fallido";
    case "refunded":
      return "Reembolsado";
    case "mock_paid":
      return "Mock pagado";
    default:
      return status;
  }
}

export function getCustomerPaymentProviderLabel(provider: CustomerPaymentProvider) {
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

export function buildCustomerOrderSupportWhatsAppHref(orderNumber?: string) {
  const message = orderNumber
    ? `Hola Skin Hearten, necesito ayuda con mi pedido ${orderNumber}.`
    : "Hola Skin Hearten, necesito ayuda con uno de mis pedidos.";
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
