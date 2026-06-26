import type { Metadata } from "next";
import Link from "next/link";

import { RatingStars } from "@/components/shared/rating-stars";
import { SectionHeading } from "@/components/shared/section-heading";
import { formatLongDate } from "@/lib/format";
import { createEmptyReviewsList } from "@/lib/reviews";
import { getApprovedReviews } from "@/lib/reviews-api";
import { getProducts } from "@/lib/storefront-api";

type ReviewsPageProps = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    product?: string;
    rating?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Resenas de Skin Hearten",
  description:
    "Consulta opiniones aprobadas de clientas de Skin Hearten y deja tu propia resena verificada si ya compraste.",
};

function buildQueryString(params: {
  page?: number;
  pageSize?: number;
  product?: string;
  rating?: string;
}) {
  const query = new URLSearchParams();
  if (typeof params.page === "number" && params.page > 1) {
    query.set("page", String(params.page));
  }
  if (typeof params.pageSize === "number" && params.pageSize !== 12) {
    query.set("pageSize", String(params.pageSize));
  }
  if (params.product) {
    query.set("product", params.product);
  }
  if (params.rating) {
    query.set("rating", params.rating);
  }
  const output = query.toString();
  return output.length > 0 ? `/reviews?${output}` : "/reviews";
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = [12, 24, 36].includes(Number(params.pageSize)) ? Number(params.pageSize) : 12;
  const rating = [1, 2, 3, 4, 5].includes(Number(params.rating)) ? Number(params.rating) : undefined;
  const productFilter = params.product?.trim() ? params.product.trim() : undefined;

  const [products, reviewResult] = await Promise.all([
    getProducts(),
    getApprovedReviews({
      page: currentPage,
      pageSize,
      product: productFilter,
      rating,
    }),
  ]);

  const reviewList = reviewResult.ok ? reviewResult.data : createEmptyReviewsList(currentPage, pageSize);
  const canGoBack = reviewList.page > 1;
  const canGoForward = reviewList.page < reviewList.totalPages;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2.2rem] bg-stone-950 px-5 py-8 text-white shadow-[0_36px_90px_rgba(27,20,16,0.16)] sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <SectionHeading
              eyebrow="Experiencias reales"
              title="Resenas publicadas de Skin Hearten"
              description="Un bloque editorial de confianza con opiniones aprobadas y compras verificadas destacadas."
              eyebrowClassName="text-stone-300"
              titleClassName="text-white"
              descriptionClassName="text-stone-300"
            />
          </div>
          <div className="rounded-[1.8rem] border border-white/10 bg-white/8 p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">Rating global</p>
            <div className="mt-4 flex items-end gap-4">
              <p className="font-serif text-5xl text-white">{reviewList.averageRating.toFixed(1)}</p>
              <div className="pb-2">
                <RatingStars className="text-stone-200" rating={reviewList.averageRating} reviewCount={reviewList.total} />
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-stone-300">
              {reviewResult.ok
                ? "Solo mostramos opiniones aprobadas. Las compras verificadas se identifican con su badge correspondiente."
                : "No pudimos cargar la API de resenas en este momento, pero el portal de escritura permanece disponible."}
            </p>
          </div>
        </div>
      </section>

      <section className="soft-panel rounded-[1.8rem] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Filtrar"
            title="Encuentra opiniones por producto o calificacion"
            description="Navega resenas publicadas con una vista simple y clara."
          />
          <Link
            className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            href="/reviews/escribir"
          >
            Escribir resena
          </Link>
        </div>

        <form action="/reviews" className="mt-6 grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.6fr_auto]">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Producto</span>
            <select
              className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
              defaultValue={productFilter ?? ""}
              name="product"
            >
              <option value="">Todos los productos</option>
              {products.map((product) => (
                <option key={product.id} value={product.slug}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Rating</span>
            <select
              className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
              defaultValue={rating ? String(rating) : ""}
              name="rating"
            >
              <option value="">Todas</option>
              <option value="5">5 estrellas</option>
              <option value="4">4 estrellas</option>
              <option value="3">3 estrellas</option>
              <option value="2">2 estrellas</option>
              <option value="1">1 estrella</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Vista</span>
            <select
              className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
              defaultValue={String(pageSize)}
              name="pageSize"
            >
              <option value="12">12</option>
              <option value="24">24</option>
              <option value="36">36</option>
            </select>
          </label>

          <button
            className="inline-flex items-center justify-center self-end rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-500"
            type="submit"
          >
            Aplicar
          </button>
        </form>
      </section>

      <section className="space-y-5">
        {reviewList.items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reviewList.items.map((review) => (
              <article
                className="rounded-[1.8rem] border border-stone-200 bg-white p-5 shadow-soft"
                key={review.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-950">{review.customerName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                      {formatLongDate(review.createdAt)}
                    </p>
                  </div>
                  <RatingStars rating={review.rating} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    className="rounded-full border border-[#eadfd6] bg-[#fff8f3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-700"
                    href={`/producto/${review.productSlug}`}
                  >
                    {review.productName}
                  </Link>
                  {review.verifiedPurchase ? (
                    <span className="rounded-full border border-[#d8e3cf] bg-[#f3faf0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#476638]">
                      Compra verificada
                    </span>
                  ) : null}
                </div>

                {review.title ? (
                  <h2 className="mt-4 text-lg font-semibold leading-tight text-stone-950">{review.title}</h2>
                ) : null}
                <p className="mt-3 text-sm leading-7 text-stone-600">{review.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.8rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center shadow-soft">
            <p className="font-serif text-3xl text-stone-900">Aun no hay resenas para esos filtros</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Ajusta producto o calificacion, o deja tu propia resena verificada si ya compraste.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                href="/reviews/escribir"
              >
                Escribir resena
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-500"
                href="/productos"
              >
                Seguir comprando
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-[1.8rem] border border-stone-200 bg-white px-5 py-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600">
          Pagina {reviewList.page} de {reviewList.totalPages}. {reviewList.total} resenas publicadas.
        </p>
        <div className="flex gap-3">
          <Link
            aria-disabled={!canGoBack}
            className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
              canGoBack
                ? "border-stone-300 bg-white text-stone-900 hover:border-stone-500"
                : "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
            }`}
            href={canGoBack ? buildQueryString({ page: reviewList.page - 1, pageSize, product: productFilter, rating: rating ? String(rating) : undefined }) : "#"}
          >
            Anterior
          </Link>
          <Link
            aria-disabled={!canGoForward}
            className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
              canGoForward
                ? "border-stone-300 bg-white text-stone-900 hover:border-stone-500"
                : "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
            }`}
            href={canGoForward ? buildQueryString({ page: reviewList.page + 1, pageSize, product: productFilter, rating: rating ? String(rating) : undefined }) : "#"}
          >
            Siguiente
          </Link>
        </div>
      </section>
    </div>
  );
}
