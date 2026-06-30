import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckCircleIcon } from "@/components/shared/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { EditorialFigure } from "@/components/store/editorial-figure";
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
    <div className="product-page mx-auto max-w-[1320px] space-y-14 px-5 py-8 sm:px-6 lg:px-8">
      <ProductViewTracker
        category={product.category}
        price={product.price}
        productId={product.id}
        productName={product.name}
      />

      <section className="grid gap-10 border-b border-stone-200 pb-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <div className="grid gap-4 sm:grid-cols-2">
          <EditorialFigure
            className="min-h-[620px] sm:col-span-2"
            description={product.highlight}
            frame="portrait"
            label="Studio 01"
            title={product.name}
            tone="linen"
          />
          <EditorialFigure
            className="min-h-[300px]"
            description={product.benefits[0]}
            frame="texture"
            label="Texture"
            title={product.category}
            tone="blush"
          />
          <EditorialFigure
            className="min-h-[300px]"
            description={product.usage[0]}
            frame="vanity"
            label="Routine"
            title={product.brand}
            tone="mist"
          />
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <p className="section-label">{product.brand}</p>
            <h1 className="font-serif text-[3rem] leading-[0.94] text-stone-950 sm:text-[3.7rem]">
              {product.name}
            </h1>
            <p className="max-w-xl text-base leading-8 text-stone-600">{product.highlight}</p>
            <p className="text-sm text-stone-500">SKU {product.sku}</p>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-3xl font-semibold text-stone-900">{formatCurrency(product.price)}</p>
            {product.compareAtPrice ? (
              <p className="text-lg text-stone-400 line-through">{formatCurrency(product.compareAtPrice)}</p>
            ) : null}
          </div>

          <p className="text-sm text-stone-600">
            Stock disponible: <span className="font-semibold text-stone-900">{product.stock}</span>
          </p>

          <div className="grid gap-4 border-y border-stone-200 py-6 sm:grid-cols-2">
            <div>
              <p className="section-label">Objetivos</p>
              <p className="mt-2 text-sm leading-7 text-stone-700">{product.concerns.join(" / ")}</p>
            </div>
            <div>
              <p className="section-label">Tipo de piel</p>
              <p className="mt-2 text-sm leading-7 text-stone-700">{product.skinTypes.join(" / ")}</p>
            </div>
          </div>

          <div className="grid gap-6 border-b border-stone-200 pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <p className="section-label">Beneficios clave</p>
              <div className="mt-4 grid gap-3">
                {product.benefits.slice(0, 3).map((benefit) => (
                  <div className="flex items-start gap-3 text-sm leading-7 text-stone-700" key={benefit}>
                    <CheckCircleIcon className="mt-1 h-4 w-4 shrink-0 text-stone-900" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:min-w-[220px]">
              <AddToCartButton
                className="btn-primary w-full"
                name={product.name}
                price={product.price}
                productId={product.id}
                slug={product.slug}
              />
              <a className="btn-secondary w-full" href="#opiniones">
                Ver opiniones
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 border-b border-stone-200 pb-12 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
        <div className="lg:col-span-1">
          <SectionHeading
            description="Textura, sensorial y resultados esperados en uso constante."
            title="Descripcion"
          />
          <p className="mt-6 text-sm leading-7 text-stone-600">{product.description}</p>
        </div>
        <div className="border-t border-stone-200 pt-4">
          <SectionHeading title="Ingredientes" />
          <ul className="mt-6 space-y-3 text-sm text-stone-600">
            {product.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </div>
        <div className="border-t border-stone-200 pt-4">
          <SectionHeading title="Modo de uso" />
          <ul className="mt-6 space-y-3 text-sm text-stone-600">
            {product.usage.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-[2.2rem] bg-[#fbf5ee] p-6 sm:p-8">
        <SectionHeading title="FAQ" description="Respuestas claras para decidir sin salir a investigar." />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {product.faq.map((entry) => (
            <div className="border-t border-stone-200 pt-5" key={entry.question}>
              <p className="font-semibold text-stone-900">{entry.question}</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">{entry.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <div id="opiniones">
        <ProductReviewsSection
          initialSummary={reviewSummary}
          productName={product.name}
          productRef={product.slug}
        />
      </div>

      <section className="space-y-6">
        <SectionHeading title="Productos relacionados" />
        <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
          {related.map((entry) => (
            <ProductCard key={entry.id} product={entry} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading title="Productos complementarios" />
        <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
          {complementary.map((entry) => (
            <ProductCard key={entry.id} product={entry} />
          ))}
        </div>
      </section>
    </div>
  );
}
