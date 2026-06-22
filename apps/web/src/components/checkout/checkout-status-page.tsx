"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SectionHeading } from "@/components/shared/section-heading";
import { trackEvent } from "@/lib/analytics";
import {
  hasCheckoutSuccessBeenTracked,
  markCheckoutSuccessTracked,
  readLastCheckoutOrder,
  type StoredCheckoutOrder,
  updateLastCheckoutOrder,
} from "@/lib/checkout";
import { formatCurrency } from "@/lib/format";
import { getCartItemCount, useCartStore } from "@/store/cart-store";

const whatsappHref =
  "https://wa.me/525500000000?text=Hola%20Skin%20Hearten%2C%20necesito%20ayuda%20con%20mi%20pedido.";

type CheckoutStatusVariant = "error" | "pending" | "success";

const contentByVariant: Record<
  CheckoutStatusVariant,
  {
    description: string;
    eyebrow: string;
    title: string;
  }
> = {
  success: {
    eyebrow: "Pago confirmado",
    title: "Tu pago fue recibido",
    description: "Ya puedes revisar tu pedido mientras terminamos de sincronizar la confirmacion con la tienda.",
  },
  pending: {
    eyebrow: "Pago pendiente",
    title: "Tu pago sigue en revision",
    description: "La pasarela nos indico que el pago sigue pendiente o en confirmacion. Conserva este pedido para seguimiento.",
  },
  error: {
    eyebrow: "Pago no completado",
    title: "No pudimos confirmar tu pago",
    description: "Tu carrito sigue intacto para que puedas intentarlo otra vez o pedir ayuda por WhatsApp.",
  },
};

export function CheckoutStatusPage({
  orderNumberFromQuery,
  variant,
}: {
  orderNumberFromQuery?: string | null;
  variant: CheckoutStatusVariant;
}) {
  const clearCart = useCartStore((state) => state.clearCart);
  const [order, setOrder] = useState<StoredCheckoutOrder | null>(null);

  useEffect(() => {
    const latestOrder = readLastCheckoutOrder();
    if (!latestOrder) {
      return;
    }

    if (variant === "success") {
      const currentItems = useCartStore.getState().items;
      const itemCount = getCartItemCount(currentItems);
      const updatedOrder =
        updateLastCheckoutOrder({
          paymentStatus: "paid",
          status: "paid",
        }) ?? latestOrder;
      setOrder(updatedOrder);
      clearCart();

      if (
        updatedOrder.nextAction.type === "redirect" &&
        !hasCheckoutSuccessBeenTracked(updatedOrder.orderId)
      ) {
        trackEvent("checkout_completed", {
          order_id: updatedOrder.orderId,
          order_number: updatedOrder.orderNumber,
          payment_method: updatedOrder.nextAction.provider,
          payment_status: "paid",
          cart_total: updatedOrder.total,
          item_count: itemCount,
        });
        markCheckoutSuccessTracked(updatedOrder.orderId);
      }
      return;
    }

    setOrder(latestOrder);
  }, [clearCart, variant]);

  const content = contentByVariant[variant];
  const visibleOrderNumber = order?.orderNumber ?? orderNumberFromQuery;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
      />

      <section className="soft-panel rounded-[2rem] p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Pedido</p>
            <h2 className="mt-3 font-serif text-4xl text-stone-900">
              {visibleOrderNumber ?? "Skin Hearten"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">
              {variant === "success"
                ? "Recibimos tu orden y la pasarela devolvio un flujo exitoso."
                : variant === "pending"
                  ? "Puedes guardar este numero mientras el pago termina de procesarse."
                  : "Si cerraste la pasarela antes de tiempo o el pago fallo, puedes volver a intentarlo desde checkout."}
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-stone-200 bg-white p-5">
            {order ? (
              <div className="space-y-4 text-sm text-stone-700">
                <div className="flex items-center justify-between">
                  <span>Estado de orden</span>
                  <span className="font-semibold capitalize text-stone-900">{order.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Estado de pago</span>
                  <span className="font-semibold capitalize text-stone-900">
                    {order.paymentStatus.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Descuento</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Envio</span>
                  <span>{order.shipping === 0 ? "Gratis" : formatCurrency(order.shipping)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-stone-200 pt-4 text-base font-semibold text-stone-900">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-7 text-stone-600">
                {variant === "success"
                  ? "Volvimos desde la pasarela, pero este navegador no tiene un resumen guardado del pedido."
                  : "No encontramos un resumen local del pedido en este navegador."}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white"
            href={whatsappHref}
            rel="noreferrer"
            target="_blank"
          >
            WhatsApp para soporte
          </a>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-800"
            href={variant === "error" ? "/checkout" : "/productos"}
          >
            {variant === "error" ? "Volver al checkout" : "Volver a tienda"}
          </Link>
        </div>
      </section>
    </div>
  );
}
