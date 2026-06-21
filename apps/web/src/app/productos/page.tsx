import { CatalogPage } from "@/components/catalog/catalog-page";
import { SectionHeading } from "@/components/shared/section-heading";

type ProductsPageProps = {
  searchParams?: Promise<{
    categoria?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Catalogo"
        title="Seleccion curada para una rutina consistente"
        description="Filtros orientados a compra: categoria, tipo de piel, problema, disponibilidad y orden."
      />
      <CatalogPage initialCategory={resolvedSearchParams?.categoria} />
    </div>
  );
}

