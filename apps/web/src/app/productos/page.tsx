import { CatalogPage } from "@/components/catalog/catalog-page";
import { SectionHeading } from "@/components/shared/section-heading";
import { getCategories, getProducts } from "@/lib/storefront-api";

type ProductsPageProps = {
  searchParams?: Promise<{
    categoria?: string;
    q?: string;
    problema?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Catalogo"
        title="Seleccion curada para una rutina consistente"
        description="Filtros orientados a compra: categoria, tipo de piel, problema, disponibilidad y orden."
      />
      <CatalogPage
        categories={categories}
        initialCategory={resolvedSearchParams?.categoria}
        initialConcern={resolvedSearchParams?.problema}
        initialProducts={products}
        initialSearch={resolvedSearchParams?.q}
      />
    </div>
  );
}
