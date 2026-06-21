"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatCurrency } from "@/lib/format";
import {
  getCartDiscount,
  getCartShipping,
  getCartSubtotal,
  getCartTotal,
  useCartStore,
} from "@/store/cart-store";

export function CartPage() {
  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const { items, discountRate, couponCode, removeItem, updateQuantity, applyCoupon } = useCartStore();

  const subtotal = useMemo(() => getCartSubtotal(items), [items]);
  const discount = useMemo(() => getCartDiscount(subtotal, discountRate), [discountRate, subtotal]);
  const shipping = useMemo(
    () => (couponCode === "ENVIOGRATIS" ? 0 : getCartShipping(subtotal)),
    [couponCode, subtotal],
  );
  const total = useMemo(() => getCartTotal(subtotal, discount, shipping), [discount, shipping, subtotal]);

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

        <div className="mt-8 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-stone-900">Cupon</span>
            <div className="mt-3 flex gap-2">
              <input
                className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
                onChange={(event) => setCouponInput(event.target.value)}
                placeholder="GLOW10 o ENVIOGRATIS"
                value={couponInput}
              />
              <button
                className="rounded-full bg-stone-950 px-4 py-3 text-sm font-medium text-white"
                onClick={() => {
                  const success = applyCoupon(couponInput);
                  setCouponMessage(success ? "Cupon aplicado" : "Cupon invalido");
                }}
                type="button"
              >
                Aplicar
              </button>
            </div>
          </label>
          {couponMessage ? <p className="text-sm text-stone-600">{couponMessage}</p> : null}
        </div>

        <Link
          className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white disabled:bg-stone-300"
          href="/checkout"
        >
          Finalizar compra
        </Link>
      </aside>
    </div>
  );
}

