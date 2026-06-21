"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { formatCurrency } from "@/lib/format";
import { checkoutSchema, type CheckoutValues } from "@/schemas/checkout";
import {
  getCartDiscount,
  getCartShipping,
  getCartSubtotal,
  getCartTotal,
  useCartStore,
} from "@/store/cart-store";

const paymentMethods = [
  { id: "mercadopago", label: "Mercado Pago" },
  { id: "paypal", label: "PayPal" },
  { id: "stripe", label: "Stripe" },
] as const;

export function CheckoutForm() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const { items, discountRate, couponCode, clearCart } = useCartStore();
  const subtotal = getCartSubtotal(items);
  const discount = getCartDiscount(subtotal, discountRate);
  const shipping = couponCode === "ENVIOGRATIS" ? 0 : getCartShipping(subtotal);
  const total = getCartTotal(subtotal, discount, shipping);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      paymentMethod: "stripe",
    },
  });

  if (submitted) {
    return (
      <div className="soft-panel rounded-[1.8rem] p-8">
        <h2 className="font-serif text-3xl text-stone-900">Pedido creado</h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-stone-600">
          El flujo visual de checkout quedo armado con validacion completa. El siguiente paso es
          conectar este submit con `POST /checkout` y el proveedor elegido.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form
        className="soft-panel space-y-6 rounded-[1.8rem] p-6"
        onSubmit={form.handleSubmit(() => {
          startTransition(() => {
            clearCart();
            setSubmitted(true);
          });
        })}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Checkout</p>
          <h2 className="mt-2 font-serif text-3xl text-stone-900">Datos de envio y pago</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" name="firstName" register={form.register} error={form.formState.errors.firstName?.message} />
          <Field label="Apellidos" name="lastName" register={form.register} error={form.formState.errors.lastName?.message} />
          <Field label="Email" name="email" register={form.register} error={form.formState.errors.email?.message} />
          <Field label="Telefono" name="phone" register={form.register} error={form.formState.errors.phone?.message} />
          <div className="sm:col-span-2">
            <Field
              label="Direccion"
              name="addressLine1"
              register={form.register}
              error={form.formState.errors.addressLine1?.message}
            />
          </div>
          <Field label="Ciudad" name="city" register={form.register} error={form.formState.errors.city?.message} />
          <Field label="Estado" name="state" register={form.register} error={form.formState.errors.state?.message} />
          <Field
            label="Codigo postal"
            name="postalCode"
            register={form.register}
            error={form.formState.errors.postalCode?.message}
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-stone-900">Metodo de pago</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {paymentMethods.map((method) => (
              <label
                className="flex cursor-pointer items-center gap-3 rounded-[1.2rem] border border-stone-200 bg-white px-4 py-4"
                key={method.id}
              >
                <input type="radio" value={method.id} {...form.register("paymentMethod")} />
                <span className="text-sm text-stone-700">{method.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white disabled:bg-stone-300"
          disabled={isPending || items.length === 0}
          type="submit"
        >
          {isPending ? "Procesando..." : "Confirmar pedido"}
        </button>
      </form>

      <aside className="soft-panel h-fit rounded-[1.8rem] p-6">
        <h2 className="font-serif text-3xl text-stone-900">Tu compra</h2>
        <div className="mt-6 space-y-4 text-sm text-stone-700">
          {items.map((item) => (
            <div className="flex items-center justify-between" key={item.productId}>
              <span>
                {item.name} x {item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-stone-200 pt-4">
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
          <div className="flex items-center justify-between text-base font-semibold text-stone-900">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: keyof CheckoutValues;
  register: ReturnType<typeof useForm<CheckoutValues>>["register"];
  error?: string;
};

function Field({ label, name, register, error }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-900">{label}</span>
      <input
        className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
        {...register(name)}
      />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

