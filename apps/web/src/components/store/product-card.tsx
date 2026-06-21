import Link from "next/link";

import { RatingStars } from "@/components/shared/rating-stars";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const compareAtPrice = product.compareAtPrice ?? product.price;
  const hasOffer = compareAtPrice > product.price;
  const savings = hasOffer
    ? Math.round(((compareAtPrice - product.price) / compareAtPrice) * 100)
    : 0;

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(33,26,20,0.12)]">
      <Link className="block" href={`/producto/${product.slug}`}>
        <div className={`relative h-80 overflow-hidden bg-gradient-to-br ${product.gradient} p-5`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_45%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {product.bestSeller ? (
                  <span className="rounded-full bg-stone-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                    Bestseller
                  </span>
                ) : null}
                {hasOffer ? (
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-800">
                    Ahorra {savings}%
                  </span>
                ) : null}
              </div>
              <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-600">
                {product.category}
              </span>
            </div>

            <div className="relative mx-auto mt-4 flex h-44 w-full items-end justify-center">
              <div className="absolute left-1/2 top-2 h-16 w-16 -translate-x-1/2 rounded-full bg-white/50 blur-xl" />
              <div className="absolute bottom-0 h-40 w-28 rounded-[2.6rem_2.6rem_1.8rem_1.8rem] border border-white/70 bg-white/85 shadow-[0_20px_40px_rgba(47,35,29,0.12)]" />
              <div className="absolute bottom-10 h-8 w-16 rounded-full bg-[#eee6dd]" />
              <div className="absolute bottom-2 right-[22%] h-28 w-20 rotate-[8deg] rounded-[1.3rem] border border-white/70 bg-white/70 shadow-[0_18px_36px_rgba(47,35,29,0.08)]" />
              <span className="absolute left-0 top-6 rounded-full bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-600">
                {product.ingredients[0]}
              </span>
              <span className="absolute right-0 top-20 rounded-full bg-stone-950/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                {product.skinTypes[0]}
              </span>
            </div>

            <div className="rounded-[1.5rem] border border-white/60 bg-white/55 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{product.brand}</p>
              <h3 className="mt-2 text-[1.35rem] font-semibold leading-tight text-stone-900">{product.name}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">{product.highlight}</p>
            </div>
          </div>
        </div>
      </Link>
      <div className="space-y-5 p-6">
        <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
        <div className="flex items-end gap-3">
          {hasOffer ? (
            <p className="text-sm text-stone-400 line-through">{formatCurrency(compareAtPrice)}</p>
          ) : null}
          <p className="text-2xl font-semibold text-stone-950">{formatCurrency(product.price)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.concerns.slice(0, 2).map((tag) => (
            <span
              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600"
              key={`${product.id}-${tag}`}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <AddToCartButton
            className="inline-flex w-full items-center justify-center rounded-full bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            label="Agregar a rutina"
            name={product.name}
            price={product.price}
            productId={product.id}
            slug={product.slug}
          />
          <Link
            className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 px-4 py-3 text-sm font-medium text-stone-800 transition hover:border-stone-500"
            href={`/producto/${product.slug}`}
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  );
}
