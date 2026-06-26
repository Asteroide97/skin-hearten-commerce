import type { Metadata } from "next";

import { VerifiedReviewForm } from "@/components/store/verified-review-form";
import { getProducts } from "@/lib/storefront-api";

type WriteReviewPageProps = {
  searchParams: Promise<{
    product?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Escribir resena verificada | Skin Hearten",
  description:
    "Valida tu pedido y deja una resena verificada de tu compra en Skin Hearten.",
};

export default async function WriteReviewPage({ searchParams }: WriteReviewPageProps) {
  const params = await searchParams;
  const products = await getProducts();

  const productQuery = params.product?.trim();
  const initialProduct = productQuery
    ? products.find((product) => product.id === productQuery || product.slug === productQuery)
    : null;

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
      <VerifiedReviewForm
        initialProductId={initialProduct?.id ?? null}
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          brand: product.brand,
        }))}
      />
    </div>
  );
}
