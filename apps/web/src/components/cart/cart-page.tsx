"use client";

import Link from "next/link";
import { useMemo } from "react";

import { trackEvent } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import { CouponApplyForm } from "@/components/store/coupon-apply-form";
import {
  getCartDiscount,
  getCartItemCount,
  getCartShipping,
  getCartSubtotal,
  getCartTotal,
  useCartStore,
} from "@/store/cart-store";

export function CartPage() {
  const { items, coupon, removeItem, updateQuantity } = useCartStore();

  const subtotal = useMemo(() => getCartSubtotal(items), [items]);
  const discount = useMemo(() => getCartDiscount(coupon), [coupon]);
  const shipping = useMemo(() => getCartShipping(subtotal, coupon), [coupon, subtotal]);
  const total = useMemo(() => getCartTotal(subtotal, discount, shipping), [discount, shipping, subtotal]);
  const itemCount = useMemo(() => getCartItemCount(items), [items]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        {items.length === 0 ? (
          <div className="soft-panel rounded-[1.8rem] p-8">
            <h2 className="font-serif text-3xl text-stone-900">Tu carrito esta vacio</h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-stone-600">
              La base de carrito con Zustand ya esta lista. Agrega productos desde el detalle para ver
              resumen, cupones y checkout.
            </p>
            <Link
              className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white"
              href="/productos"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          items.map((item) => (
            <article
              className="soft-panel flex flex-col gap-4 rounded-[1.8rem] p-6 sm:flex-row sm:items-center sm:justify-between"
              key={item.productId}
            >
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">{item.slug}</p>
                <h3 className="mt-2 text-xl font-semibold text-stone-900">{item.name}</h3>
                <p className="mt-2 text-sm text-stone-600">{formatCurrency(item.price)} por unidad</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  className="w-20 rounded-full border border-stone-200 bg-white px-4 py-2 text-center text-sm text-stone-700"
                  min={1}
                  onChange={(event) => updateQuantity(item.productId, Number(event.target.value))}
                  type="number"
                  value={item.quantity}
                />
                <button
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700"
                  onClick={() => removeItem(item.productId)}
                  type="button"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <aside className="soft-panel h-fit rounded-[1.8rem] p-6">
        <h2 className="font-serif text-3xl text-stone-900">Resumen</h2>
        <div className="mt-6 space-y-4 text-sm text-stone-700">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Descuento</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Envio</span>
            <span>{shipping === 0 ? "Gratis" : formatCurrency(shipping)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-stone-200 pt-4 text-base font-semibold text-stone-900">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="mt-8">
          <CouponApplyForm />
        </div>

        <Link
          className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white disabled:bg-stone-300"
          href="/checkout"
          onClick={() => {
            trackEvent("checkout_started", {
              cart_total: total,
              item_count: itemCount,
            });
          }}
        >
          Finalizar compra
        </Link>
      </aside>
    </div>
  );
}
