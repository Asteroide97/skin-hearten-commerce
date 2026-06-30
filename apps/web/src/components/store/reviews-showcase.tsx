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
  const featuredReview = previewReviews[0];
  const secondaryReviews = previewReviews.slice(1);

  return (
    <section className="reviews-showcase overflow-hidden rounded-[2.5rem] bg-[#ede2d6] px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <div className="space-y-6">
          <SectionHeading
            eyebrow="Resenas verificadas"
            title="Lo que dicen nuestras clientas"
            description="Resenas aprobadas, lectura limpia y compras verificadas antes de decidir."
            eyebrowClassName="text-stone-600"
            titleClassName="text-stone-950"
            descriptionClassName="text-stone-700"
          />

          <div className="border-t border-stone-300/70 pt-6">
            {hasReviews ? (
              <div className="flex flex-wrap items-end gap-4">
                <p className="font-serif text-[4.2rem] leading-none text-stone-950">
                  {summary.averageRating.toFixed(1)}
                </p>
                <div className="space-y-2 pb-2">
                  <RatingStars className="text-stone-700" rating={summary.averageRating} reviewCount={summary.totalReviews} />
                  <p className="text-sm text-stone-600">
                    Valoracion global y moderacion previa a publicacion.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-serif text-[2.8rem] leading-none text-stone-950">
                  Aun sin resenas visibles
                </p>
                <p className="max-w-md text-sm leading-7 text-stone-600">
                  El espacio ya esta preparado para mostrar opiniones verificadas cuando entren las primeras.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="btn-primary" href="/reviews">
              Ver todas las resenas
            </Link>
            <Link className="btn-secondary border-stone-300 bg-white/85" href="/reviews/escribir">
              Escribir resena
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.06fr_0.94fr]">
          {featuredReview ? (
            <article className="flex min-h-[360px] flex-col justify-between rounded-[2rem] bg-white p-6 sm:p-7">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f2e4da] font-serif text-xl text-stone-950">
                  {getInitials(featuredReview.customerName)}
                </div>
                <div>
                  <p className="font-semibold text-stone-950">{featuredReview.customerName}</p>
                  <p className="mt-1 text-xs text-stone-500">{formatLongDate(featuredReview.createdAt)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <RatingStars className="text-stone-700" rating={featuredReview.rating} />
                  {featuredReview.verifiedPurchase ? (
                    <span className="rounded-full border border-[#d8e3cf] bg-[#f6faf3] px-3 py-1 text-[11px] font-semibold text-[#557045]">
                      Compra verificada
                    </span>
                  ) : null}
                </div>
                {featuredReview.title ? (
                  <h3 className="font-serif text-[2rem] leading-[1.02] text-stone-950">
                    {featuredReview.title}
                  </h3>
                ) : null}
                <p className="text-sm leading-8 text-stone-700">{featuredReview.body}</p>
              </div>

              <p className="text-sm text-stone-500">{featuredReview.productName}</p>
            </article>
          ) : null}

          <div className="grid gap-4">
            {secondaryReviews.map((review) => (
              <article className="rounded-[1.8rem] bg-white p-5" key={review.id}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f3e7dd] text-sm font-semibold text-stone-950">
                    {getInitials(review.customerName)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-950">{review.customerName}</p>
                    <p className="text-xs text-stone-500">{formatLongDate(review.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <RatingStars className="text-stone-700" rating={review.rating} />
                  {review.verifiedPurchase ? (
                    <span className="rounded-full border border-[#d8e3cf] bg-[#f6faf3] px-3 py-1 text-[11px] font-semibold text-[#557045]">
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
              <article className="rounded-[1.8rem] bg-white p-5" key={`placeholder-${index}`}>
                <div className="flex h-full min-h-[180px] flex-col justify-between border-t border-stone-200 pt-4">
                  <div>
                    <p className="font-semibold text-stone-950">Tu experiencia puede estar aqui</p>
                    <p className="mt-3 text-sm leading-7 text-stone-600">
                      Si ya compraste en Skin Hearten, comparte tu experiencia desde tu numero de pedido.
                    </p>
                  </div>
                  <Link className="mt-5 text-sm font-semibold text-stone-950 underline-offset-4 hover:underline" href="/reviews/escribir">
                    Dejar mi resena
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
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
