"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";

import { RatingStars } from "@/components/shared/rating-stars";
import { SectionHeading } from "@/components/shared/section-heading";
import { StarIcon } from "@/components/shared/icons";
import { formatLongDate } from "@/lib/format";
import type { ProductReviewCreateInput, ProductReviewSummary } from "@/lib/product-reviews";
import { productReviewSchema, type ProductReviewFormValues } from "@/schemas/product-review";

type Notice =
  | {
      kind: "error" | "success";
      message: string;
    }
  | null;

type ProductReviewsSectionProps = {
  initialSummary: ProductReviewSummary;
  productName: string;
  productRef: string;
};

export function ProductReviewsSection({
  initialSummary,
  productName,
  productRef,
}: ProductReviewsSectionProps) {
  const form = useForm<ProductReviewFormValues>({
    resolver: zodResolver(productReviewSchema),
    defaultValues: {
      body: "",
      customerEmail: "",
      customerName: "",
      rating: 0,
      title: "",
    },
  });
  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRating = form.watch("rating");
  const hasReviews = initialSummary.reviewCount > 0;

  async function handleSubmit(values: ProductReviewFormValues) {
    const payload: ProductReviewCreateInput = {
      body: values.body.trim(),
      customerName: values.customerName.trim(),
      rating: values.rating,
      ...(values.customerEmail.trim().length > 0 ? { customerEmail: values.customerEmail.trim() } : {}),
      ...(values.title.trim().length > 0 ? { title: values.title.trim() } : {}),
    };

    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productRef)}/reviews`, {
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
              : "No pudimos registrar tu resena por ahora.",
        });
        return;
      }

      form.reset({
        body: "",
        customerEmail: "",
        customerName: "",
        rating: 0,
        title: "",
      });
      setNotice({
        kind: "success",
        message: "Gracias, tu resena sera revisada antes de publicarse.",
      });
    } catch {
      setNotice({
        kind: "error",
        message: "No pudimos registrar tu resena por ahora.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="store-review-block overflow-hidden rounded-[2.4rem] bg-[#f0e5da] p-6 sm:p-8">
      <SectionHeading
        eyebrow="Opiniones de clientas"
        title="Palabras reales sobre la rutina"
        description={`Lectura tranquila sobre ${productName}, con resenas moderadas antes de publicarse.`}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <div className="border-t border-stone-300/70 pt-6">
            {hasReviews ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <p className="font-serif text-[4rem] leading-none text-stone-950">
                    {initialSummary.averageRating.toFixed(1)}
                  </p>
                  <div className="space-y-2 pb-2">
                    <RatingStars
                      className="text-stone-700"
                      rating={initialSummary.averageRating}
                      reviewCount={initialSummary.reviewCount}
                    />
                    <p className="text-sm text-stone-600">Solo mostramos opiniones aprobadas.</p>
                  </div>
                </div>
                <Link
                  className="btn-secondary border-stone-300 bg-white/85"
                  href={`/reviews?product=${encodeURIComponent(productRef)}`}
                >
                  Ver todas las resenas
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-serif text-[2.7rem] leading-none text-stone-950">
                  Aun sin resenas aprobadas
                </p>
                <p className="max-w-md text-sm leading-7 text-stone-600">
                  Puedes ser de las primeras clientas en dejar una opinion sobre este producto.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {hasReviews ? (
              initialSummary.reviews.map((review) => (
                <article className="rounded-[1.8rem] bg-white p-5 sm:p-6" key={review.id}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3e7dd] font-serif text-lg text-stone-950">
                        {getInitials(review.customerName)}
                      </div>
                      <div>
                        <p className="font-semibold text-stone-900">{review.customerName}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {formatLongDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                    <RatingStars className="text-stone-700" rating={review.rating} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {review.verifiedPurchase ? (
                      <span className="rounded-full border border-[#d8e3cf] bg-[#f6faf3] px-3 py-1 text-[11px] font-semibold text-[#557045]">
                        Compra verificada
                      </span>
                    ) : null}
                  </div>
                  {review.title ? (
                    <h3 className="mt-4 font-serif text-[1.7rem] leading-[1.02] text-stone-950">
                      {review.title}
                    </h3>
                  ) : null}
                  <p className="mt-3 text-sm leading-8 text-stone-600">{review.body}</p>
                </article>
              ))
            ) : (
              <div className="rounded-[1.8rem] bg-white px-5 py-8 text-sm leading-7 text-stone-500">
                Aun no hay opiniones aprobadas para mostrar en este producto.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-5 sm:p-6">
          <div className="space-y-3">
            <p className="section-label">Escribe una resena</p>
            <h3 className="font-serif text-[2.3rem] leading-[0.98] text-stone-950">
              Comparte tu experiencia
            </h3>
            <p className="max-w-lg text-sm leading-7 text-stone-600">
              Revisamos cada comentario antes de publicarlo. Tu email nunca se muestra en storefront.
            </p>
            <Link
              className="btn-ghost px-0 py-0 text-stone-950"
              href={`/reviews/escribir?product=${encodeURIComponent(productRef)}`}
            >
              Escribir resena verificada
            </Link>
          </div>

          <form className="mt-8 space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                error={form.formState.errors.customerName?.message}
                label="Nombre"
                placeholder="Tu nombre"
                registration={form.register("customerName")}
              />
              <Field
                error={form.formState.errors.customerEmail?.message}
                label="Email opcional"
                placeholder="tu@email.com"
                registration={form.register("customerEmail")}
              />
            </div>

            <Field
              error={form.formState.errors.title?.message}
              label="Titulo opcional"
              placeholder="Ejemplo: Textura elegante y muy comoda"
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
                className="mt-3 min-h-36 w-full rounded-[1.1rem] border border-stone-200 bg-[#fcfaf7] px-4 py-3 text-sm leading-7 text-stone-700 outline-none transition focus:border-stone-500"
                placeholder="Cuentanos como se sintio en tu rutina y que notaste en tu piel."
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
              className="btn-primary w-full"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Enviando resena..." : "Enviar resena"}
            </button>
          </form>
        </div>
      </div>
    </section>
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
        className="mt-3 w-full rounded-[1.1rem] border border-stone-200 bg-[#fcfaf7] px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-stone-500"
        placeholder={placeholder}
        {...registration}
      />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
