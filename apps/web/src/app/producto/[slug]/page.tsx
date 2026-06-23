import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/shared/section-heading";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { ProductCard } from "@/components/store/product-card";
import { ProductReviewsSection } from "@/components/store/product-reviews-section";
import { ProductViewTracker } from "@/components/store/product-view-tracker";
import { formatCurrency } from "@/lib/format";
import { createEmptyProductReviewSummary } from "@/lib/product-reviews";
import { getProductReviews } from "@/lib/product-reviews-api";
import { getProductBySlug, getProducts } from "@/lib/storefront-api";

type ProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {};
  }

  return {
    title: `${product.name} | Skin Hearten`,
    description: product.highlight,
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const [product, products, reviewResult] = await Promise.all([
    getProductBySlug(slug),
    getProducts(),
    getProductReviews(slug),
  ]);

  if (!product) {
    notFound();
  }

  const reviewSummary = reviewResult.ok
    ? reviewResult.data
    : createEmptyProductReviewSummary(Number(product.id));

  const related = products
    .filter((entry) => entry.category === product.category && entry.id !== product.id)
    .slice(0, 2);
  const complementary = products
    .filter((entry) => entry.category !== product.category && entry.id !== product.id)
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-5 py-8 sm:px-6 lg:px-8">
      <ProductViewTracker
        category={product.category}
        price={product.price}
        productId={product.id}
        productName={product.name}
      />
      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {product.images.map((image, index) => (
            <div
              className={`min-h-[240px] rounded-[1.8rem] bg-gradient-to-br ${product.gradient} p-5 ${index === 0 ? "sm:col-span-2" : ""}`}
              key={`${product.id}-${image}`}
            >
              <div className="flex h-full flex-col justify-between rounded-[1.5rem] border border-white/75 bg-white/50 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Vista 0{index + 1}</p>
                <p className="font-serif text-3xl text-stone-900">{product.name}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="soft-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">{product.brand}</p>
          <h1 className="mt-2 font-serif text-4xl text-stone-900">{product.name}</h1>
          <p className="mt-3 text-sm text-stone-500">SKU: {product.sku}</p>
          <div className="mt-6 flex items-center gap-4">
            <p className="text-3xl font-semibold text-stone-900">{formatCurrency(product.price)}</p>
            {product.compareAtPrice ? (
              <p className="text-lg text-stone-400 line-through">{formatCurrency(product.compareAtPrice)}</p>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-stone-600">
            Stock disponible: <span className="font-semibold text-stone-900">{product.stock}</span>
          </p>
          <p className="mt-6 text-sm leading-7 text-stone-600">{product.description}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {product.concerns.map((concern) => (
              <span
                className="rounded-full border border-stone-200 px-3 py-2 text-xs text-stone-600"
                key={concern}
              >
                {concern}
              </span>
            ))}
          </div>
          <div className="mt-8">
            <AddToCartButton
              name={product.name}
              price={product.price}
              productId={product.id}
              slug={product.slug}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        <div className="soft-panel rounded-[1.8rem] p-6 lg:col-span-2">
          <SectionHeading title="Descripcion" />
          <p className="mt-6 text-sm leading-7 text-stone-600">{product.description}</p>
        </div>
        <div className="soft-panel rounded-[1.8rem] p-6">
          <SectionHeading title="Ingredientes" />
          <ul className="mt-6 space-y-3 text-sm text-stone-600">
            {product.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </div>
        <div className="soft-panel rounded-[1.8rem] p-6">
          <SectionHeading title="Modo de uso" />
          <ul className="mt-6 space-y-3 text-sm text-stone-600">
            {product.usage.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="soft-panel rounded-[1.8rem] p-6">
        <SectionHeading title="FAQ" description="Base lista para completarse desde panel admin o CMS interno." />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {product.faq.map((entry) => (
            <div className="rounded-[1.4rem] bg-white p-5" key={entry.question}>
              <p className="font-semibold text-stone-900">{entry.question}</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">{entry.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <ProductReviewsSection
        initialSummary={reviewSummary}
        productName={product.name}
        productRef={product.slug}
      />

      <section className="space-y-6">
        <SectionHeading title="Productos relacionados" />
        <div className="grid gap-6 md:grid-cols-2">
          {related.map((entry) => (
            <ProductCard key={entry.id} product={entry} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading title="Productos complementarios" />
        <div className="grid gap-6 md:grid-cols-2">
          {complementary.map((entry) => (
            <ProductCard key={entry.id} product={entry} />
          ))}
        </div>
      </section>
    </div>
  );
}
