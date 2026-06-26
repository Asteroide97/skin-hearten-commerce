import Link from "next/link";

import { RatingStars } from "@/components/shared/rating-stars";
import { SectionHeading } from "@/components/shared/section-heading";
import { formatLongDate } from "@/lib/format";
import type { ReviewsSummary } from "@/lib/reviews";

type ReviewsShowcaseProps = {
  summary: ReviewsSummary;
};

export function ReviewsShowcase({ summary }: ReviewsShowcaseProps) {
  const hasReviews = summary.totalReviews > 0;
  const previewReviews = summary.approvedReviewsPreview.slice(0, 3);
  const placeholderCount = hasReviews ? Math.max(0, 3 - previewReviews.length) : 3;

  return (
    <section className="overflow-hidden rounded-[2.2rem] bg-stone-950 text-white shadow-[0_34px_90px_rgba(29,22,18,0.16)]">
      <div className="grid gap-6 px-5 py-6 sm:px-6 sm:py-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-8">
        <div className="space-y-6">
          <SectionHeading
            eyebrow="Resenas verificadas"
            title="Lo que dicen nuestras clientas"
            description="Una vista mas cercana a la confianza de Google Reviews, pero curada para una experiencia premium y limpia."
            eyebrowClassName="text-stone-300"
            titleClassName="text-white"
            descriptionClassName="text-stone-300"
          />

          <div className="rounded-[1.8rem] border border-white/10 bg-white/8 p-5 backdrop-blur">
            {hasReviews ? (
              <>
                <p className="text-sm uppercase tracking-[0.22em] text-stone-300">Valoracion global</p>
                <div className="mt-4 flex items-end gap-4">
                  <p className="font-serif text-5xl text-white">{summary.averageRating.toFixed(1)}</p>
                  <div className="pb-2">
                    <RatingStars className="text-stone-200" rating={summary.averageRating} reviewCount={summary.totalReviews} />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-stone-300">
                  Mostramos opiniones aprobadas y destacamos las compras verificadas para reforzar confianza antes de comprar.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm uppercase tracking-[0.22em] text-stone-300">Resenas en construccion</p>
                <p className="mt-4 font-serif text-4xl text-white">Todavia no hay opiniones aprobadas visibles.</p>
                <p className="mt-4 text-sm leading-7 text-stone-300">
                  El portal ya esta listo para recibir resenas verificadas de clientas con pedido real.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-100"
              href="/reviews"
            >
              Ver todas las resenas
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-white/16 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30"
              href="/reviews/escribir"
            >
              Escribir resena
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {previewReviews.map((review) => (
            <article
              className="rounded-[1.8rem] bg-white p-5 text-stone-900 shadow-[0_24px_60px_rgba(20,16,14,0.12)]"
              key={review.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-950">{review.customerName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                    {formatLongDate(review.createdAt)}
                  </p>
                </div>
                <RatingStars className="text-stone-600" rating={review.rating} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#e7d4c8] bg-[#fff8f3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-700">
                  {review.productName}
                </span>
                {review.verifiedPurchase ? (
                  <span className="rounded-full border border-[#d8e3cf] bg-[#f3faf0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#476638]">
                    Compra verificada
                  </span>
                ) : null}
              </div>
              {review.title ? (
                <h3 className="mt-4 text-lg font-semibold leading-tight text-stone-950">{review.title}</h3>
              ) : null}
              <p className="mt-3 text-sm leading-7 text-stone-600">{review.body}</p>
            </article>
          ))}
          {Array.from({ length: placeholderCount }).map((_, index) => (
            <article
              className="rounded-[1.8rem] bg-white p-5 text-stone-900 shadow-[0_24px_60px_rgba(20,16,14,0.12)]"
              key={`placeholder-${index}`}
            >
              <div className="flex h-full min-h-[220px] flex-col justify-between rounded-[1.3rem] border border-dashed border-stone-200 bg-[#fffaf7] p-4">
                <div>
                  <p className="text-sm font-semibold text-stone-900">Tu experiencia puede aparecer aqui</p>
                  <p className="mt-3 text-sm leading-7 text-stone-600">
                    Si ya compraste en Skin Hearten, deja una resena verificada desde tu numero de pedido.
                  </p>
                </div>
                <Link className="text-sm font-semibold text-stone-900 underline-offset-4 hover:underline" href="/reviews/escribir">
                  Dejar mi resena
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
