import { brands as fallbackBrands, categories as fallbackCategories, getProductBySlug as getFallbackProductBySlug, products as fallbackProducts } from "@/lib/site-data";
import type { Brand, Category, Product, ProductFaq } from "@/lib/types";

export type StorefrontProductsParams = {
  brand?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  skinType?: string;
  concern?: string;
  available?: boolean;
  search?: string;
  featured?: boolean;
  bestSeller?: boolean;
  limit?: number;
};

type ApiCategory = {
  id: number | string;
  name: string;
  slug: string;
  description?: string | null;
};

type ApiBrand = {
  id: number | string;
  name: string;
  slug?: string | null;
  description?: string | null;
};

type ApiProduct = {
  id: number | string;
  slug: string;
  name: string;
  sku?: string;
  brand?: string;
  brand_name?: string;
  category?: string;
  category_name?: string;
  price: number;
  compareAtPrice?: number | null;
  image?: string | null;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  badges?: string[];
  stock?: number;
  description?: string;
  benefits?: string[];
  ingredients?: string[];
  usage?: string[];
  faq?: ProductFaq[];
  skinTypes?: string[];
  skin_type?: string[];
  concerns?: string[];
  concern?: string[];
  highlight?: string;
  gradient?: string;
  featured?: boolean;
  bestSeller?: boolean;
};

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return null;
  }

  return apiUrl.replace(/\/$/, "");
}

async function requestStorefrontJson<TData>(path: string, params?: URLSearchParams) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return null;
  }

  const query = params && params.toString().length > 0 ? `?${params.toString()}` : "";

  try {
    const response = await fetch(`${apiBaseUrl}${path}${query}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as TData;
  } catch {
    return null;
  }
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getDefaultGradient(category: string) {
  switch (normalizeText(category)) {
    case "limpiadores":
      return "from-stone-100 via-white to-amber-50";
    case "serums":
      return "from-rose-100 via-white to-stone-100";
    case "hidratantes":
      return "from-orange-50 via-rose-50 to-white";
    case "protector solar":
      return "from-yellow-50 via-white to-rose-50";
    case "tratamientos":
      return "from-amber-100 via-rose-50 to-white";
    default:
      return "from-stone-100 via-white to-rose-50";
  }
}

function normalizeStringArray(values?: string[]) {
  return Array.isArray(values) ? values.filter((value) => typeof value === "string" && value.trim().length > 0) : [];
}

function normalizeFaq(value: ProductFaq[] | undefined, fallback: ProductFaq[], productName: string): ProductFaq[] {
  if (Array.isArray(value) && value.length > 0) {
    return value.filter((entry) => entry.question.trim().length > 0 && entry.answer.trim().length > 0);
  }

  if (fallback.length > 0) {
    return fallback;
  }

  return [
    {
      question: "Como integrarlo en la rutina?",
      answer: `Integra ${productName} de forma constante dentro de una rutina simple y progresiva.`,
    },
  ];
}

function buildBadges(product: Pick<Product, "bestSeller" | "featured" | "compareAtPrice" | "price">, existing: string[]) {
  const badges = [...existing];

  if (product.bestSeller && !badges.includes("Bestseller")) {
    badges.push("Bestseller");
  }

  if (typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price && !badges.includes("Oferta")) {
    badges.push("Oferta");
  }

  if (product.featured && !badges.includes("Destacado")) {
    badges.push("Destacado");
  }

  return badges;
}

function mapApiProductToProduct(apiProduct: ApiProduct): Product {
  const fallbackProduct = fallbackProducts.find((product) => product.slug === apiProduct.slug);
  const apiSkinTypes = normalizeStringArray(apiProduct.skinTypes ?? apiProduct.skin_type);
  const skinTypes = apiSkinTypes.length > 0 ? apiSkinTypes : (fallbackProduct?.skinTypes ?? []);
  const apiConcerns = normalizeStringArray(apiProduct.concerns ?? apiProduct.concern);
  const concerns = apiConcerns.length > 0 ? apiConcerns : (fallbackProduct?.concerns ?? []);
  const images = normalizeStringArray(apiProduct.images);
  const image = apiProduct.image ?? images[0] ?? fallbackProduct?.image ?? fallbackProduct?.images[0];
  const bestSeller = Boolean(apiProduct.bestSeller ?? fallbackProduct?.bestSeller ?? false);
  const featured = Boolean(apiProduct.featured ?? fallbackProduct?.featured ?? false);
  const compareAtPrice =
    typeof apiProduct.compareAtPrice === "number" ? apiProduct.compareAtPrice : fallbackProduct?.compareAtPrice;

  const product: Product = {
    id: String(apiProduct.id),
    slug: apiProduct.slug,
    name: apiProduct.name,
    brand: apiProduct.brand ?? apiProduct.brand_name ?? fallbackProduct?.brand ?? "",
    category: apiProduct.category ?? apiProduct.category_name ?? fallbackProduct?.category ?? "",
    sku: apiProduct.sku ?? fallbackProduct?.sku ?? "",
    price: apiProduct.price,
    compareAtPrice,
    image,
    stock: typeof apiProduct.stock === "number" ? apiProduct.stock : fallbackProduct?.stock ?? 0,
    description: apiProduct.description ?? fallbackProduct?.description ?? "",
    benefits: (() => {
      const values = normalizeStringArray(apiProduct.benefits);
      return values.length > 0 ? values : (fallbackProduct?.benefits ?? []);
    })(),
    ingredients: (() => {
      const values = normalizeStringArray(apiProduct.ingredients);
      return values.length > 0 ? values : (fallbackProduct?.ingredients ?? []);
    })(),
    usage: (() => {
      const values = normalizeStringArray(apiProduct.usage);
      return values.length > 0 ? values : (fallbackProduct?.usage ?? []);
    })(),
    faq: normalizeFaq(apiProduct.faq, fallbackProduct?.faq ?? [], apiProduct.name),
    skinTypes,
    concerns,
    badges: normalizeStringArray(apiProduct.badges),
    images: images.length > 0 ? images : image ? [image] : (fallbackProduct?.images ?? []),
    highlight: apiProduct.highlight ?? fallbackProduct?.highlight ?? apiProduct.description ?? apiProduct.name,
    gradient: apiProduct.gradient ?? fallbackProduct?.gradient ?? getDefaultGradient(apiProduct.category ?? apiProduct.category_name ?? ""),
    featured,
    bestSeller,
    rating: typeof apiProduct.rating === "number" ? apiProduct.rating : fallbackProduct?.rating ?? 4.8,
    reviewCount:
      typeof apiProduct.reviewCount === "number" ? apiProduct.reviewCount : fallbackProduct?.reviewCount ?? 0,
  };

  product.badges = buildBadges(product, product.badges ?? []);
  return product;
}

function mapApiCategoryToCategory(category: ApiCategory): Category {
  return {
    id: String(category.id),
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
  };
}

function mapApiBrandToBrand(brand: ApiBrand): Brand {
  return {
    id: String(brand.id),
    name: brand.name,
    slug: brand.slug ?? undefined,
    description: brand.description ?? "",
  };
}

function matchesSearch(product: Product, search: string) {
  const normalizedSearch = normalizeText(search);
  if (!normalizedSearch) {
    return true;
  }

  return [
    product.name,
    product.brand,
    product.category,
    product.highlight,
    ...product.ingredients,
    ...product.concerns,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

function applyProductFilters(products: Product[], params: StorefrontProductsParams = {}) {
  const filtered = products.filter((product) => {
    const requestedSkinType = params.skinType;
    const requestedConcern = params.concern;

    if (params.brand && normalizeText(product.brand) !== normalizeText(params.brand)) {
      return false;
    }

    if (params.category) {
      const categoryMatches =
        normalizeText(product.category) === normalizeText(params.category) ||
        normalizeText(product.category.replaceAll(" ", "-")) === normalizeText(params.category);
      if (!categoryMatches) {
        return false;
      }
    }

    if (typeof params.minPrice === "number" && product.price < params.minPrice) {
      return false;
    }

    if (typeof params.maxPrice === "number" && product.price > params.maxPrice) {
      return false;
    }

    if (requestedSkinType && !product.skinTypes.some((entry) => normalizeText(entry) === normalizeText(requestedSkinType))) {
      return false;
    }

    if (requestedConcern && !product.concerns.some((entry) => normalizeText(entry) === normalizeText(requestedConcern))) {
      return false;
    }

    if (typeof params.available === "boolean" && (product.stock > 0) !== params.available) {
      return false;
    }

    if (typeof params.featured === "boolean" && product.featured !== params.featured) {
      return false;
    }

    if (typeof params.bestSeller === "boolean" && product.bestSeller !== params.bestSeller) {
      return false;
    }

    if (params.search && !matchesSearch(product, params.search)) {
      return false;
    }

    return true;
  });

  return typeof params.limit === "number" ? filtered.slice(0, params.limit) : filtered;
}

export async function getProducts(params: StorefrontProductsParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.brand) {
    queryParams.set("brand", params.brand);
  }
  if (params.category) {
    queryParams.set("category", params.category);
  }
  if (typeof params.minPrice === "number") {
    queryParams.set("min_price", String(params.minPrice));
  }
  if (typeof params.maxPrice === "number") {
    queryParams.set("max_price", String(params.maxPrice));
  }
  if (params.skinType) {
    queryParams.set("skin_type", params.skinType);
  }
  if (params.concern) {
    queryParams.set("concern", params.concern);
  }
  if (typeof params.available === "boolean") {
    queryParams.set("available", String(params.available));
  }

  const apiProducts = await requestStorefrontJson<ApiProduct[]>("/products", queryParams);
  const products = apiProducts ? apiProducts.map(mapApiProductToProduct) : fallbackProducts;
  return applyProductFilters(products, params);
}

export async function getProductBySlug(slug: string) {
  const apiProduct = await requestStorefrontJson<ApiProduct>(`/products/${encodeURIComponent(slug)}`);
  if (apiProduct) {
    return mapApiProductToProduct(apiProduct);
  }

  return getFallbackProductBySlug(slug) ?? null;
}

export async function getCategories() {
  const apiCategories = await requestStorefrontJson<ApiCategory[]>("/categories");
  return apiCategories ? apiCategories.map(mapApiCategoryToCategory) : fallbackCategories;
}

export async function getBrands() {
  const apiBrands = await requestStorefrontJson<ApiBrand[]>("/brands");
  return apiBrands ? apiBrands.map(mapApiBrandToBrand) : fallbackBrands;
}
