"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";

import { SearchIcon } from "@/components/shared/icons";
import { formatCurrency } from "@/lib/format";
import type { AdminProduct, AdminProductImage } from "@/lib/admin-products";
import { resolveAdminProductAssetUrl } from "@/lib/admin-products";

type ProductsApiResponse =
  | { ok: true; data: AdminProduct[] }
  | { ok: false; reason: string; message?: string };

type ProductDetailApiResponse =
  | { ok: true; data: AdminProduct }
  | { ok: false; reason: string; message?: string };

type ProductImageApiResponse =
  | { ok: true; data: AdminProductImage }
  | { ok: false; reason: string; message?: string };

type DeleteApiResponse =
  | { ok: true; data: { message: string } }
  | { ok: false; reason: string; message?: string };

type Notice = {
  kind: "error" | "success";
  message: string;
} | null;

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function getPageMessage(reason: string | null) {
  if (!reason) {
    return "Aun no hay productos disponibles para administrar media.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para conectar el panel con FastAPI.";
  }

  if (reason === "auth_failed") {
    return "Tu sesion de SuperAdmin no es valida o expiro. Vuelve a iniciar sesion.";
  }

  return "No pudimos cargar los productos por ahora. El panel mantiene un estado vacio amigable mientras la API no este disponible.";
}

function getFileValidationError(file: File) {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return "Solo se permiten archivos JPEG, PNG o WebP.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "La imagen supera el limite de 5 MB.";
  }
  return null;
}

function filenameToAltText(filename: string) {
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function MediaPreview({
  altText,
  className = "",
  url,
}: {
  altText?: string | null;
  className?: string;
  url: string;
}) {
  const resolvedUrl = resolveAdminProductAssetUrl(url);

  if (!resolvedUrl) {
    return (
      <div className={`flex h-full min-h-52 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-stone-100 via-white to-[#f7ede5] px-6 text-center ${className}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Preview demo</p>
          <p className="mt-3 text-sm leading-6 text-stone-700">{altText || url}</p>
        </div>
      </div>
    );
  }

  return (
    <img
      alt={altText || "Imagen de producto"}
      className={`h-full min-h-52 w-full rounded-[1.4rem] object-cover ${className}`}
      src={resolvedUrl}
    />
  );
}

export function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [drawerNotice, setDrawerNotice] = useState<Notice>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAltText, setUploadAltText] = useState("");
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [draftAltTextByImageId, setDraftAltTextByImageId] = useState<Record<number, string>>({});
  const [processingImageId, setProcessingImageId] = useState<number | null>(null);
  const [isReplacingImage, setIsReplacingImage] = useState(false);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const replaceTargetImageRef = useRef<AdminProductImage | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/admin/products", { cache: "no-store" });
        const payload = (await response.json()) as ProductsApiResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setProducts([]);
          setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
          return;
        }

        setProducts(payload.data);
        setErrorReason(null);
      } catch {
        if (!cancelled) {
          setProducts([]);
          setErrorReason("fetch_failed");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDraftAltTextByImageId(
      Object.fromEntries((selectedProduct?.imageObjects ?? []).map((image) => [image.id, image.altText ?? ""])),
    );
  }, [selectedProduct]);

  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) {
        URL.revokeObjectURL(uploadPreviewUrl);
      }
    };
  }, [uploadPreviewUrl]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.brand, product.category, product.sku].join(" ").toLowerCase().includes(normalizedSearch),
    );
  }, [products, searchValue]);

  async function loadProductDetail(productId: number) {
    setIsDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}`, { cache: "no-store" });
      const payload = (await response.json()) as ProductDetailApiResponse;

      if (!response.ok || !payload.ok) {
        setDrawerNotice({
          kind: "error",
          message: payload.ok ? "No pudimos cargar el detalle del producto." : payload.message ?? "No pudimos cargar el detalle del producto.",
        });
        return null;
      }

      setSelectedProduct(payload.data);
      setProducts((current) =>
        current.map((product) => (product.id === payload.data.id ? payload.data : product)),
      );
      return payload.data;
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos cargar el detalle del producto.",
      });
      return null;
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleOpenProduct(productId: number) {
    setSelectedProductId(productId);
    setSelectedProduct(null);
    setDrawerNotice(null);
    await loadProductDetail(productId);
  }

  function resetUploadComposer() {
    if (uploadPreviewUrl) {
      URL.revokeObjectURL(uploadPreviewUrl);
    }
    setUploadFile(null);
    setUploadAltText("");
    setUploadPreviewUrl(null);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  }

  function prepareUploadFile(file: File) {
    const validationError = getFileValidationError(file);
    if (validationError) {
      setDrawerNotice({ kind: "error", message: validationError });
      return;
    }

    if (uploadPreviewUrl) {
      URL.revokeObjectURL(uploadPreviewUrl);
    }

    setUploadFile(file);
    setUploadAltText(filenameToAltText(file.name));
    setUploadPreviewUrl(URL.createObjectURL(file));
    setDrawerNotice(null);
  }

  async function handleUploadImage() {
    if (!selectedProduct || !uploadFile) {
      return;
    }

    setIsUploading(true);
    setDrawerNotice(null);

    try {
      const formData = new FormData();
      formData.set("file", uploadFile);
      if (uploadAltText.trim()) {
        formData.set("altText", uploadAltText.trim());
      }

      const response = await fetch(`/api/admin/products/${selectedProduct.id}/images`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ProductImageApiResponse;

      if (!response.ok || !payload.ok) {
        setDrawerNotice({
          kind: "error",
          message: payload.ok ? "No pudimos subir la imagen." : payload.message ?? "No pudimos subir la imagen.",
        });
        return;
      }

      await loadProductDetail(selectedProduct.id);
      resetUploadComposer();
      setDrawerNotice({
        kind: "success",
        message: "Imagen subida correctamente.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos subir la imagen por ahora.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function patchImage(imageId: number, payload: Record<string, unknown>, successMessage: string) {
    if (!selectedProduct) {
      return;
    }

    setProcessingImageId(imageId);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/products/${selectedProduct.id}/images/${imageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ProductImageApiResponse;

      if (!response.ok || !result.ok) {
        setDrawerNotice({
          kind: "error",
          message: result.ok ? "No pudimos actualizar la imagen." : result.message ?? "No pudimos actualizar la imagen.",
        });
        return;
      }

      await loadProductDetail(selectedProduct.id);
      setDrawerNotice({
        kind: "success",
        message: successMessage,
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos actualizar la imagen por ahora.",
      });
    } finally {
      setProcessingImageId(null);
    }
  }

  async function handleDeleteImage(image: AdminProductImage) {
    if (!selectedProduct) {
      return;
    }
    if (!window.confirm("Esta accion eliminara la imagen del producto. Deseas continuar?")) {
      return;
    }

    setProcessingImageId(image.id);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/products/${selectedProduct.id}/images/${image.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as DeleteApiResponse;

      if (!response.ok || !result.ok) {
        setDrawerNotice({
          kind: "error",
          message: result.ok ? "No pudimos eliminar la imagen." : result.message ?? "No pudimos eliminar la imagen.",
        });
        return;
      }

      await loadProductDetail(selectedProduct.id);
      setDrawerNotice({
        kind: "success",
        message: "Imagen eliminada correctamente.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos eliminar la imagen por ahora.",
      });
    } finally {
      setProcessingImageId(null);
    }
  }

  async function handleReplaceSelection(file: File) {
    const targetImage = replaceTargetImageRef.current;
    if (!selectedProduct || !targetImage) {
      return;
    }

    const validationError = getFileValidationError(file);
    if (validationError) {
      setDrawerNotice({ kind: "error", message: validationError });
      return;
    }

    setProcessingImageId(targetImage.id);
    setIsReplacingImage(true);
    setDrawerNotice(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      if (targetImage.altText) {
        formData.set("altText", targetImage.altText);
      }

      const uploadResponse = await fetch(`/api/admin/products/${selectedProduct.id}/images`, {
        method: "POST",
        body: formData,
      });
      const uploadResult = (await uploadResponse.json()) as ProductImageApiResponse;

      if (!uploadResponse.ok || !uploadResult.ok) {
        setDrawerNotice({
          kind: "error",
          message: uploadResult.ok ? "No pudimos reemplazar la imagen." : uploadResult.message ?? "No pudimos reemplazar la imagen.",
        });
        return;
      }

      const updatePayload: Record<string, unknown> = {
        sortOrder: targetImage.sortOrder,
      };
      if (targetImage.isPrimary) {
        updatePayload.isPrimary = true;
      }
      if (targetImage.altText) {
        updatePayload.altText = targetImage.altText;
      }

      const patchResponse = await fetch(
        `/api/admin/products/${selectedProduct.id}/images/${uploadResult.data.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        },
      );
      const patchResult = (await patchResponse.json()) as ProductImageApiResponse;
      if (!patchResponse.ok || !patchResult.ok) {
        setDrawerNotice({
          kind: "error",
          message: patchResult.ok ? "No pudimos acomodar la imagen nueva." : patchResult.message ?? "No pudimos acomodar la imagen nueva.",
        });
        return;
      }

      const deleteResponse = await fetch(`/api/admin/products/${selectedProduct.id}/images/${targetImage.id}`, {
        method: "DELETE",
      });
      const deleteResult = (await deleteResponse.json()) as DeleteApiResponse;
      if (!deleteResponse.ok || !deleteResult.ok) {
        setDrawerNotice({
          kind: "error",
          message: deleteResult.ok ? "No pudimos eliminar la imagen anterior." : deleteResult.message ?? "No pudimos eliminar la imagen anterior.",
        });
        return;
      }

      await loadProductDetail(selectedProduct.id);
      setDrawerNotice({
        kind: "success",
        message: "Imagen reemplazada correctamente.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos reemplazar la imagen por ahora.",
      });
    } finally {
      setProcessingImageId(null);
      setIsReplacingImage(false);
      replaceTargetImageRef.current = null;
      if (replaceInputRef.current) {
        replaceInputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <div className="admin-workspace admin-products space-y-5">
        <section className="admin-panel px-4 py-5 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-label">Productos</p>
              <h1 className="mt-2 font-serif text-3xl text-stone-900 sm:text-[2.4rem]">Product Media Manager</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                Administra imagenes reales de producto desde un solo panel. Puedes subir, reemplazar, marcar primaria, reordenar y eliminar sin tocar el storefront publico.
              </p>
            </div>
            <div className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
              {isLoading ? "Cargando..." : `${products.length} productos`}
            </div>
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-[1rem] border border-stone-200 bg-white px-4 py-2.5">
            <SearchIcon className="h-4 w-4 text-stone-500" />
            <input
              className="w-full border-none bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
              onChange={(event) => {
                setSearchValue(event.target.value);
              }}
              placeholder="Buscar por producto, marca, categoria o SKU"
              value={searchValue}
            />
          </label>
        </section>

        <section className="admin-panel p-3 sm:p-4">
          {isLoading ? (
            <EmptyBlock message="Cargando productos reales desde la API..." />
          ) : filteredProducts.length === 0 ? (
            <EmptyBlock message={getPageMessage(errorReason)} />
          ) : (
            <div className="admin-table-shell">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-left">
                  <thead className="bg-[#faf5ef] text-xs font-semibold tracking-[0.1em] text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Imagenes</th>
                      <th className="px-4 py-3 text-right">Gestion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                    {filteredProducts.map((product) => (
                      <tr className="align-top" key={product.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-900">{product.name}</p>
                          <p className="mt-1 text-xs text-stone-500">{product.brand}</p>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{product.sku}</td>
                        <td className="px-4 py-3 text-stone-600">{product.category}</td>
                        <td className="px-4 py-3 font-medium text-stone-900">{formatCurrency(product.price)}</td>
                        <td className="px-4 py-3 text-stone-600">{product.stock}</td>
                        <td className="px-4 py-3 text-stone-600">{product.imageObjects.length}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500"
                            onClick={() => {
                              void handleOpenProduct(product.id);
                            }}
                            type="button"
                          >
                            Gestionar imagenes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedProductId ? (
        <div className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-[2px]">
          <div className="absolute inset-y-0 right-0 flex w-full justify-end">
            <button
              aria-label="Cerrar drawer"
              className="hidden flex-1 cursor-default lg:block"
              onClick={() => {
                setSelectedProductId(null);
                setSelectedProduct(null);
                setDrawerNotice(null);
                resetUploadComposer();
              }}
              type="button"
            />
            <aside className="flex h-full w-full max-w-[1180px] flex-col overflow-y-auto border-l border-stone-200 bg-[#fcfaf8] px-4 py-4 shadow-2xl sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Producto</p>
                  <h2 className="mt-2 font-serif text-2xl text-stone-900 sm:text-[2rem]">
                    {selectedProduct?.name ?? `Producto #${selectedProductId}`}
                  </h2>
                  {selectedProduct ? (
                    <p className="mt-2 text-sm text-stone-600">
                      {selectedProduct.brand} · {selectedProduct.category} · {selectedProduct.sku}
                    </p>
                  ) : null}
                </div>
                <button
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-500"
                  onClick={() => {
                    setSelectedProductId(null);
                    setSelectedProduct(null);
                    setDrawerNotice(null);
                    resetUploadComposer();
                  }}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              {drawerNotice ? <NoticeBanner className="mt-5" notice={drawerNotice} /> : null}

              {isDetailLoading && !selectedProduct ? (
                <EmptyBlock className="mt-6" message="Cargando detalle del producto..." />
              ) : selectedProduct ? (
                <div className="mt-5 space-y-5 pb-8">
                  <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                      <div>
                        {selectedProduct.imageObjects[0] ? (
                          <MediaPreview
                            altText={selectedProduct.imageObjects[0].altText}
                            url={selectedProduct.imageObjects[0].url}
                          />
                        ) : (
                          <div className="flex min-h-52 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-stone-100 via-white to-[#f7ede5] px-6 text-center">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Sin portada</p>
                              <p className="mt-3 text-sm leading-6 text-stone-700">
                                Este producto aun no tiene una imagen primaria subida.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="rounded-[1.3rem] bg-[#fff8f3] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                          Imagenes del producto
                        </p>
                        <h3 className="mt-2 font-serif text-[1.6rem] text-stone-900">Subir nueva imagen</h3>
                        <p className="mt-3 text-sm leading-6 text-stone-600">
                          Archivos permitidos: JPEG, PNG y WebP. Maximo 5 MB por imagen.
                        </p>

                        <input
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              prepareUploadFile(file);
                            }
                          }}
                          ref={uploadInputRef}
                          type="file"
                        />
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void handleReplaceSelection(file);
                            }
                          }}
                          ref={replaceInputRef}
                          type="file"
                        />

                        <div className="mt-4 space-y-4">
                          <button
                            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500"
                            onClick={() => {
                              uploadInputRef.current?.click();
                            }}
                            type="button"
                          >
                            Seleccionar archivo
                          </button>

                          {uploadPreviewUrl ? (
                            <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                              <img
                                alt="Preview de carga"
                                className="h-full min-h-48 w-full rounded-[1.4rem] object-cover"
                                src={uploadPreviewUrl}
                              />
                              <div className="space-y-3 rounded-[1.2rem] border border-stone-200 bg-white p-4">
                                <p className="text-sm font-semibold text-stone-900">{uploadFile?.name}</p>
                                <p className="text-xs text-stone-500">
                                  {uploadFile ? `${Math.round(uploadFile.size / 1024)} KB` : ""}
                                </p>
                                <label className="block">
                                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                    Alt text
                                  </span>
                                  <input
                                    className="mt-2 w-full rounded-[1rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                                    onChange={(event) => {
                                      setUploadAltText(event.target.value);
                                    }}
                                    placeholder="Descripcion breve para SEO y accesibilidad"
                                    value={uploadAltText}
                                  />
                                </label>
                                <div className="flex flex-wrap gap-3">
                                  <button
                                    className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={isUploading}
                                    onClick={() => {
                                      void handleUploadImage();
                                    }}
                                    type="button"
                                  >
                                    {isUploading ? "Subiendo..." : "Subir imagen"}
                                  </button>
                                  <button
                                    className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500"
                                    onClick={() => {
                                      resetUploadComposer();
                                    }}
                                    type="button"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Galeria</p>
                        <h3 className="mt-2 font-serif text-[1.6rem] text-stone-900">Orden y reemplazo</h3>
                      </div>
                      <p className="text-sm text-stone-500">
                        {selectedProduct.imageObjects.length} imagenes
                      </p>
                    </div>

                    {selectedProduct.imageObjects.length === 0 ? (
                      <EmptyBlock className="mt-5" message="Aun no hay imagenes cargadas para este producto." />
                    ) : (
                      <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        {selectedProduct.imageObjects
                          .slice()
                          .sort((left, right) => left.sortOrder - right.sortOrder)
                          .map((image, index, array) => (
                            <article className="rounded-[1.3rem] border border-stone-200 bg-[#fffaf7] p-4" key={image.id}>
                              <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
                                <MediaPreview altText={image.altText} url={image.url} />

                                <div className="space-y-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-stone-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                                      Orden {index + 1}
                                    </span>
                                    {image.isPrimary ? (
                                      <span className="rounded-full border border-[#d8e3cf] bg-[#f3faf0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#476638]">
                                        Primaria
                                      </span>
                                    ) : null}
                                  </div>

                                  <label className="block">
                                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                      Alt text
                                    </span>
                                    <input
                                      className="mt-2 w-full rounded-[1rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                                      onChange={(event) => {
                                        setDraftAltTextByImageId((current) => ({
                                          ...current,
                                          [image.id]: event.target.value,
                                        }));
                                      }}
                                      value={draftAltTextByImageId[image.id] ?? ""}
                                    />
                                  </label>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
                                      disabled={processingImageId === image.id}
                                      onClick={() => {
                                        void patchImage(
                                          image.id,
                                          { altText: draftAltTextByImageId[image.id] ?? "" },
                                          "Alt text actualizado.",
                                        );
                                      }}
                                      type="button"
                                    >
                                      Guardar alt
                                    </button>
                                    {!image.isPrimary ? (
                                      <button
                                        className="rounded-full border border-[#d8e3cf] bg-[#f3faf0] px-4 py-2 text-xs font-semibold text-[#476638] transition hover:border-[#9dbe8e] disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={processingImageId === image.id}
                                        onClick={() => {
                                          void patchImage(image.id, { isPrimary: true }, "Imagen primaria actualizada.");
                                        }}
                                        type="button"
                                      >
                                        Marcar primaria
                                      </button>
                                    ) : null}
                                    <button
                                      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
                                      disabled={processingImageId === image.id || index === 0}
                                      onClick={() => {
                                        void patchImage(
                                          image.id,
                                          { sortOrder: Math.max(0, image.sortOrder - 1) },
                                          "Orden actualizado.",
                                        );
                                      }}
                                      type="button"
                                    >
                                      Subir
                                    </button>
                                    <button
                                      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
                                      disabled={processingImageId === image.id || index === array.length - 1}
                                      onClick={() => {
                                        void patchImage(
                                          image.id,
                                          { sortOrder: image.sortOrder + 1 },
                                          "Orden actualizado.",
                                        );
                                      }}
                                      type="button"
                                    >
                                      Bajar
                                    </button>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
                                      disabled={processingImageId === image.id || isReplacingImage}
                                      onClick={() => {
                                        replaceTargetImageRef.current = image;
                                        replaceInputRef.current?.click();
                                      }}
                                      type="button"
                                    >
                                      Reemplazar
                                    </button>
                                    <button
                                      className="rounded-full border border-[#ead0c7] bg-[#fff6f2] px-4 py-2 text-xs font-semibold text-[#8a4d3b] transition hover:border-[#d9a898] disabled:cursor-not-allowed disabled:opacity-50"
                                      disabled={processingImageId === image.id}
                                      onClick={() => {
                                        void handleDeleteImage(image);
                                      }}
                                      type="button"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </article>
                          ))}
                      </div>
                    )}
                  </section>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      ) : null}
    </>
  );
}

function EmptyBlock({
  className = "",
  message,
}: {
  className?: string;
  message: string;
}) {
  return (
    <div className={`${className} rounded-[1.2rem] border border-dashed border-stone-300 bg-white px-4 py-6 text-center`}>
      <p className="font-serif text-[1.6rem] text-stone-900">Sin resultados por ahora</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{message}</p>
    </div>
  );
}

function NoticeBanner({
  className = "",
  notice,
}: {
  className?: string;
  notice: NonNullable<Notice>;
}) {
  return (
    <div
      className={`${className} rounded-[1.2rem] border px-4 py-3 text-sm leading-6 ${
        notice.kind === "success"
          ? "border-[#d8e3cf] bg-[#f5faf1] text-[#476638]"
          : "border-[#ead0c7] bg-[#fff6f2] text-[#8a4d3b]"
      }`}
    >
      {notice.message}
    </div>
  );
}

