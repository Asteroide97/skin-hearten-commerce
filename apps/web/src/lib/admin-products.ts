export type AdminProductImage = {
  id: number;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type AdminProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
  image: string | null;
  imageObjects: AdminProductImage[];
};

export type AdminProductImageUpdateInput = {
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
};

export function resolveAdminProductAssetUrl(url: string) {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return null;
  }

  if (normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://")) {
    return normalizedUrl;
  }

  if (normalizedUrl.startsWith("/")) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (!apiBaseUrl) {
      return normalizedUrl;
    }

    const origin = apiBaseUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
    return `${origin}${normalizedUrl}`;
  }

  return null;
}
