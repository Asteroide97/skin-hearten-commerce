"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { ProductCard } from "@/components/store/product-card";
import { categories, products } from "@/lib/site-data";

type CatalogPageProps = {
  initialCategory?: string;
};

type SortOption =
  | "best-sellers"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "featured";

export function CatalogPage({ initialCategory = "all" }: CatalogPageProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedConcern, setSelectedConcern] = useState("all");
  const [selectedSkinType, setSelectedSkinType] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("best-sellers");

  const deferredCategory = useDeferredValue(selectedCategory);
  const deferredConcern = useDeferredValue(selectedConcern);
  const deferredSkinType = useDeferredValue(selectedSkinType);
  const deferredAvailability = useDeferredValue(availability);
  const deferredSort = useDeferredValue(sortBy);

  const { data = [] } = useQuery({
    queryKey: ["catalog-products"],
    queryFn: async () => products,
  });

  const concerns = Array.from(new Set(products.flatMap((product) => product.concerns)));
  const skinTypes = Array.from(new Set(products.flatMap((product) => product.skinTypes)));

  const filteredProducts = useMemo(() => {
    const catalog = data.filter((product) => {
      const matchesCategory =
        deferredCategory === "all" ||
        product.category.toLowerCase() ===
          categories.find((category) => category.slug === deferredCategory)?.name.toLowerCase();
      const matchesConcern =
        deferredConcern === "all" || product.concerns.includes(deferredConcern);
      const matchesSkinType =
        deferredSkinType === "all" || product.skinTypes.includes(deferredSkinType);
      const matchesAvailability =
        deferredAvailability === "all" ||
        (deferredAvailability === "in-stock" ? product.stock > 0 : product.stock === 0);

      return matchesCategory && matchesConcern && matchesSkinType && matchesAvailability;
    });

    return catalog.sort((left, right) => {
      switch (deferredSort) {
        case "price-asc":
          return left.price - right.price;
        case "price-desc":
          return right.price - left.price;
        case "featured":
          return Number(right.featured) - Number(left.featured);
        case "newest":
          return right.id.localeCompare(left.id);
        case "best-sellers":
        default:
          return Number(right.bestSeller) - Number(left.bestSeller);
      }
    });
  }, [data, deferredAvailability, deferredCategory, deferredConcern, deferredSkinType, deferredSort]);

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="soft-panel h-fit rounded-[1.8rem] p-6">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-stone-900">Categoria</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={`rounded-full px-3 py-2 text-sm ${selectedCategory === "all" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-700"}`}
                onClick={() => setSelectedCategory("all")}
                type="button"
              >
                Todas
              </button>
              {categories.map((category) => (
                <button
                  className={`rounded-full px-3 py-2 text-sm ${selectedCategory === category.slug ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-700"}`}
                  key={category.id}
                  onClick={() => setSelectedCategory(category.slug)}
                  type="button"
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-stone-900">Tipo de piel</span>
            <select
              className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
              onChange={(event) => setSelectedSkinType(event.target.value)}
              value={selectedSkinType}
            >
              <option value="all">Todas</option>
              {skinTypes.map((skinType) => (
                <option key={skinType} value={skinType}>
                  {skinType}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-stone-900">Problema</span>
            <select
              className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
              onChange={(event) => setSelectedConcern(event.target.value)}
              value={selectedConcern}
            >
              <option value="all">Todos</option>
              {concerns.map((concern) => (
                <option key={concern} value={concern}>
                  {concern}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-stone-900">Disponibilidad</span>
            <select
              className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
              onChange={(event) => setAvailability(event.target.value)}
              value={availability}
            >
              <option value="all">Todo</option>
              <option value="in-stock">Disponible</option>
              <option value="out-of-stock">Sin stock</option>
            </select>
          </label>
        </div>
      </aside>

      <div className="space-y-6">
        <div className="soft-panel flex flex-col gap-4 rounded-[1.8rem] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Catalogo</p>
            <h2 className="mt-2 font-serif text-3xl text-stone-900">Skincare con criterio y foco de compra</h2>
            <p className="mt-3 text-sm text-stone-600">{filteredProducts.length} productos visibles</p>
          </div>
          <label className="block min-w-[220px]">
            <span className="text-sm font-semibold text-stone-900">Ordenar por</span>
            <select
              className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              value={sortBy}
            >
              <option value="best-sellers">Mas vendidos</option>
              <option value="newest">Mas recientes</option>
              <option value="price-asc">Precio ascendente</option>
              <option value="price-desc">Precio descendente</option>
              <option value="featured">Destacados</option>
            </select>
          </label>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

