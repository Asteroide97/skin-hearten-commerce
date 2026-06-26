"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";

import { StarIcon } from "@/components/shared/icons";
import type { VerifiedReviewCreateInput } from "@/lib/reviews";
import { verifiedReviewSchema, type VerifiedReviewFormValues } from "@/schemas/verified-review";

type Notice =
  | {
      kind: "error" | "success";
      message: string;
    }
  | null;

type ReviewProductOption = {
  id: string;
  name: string;
  brand: string;
};

type VerifiedReviewFormProps = {
  initialProductId?: string | null;
  products: ReviewProductOption[];
};

export function VerifiedReviewForm({ initialProductId, products }: VerifiedReviewFormProps) {
  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultProductId = useMemo(() => {
    if (!initialProductId) {
      return 0;
    }

    const matchedProduct = products.find((product) => product.id === initialProductId);
    return matchedProduct ? Number(matchedProduct.id) : 0;
  }, [initialProductId, products]);

  const form = useForm<VerifiedReviewFormValues>({
    resolver: zodResolver(verifiedReviewSchema),
    defaultValues: {
      orderNumber: "",
      email: "",
      phone: "",
      productId: defaultProductId,
      rating: 0,
      title: "",
      body: "",
      customerName: "",
    },
  });

  const selectedRating = form.watch("rating");

  async function handleSubmit(values: VerifiedReviewFormValues) {
    const payload: VerifiedReviewCreateInput = {
      orderNumber: values.orderNumber.trim(),
      productId: values.productId,
      rating: values.rating,
      body: values.body.trim(),
      customerName: values.customerName.trim(),
      ...(values.email.trim().length > 0 ? { email: values.email.trim() } : {}),
      ...(values.phone.trim().length > 0 ? { phone: values.phone.trim() } : {}),
      ...(values.title.trim().length > 0 ? { title: values.title.trim() } : {}),
    };

    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch("/api/reviews/verified", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as
        | { ok: true }
        | { ok: false; message?: string };

      if (!response.ok || !result.ok) {
        setNotice({
          kind: "error",
          message:
            !result.ok && result.message
              ? result.message
              : "No pudimos validar tu compra para registrar la resena.",
        });
        return;
      }

      form.reset({
        orderNumber: "",
        email: "",
        phone: "",
        productId: defaultProductId,
        rating: 0,
        title: "",
        body: "",
        customerName: "",
      });
      setNotice({
        kind: "success",
        message: "Gracias. Tu resena sera revisada antes de publicarse.",
      });
    } catch {
      setNotice({
        kind: "error",
        message: "No pudimos enviar tu resena verificada por ahora.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <aside className="rounded-[1.8rem] bg-stone-950 p-6 text-white shadow-[0_30px_80px_rgba(27,20,16,0.14)]">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-300">Portal verificado</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">Escribe una resena con tu compra real</h1>
        <p className="mt-4 text-sm leading-7 text-stone-300">
          Valida tu numero de pedido con email o WhatsApp, elige el producto comprado y comparte tu experiencia.
        </p>

        <div className="mt-8 space-y-4">
          {[
            "1. Ingresa tu numero de pedido.",
            "2. Valida con email o WhatsApp.",
            "3. Selecciona el producto comprado y deja tu comentario.",
          ].map((step) => (
            <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-stone-200" key={step}>
              {step}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
          <p className="text-sm font-semibold text-white">Importante</p>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            Solo publicamos resenas aprobadas. Nunca mostramos tu email y usamos el dato de contacto solo para validar la compra.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-100"
            href="/reviews"
          >
            Ver resenas publicadas
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-white/16 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30"
            href="/productos"
          >
            Volver a productos
          </Link>
        </div>
      </aside>

      <section className="soft-panel rounded-[1.8rem] p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Formulario</p>
          <h2 className="mt-2 font-serif text-3xl text-stone-900">Verifica tu pedido y comparte tu experiencia</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Si el pedido y el producto coinciden, tu resena entrara a revision con badge de compra verificada.
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              error={form.formState.errors.orderNumber?.message}
              label="Numero de pedido"
              placeholder="Ejemplo: SH-1043"
              registration={form.register("orderNumber")}
            />
            <Field
              error={form.formState.errors.customerName?.message}
              label="Nombre visible"
              placeholder="Como quieres aparecer"
              registration={form.register("customerName")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              error={form.formState.errors.email?.message}
              label="Email"
              placeholder="tu@email.com"
              registration={form.register("email")}
            />
            <Field
              error={form.formState.errors.phone?.message}
              label="WhatsApp"
              placeholder="5512345678"
              registration={form.register("phone")}
            />
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-stone-900">Producto comprado</span>
            <select
              className="mt-3 w-full rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-stone-500"
              {...form.register("productId", { valueAsNumber: true })}
            >
              <option value={0}>Selecciona un producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.brand}
                </option>
              ))}
            </select>
            {form.formState.errors.productId?.message ? (
              <p className="mt-2 text-xs text-red-600">{form.formState.errors.productId.message}</p>
            ) : null}
          </label>

          <Field
            error={form.formState.errors.title?.message}
            label="Titulo opcional"
            placeholder="Ejemplo: Muy comodo para piel sensible"
            registration={form.register("title")}
          />

          <div>
            <p className="text-sm font-semibold text-stone-900">Calificacion</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => {
                const ratingValue = index + 1;
                const isActive = selectedRating >= ratingValue;

                return (
                  <button
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                      isActive
                        ? "border-stone-950 bg-stone-950 text-white"
                        : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                    }`}
                    key={ratingValue}
                    onClick={() => {
                      form.setValue("rating", ratingValue, { shouldDirty: true, shouldValidate: true });
                    }}
                    type="button"
                  >
                    <StarIcon className={isActive ? "text-amber-300" : "text-stone-400"} />
                    {ratingValue}
                  </button>
                );
              })}
            </div>
            {form.formState.errors.rating?.message ? (
              <p className="mt-2 text-xs text-red-600">{form.formState.errors.rating.message}</p>
            ) : null}
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-stone-900">Comentario</span>
            <textarea
              className="mt-3 min-h-40 w-full rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm leading-7 text-stone-700 outline-none transition focus:border-stone-500"
              placeholder="Cuentanos como te fue con el producto, como se sintio en tu piel y que notaste."
              {...form.register("body")}
            />
            {form.formState.errors.body?.message ? (
              <p className="mt-2 text-xs text-red-600">{form.formState.errors.body.message}</p>
            ) : null}
          </label>

          {notice ? (
            <div
              className={`rounded-[1.4rem] border px-4 py-4 text-sm leading-7 ${
                notice.kind === "success"
                  ? "border-[#d8e3cf] bg-[#f5faf1] text-[#476638]"
                  : "border-[#ead0c7] bg-[#fff6f2] text-[#8a4d3b]"
              }`}
            >
              {notice.message}
            </div>
          ) : null}

          <button
            className="inline-flex w-full items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Validando compra..." : "Enviar resena verificada"}
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({
  error,
  label,
  placeholder,
  registration,
}: {
  error?: string;
  label: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-900">{label}</span>
      <input
        className="mt-3 w-full rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-stone-500"
        placeholder={placeholder}
        {...registration}
      />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
