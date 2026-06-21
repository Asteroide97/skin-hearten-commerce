import Link from "next/link";

import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="overflow-hidden rounded-[1.8rem] border border-stone-200 bg-white shadow-soft">
      <Link className="block" href={`/producto/${product.slug}`}>
        <div className={`h-60 bg-gradient-to-br ${product.gradient} p-6`}>
          <div className="flex h-full flex-col justify-between rounded-[1.4rem] border border-white/70 bg-white/45 p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                {product.category}
              </span>
              {product.bestSeller ? (
                <span className="rounded-full border border-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-700">
                  Mas vendido
                </span>
              ) : null}
            </div>
            <div>
              <p className="text-sm text-stone-600">{product.brand}</p>
              <h3 className="mt-2 text-xl font-semibold text-stone-900">{product.name}</h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-stone-700">{product.highlight}</p>
            </div>
          </div>
        </div>
      </Link>
      <div className="space-y-4 p-6">
        <div className="flex items-baseline gap-3">
          <p className="text-lg font-semibold text-stone-900">{formatCurrency(product.price)}</p>
          {product.compareAtPrice ? (
            <p className="text-sm text-stone-400 line-through">{formatCurrency(product.compareAtPrice)}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {product.skinTypes.slice(0, 2).map((tag) => (
            <span
              className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600"
              key={`${product.id}-${tag}`}
            >
              {tag}
            </span>
          ))}
        </div>
        <Link
          className="inline-flex rounded-full border border-stone-950 px-4 py-2 text-sm font-medium text-stone-950 transition hover:bg-stone-950 hover:text-white"
          href={`/producto/${product.slug}`}
        >
          Ver producto
        </Link>
      </div>
    </article>
  );
}

