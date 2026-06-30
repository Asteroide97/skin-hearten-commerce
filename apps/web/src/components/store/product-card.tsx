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
    <article className="group flex h-full flex-col">
      <Link className="block" href={`/producto/${product.slug}`}>
        <div
          className={`relative overflow-hidden rounded-[2.35rem] border border-stone-200/80 bg-gradient-to-br ${product.gradient} px-6 py-6 transition duration-300 group-hover:-translate-y-1 group-hover:border-stone-300`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_46%)]" />
          <div className="relative flex min-h-[26rem] flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {product.bestSeller ? (
                  <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold text-stone-800">
                    Bestseller
                  </span>
                ) : null}
                {hasOffer ? (
                  <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold text-stone-800">
                    Oferta {savings}%
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] text-stone-500">{product.category}</span>
            </div>

            <div className="relative mx-auto flex h-52 w-full items-end justify-center">
              <div className="absolute left-1/2 top-5 h-24 w-24 -translate-x-1/2 rounded-full bg-white/65 blur-2xl" />
              <div className="absolute bottom-0 h-44 w-32 rounded-[3.1rem_3.1rem_1.7rem_1.7rem] border border-white/80 bg-white/84" />
              <div className="absolute bottom-11 h-8 w-16 rounded-full bg-[#ead7c8]/92" />
              <div className="absolute bottom-4 right-[24%] h-32 w-24 rotate-[8deg] rounded-[1.55rem] border border-white/76 bg-white/70" />
            </div>

            <div className="space-y-3">
              <p className="text-[0.72rem] font-medium tracking-[0.08em] text-stone-500">{product.brand}</p>
              <h3 className="max-w-[14rem] font-serif text-[2rem] leading-[0.94] text-stone-950">
                {product.name}
              </h3>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 px-1 pb-2 pt-5">
        <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
        <p className="text-sm leading-7 text-stone-700">{product.highlight}</p>
        <p className="text-sm text-stone-500">{product.benefits[0]}</p>
        <div className="flex items-end gap-3">
          {hasOffer ? (
            <p className="text-sm text-stone-400 line-through">{formatCurrency(compareAtPrice)}</p>
          ) : null}
          <p className="text-2xl font-semibold text-stone-950">{formatCurrency(product.price)}</p>
        </div>
        <p className="text-xs text-stone-500">
          {product.concerns.slice(0, 2).join(" / ")}
          {product.skinTypes[0] ? ` / ${product.skinTypes[0]}` : ""}
        </p>
        <div className="mt-auto border-t border-stone-200 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <AddToCartButton
              className="btn-primary w-full px-4 py-3"
              label="Agregar a rutina"
              name={product.name}
              price={product.price}
              productId={product.id}
              slug={product.slug}
            />
            <Link
              className="btn-secondary w-full px-4 py-3"
              href={`/producto/${product.slug}`}
            >
              Ver detalle
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
