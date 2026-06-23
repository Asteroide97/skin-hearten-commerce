"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { CouponApplyForm } from "@/components/store/coupon-apply-form";
import { trackEvent } from "@/lib/analytics";
import {
  buildCheckoutIdempotencyKey,
  buildCheckoutRequestPayload,
  saveLastCheckoutOrder,
  submitCheckoutOrder,
} from "@/lib/checkout";
import { formatCurrency } from "@/lib/format";
import { checkoutSchema, type CheckoutValues } from "@/schemas/checkout";
import {
  getCartDiscount,
  getCartItemCount,
  getCartShipping,
  getCartSubtotal,
  getCartTotal,
  useCartStore,
} from "@/store/cart-store";

const paymentMethods = [
  { id: "mercadopago", label: "Mercado Pago" },
  { id: "stripe", label: "Stripe" },
] as const;

export function CheckoutForm() {
  const router = useRouter();
  const idempotencyKeyRef = useRef<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { items, coupon, clearCart } = useCartStore();
  const subtotal = getCartSubtotal(items);
  const discount = getCartDiscount(coupon);
  const shipping = getCartShipping(subtotal, coupon);
  const total = getCartTotal(subtotal, discount, shipping);
  const itemCount = getCartItemCount(items);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Mexico",
      paymentMethod: "stripe",
    },
  });

  async function handleCheckoutSubmit(values: CheckoutValues) {
    if (items.length === 0) {
      setSubmitError("Tu carrito esta vacio. Agrega productos antes de confirmar el pedido.");
      return;
    }

    setSubmitError(null);
    idempotencyKeyRef.current ??= buildCheckoutIdempotencyKey();

    trackEvent("purchase_attempted", {
      payment_method: values.paymentMethod,
      cart_total: total,
      item_count: itemCount,
    });

    const payload = buildCheckoutRequestPayload({
      couponCode: coupon?.code,
      customer: {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
      },
      items,
      paymentMethod: values.paymentMethod,
      shippingAddress: {
        line1: values.addressLine1,
        line2: values.addressLine2,
        city: values.city,
        state: values.state,
        postalCode: values.postalCode,
        country: values.country,
      },
    });

    const result = await submitCheckoutOrder(payload, idempotencyKeyRef.current);
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    saveLastCheckoutOrder({
      ...result.data,
      customerName: `${values.firstName} ${values.lastName}`.trim(),
      createdAt: new Date().toISOString(),
    });

    if (result.data.nextAction.type === "redirect") {
      idempotencyKeyRef.current = null;
      window.location.assign(result.data.nextAction.url);
      return;
    }

    clearCart();
    trackEvent("checkout_completed", {
      order_id: result.data.orderId,
      order_number: result.data.orderNumber,
      payment_method: values.paymentMethod,
      payment_status: result.data.paymentStatus,
      cart_total: result.data.total,
      item_count: itemCount,
    });
    idempotencyKeyRef.current = null;
    router.push("/checkout/gracias");
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form
        className="soft-panel space-y-6 rounded-[1.8rem] p-6"
        onSubmit={form.handleSubmit(handleCheckoutSubmit)}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Checkout</p>
          <h2 className="mt-2 font-serif text-3xl text-stone-900">Datos de envio y pago</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            El pedido se valida y calcula del lado backend antes de confirmarse.
          </p>
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
          <div className="sm:col-span-2">
            <Field
              label="Interior, colonia o referencias"
              name="addressLine2"
              register={form.register}
              error={form.formState.errors.addressLine2?.message}
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
          <Field label="Pais" name="country" register={form.register} error={form.formState.errors.country?.message} />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-stone-900">Metodo de pago</legend>
          <div className="grid gap-3 sm:grid-cols-2">
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

        {submitError ? (
          <div className="rounded-[1.4rem] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <button
          className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white disabled:bg-stone-300"
          disabled={isSubmitting || items.length === 0}
          type="submit"
        >
          {isSubmitting ? "Creando pedido..." : "Confirmar pedido"}
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

        <div className="mt-8">
          <CouponApplyForm customerEmail={form.watch("email")} customerPhone={form.watch("phone")} />
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
