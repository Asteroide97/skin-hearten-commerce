"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SectionHeading } from "@/components/shared/section-heading";
import { readLastCheckoutOrder, type StoredCheckoutOrder } from "@/lib/checkout";
import { formatCurrency } from "@/lib/format";

const whatsappHref =
  "https://wa.me/525500000000?text=Hola%20Skin%20Hearten%2C%20tengo%20dudas%20sobre%20mi%20pedido.";

export default function CheckoutThankYouPage() {
  const [order, setOrder] = useState<StoredCheckoutOrder | null>(null);

  useEffect(() => {
    setOrder(readLastCheckoutOrder());
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Pedido recibido"
        title="Recibimos tu pedido"
        description="Guardamos el resumen mas reciente para que puedas revisar numero, total y estado desde esta pantalla."
      />

      {order ? (
        <section className="soft-panel rounded-[2rem] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Confirmacion
              </p>
              <h2 className="mt-3 font-serif text-4xl text-stone-900">{order.orderNumber}</h2>
              <p className="mt-4 text-sm leading-7 text-stone-600">
                {order.customerName.length > 0
                  ? `${order.customerName}, recibimos tu pedido y ya quedo registrado en el flujo actual.`
                  : "Recibimos tu pedido y ya quedo registrado en el flujo actual."}
              </p>
            </div>

            <div className="rounded-[1.8rem] border border-stone-200 bg-white p-5">
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
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white"
              href={whatsappHref}
              rel="noreferrer"
              target="_blank"
            >
              WhatsApp para dudas
            </a>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-800"
              href="/productos"
            >
              Volver a tienda
            </Link>
          </div>
        </section>
      ) : (
        <section className="soft-panel rounded-[2rem] p-8 text-center">
          <h2 className="font-serif text-3xl text-stone-900">No encontramos un pedido reciente</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Completa el checkout desde la tienda o vuelve a tu catalogo para iniciar una compra.
          </p>
          <Link
            className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white"
            href="/productos"
          >
            Ir al catalogo
          </Link>
        </section>
      )}
    </div>
  );
}
