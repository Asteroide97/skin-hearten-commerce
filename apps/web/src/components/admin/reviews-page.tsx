"use client";

import { useEffect, useMemo, useState } from "react";

import { RatingStars } from "@/components/shared/rating-stars";
import { formatDateTime } from "@/lib/format";
import {
  ADMIN_PRODUCT_REVIEW_RATING_OPTIONS,
  ADMIN_PRODUCT_REVIEW_STATUS_OPTIONS,
  getAdminProductReviewSourceLabel,
  getAdminProductReviewStatusLabel,
  type AdminProductReview,
  type AdminProductReviewStatus,
  type AdminProductReviewUpdateInput,
} from "@/lib/admin-reviews";

type ReviewsApiResponse =
  | { ok: true; data: AdminProductReview[] }
  | { ok: false; reason: string };

type ReviewMutationResponse =
  | { ok: true; data: AdminProductReview }
  | { ok: false; reason: string };

type Notice =
  | {
      kind: "error" | "success";
      message: string;
    }
  | null;

type StatusFilter = "all" | AdminProductReviewStatus;
type RatingFilter = "all" | "1" | "2" | "3" | "4" | "5";

function getPageMessage(reason: string | null, hasFilters: boolean) {
  if (!reason) {
    return hasFilters
      ? "No encontramos resenas con esos filtros. Prueba otra combinacion."
      : "Aun no hay resenas registradas en el panel admin.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para consultar resenas reales desde FastAPI.";
  }

  if (reason === "auth_failed") {
    return "Tu sesion de SuperAdmin no es valida o expiro. Vuelve a iniciar sesion.";
  }

  return "No fue posible cargar las resenas por ahora. La vista mantiene un estado vacio amigable mientras la API no este disponible.";
}

function getStatusBadgeClasses(status: AdminProductReviewStatus) {
  switch (status) {
    case "approved":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "rejected":
      return "border-[#ead0c7] bg-[#fff6f2] text-[#8a4d3b]";
    case "pending":
    default:
      return "border-[#e7d3c1] bg-[#fff8f3] text-stone-800";
  }
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState<AdminProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<Notice>(null);

  const [searchValue, setSearchValue] = useState("");
  const [productValue, setProductValue] = useState("");
  const [statusValue, setStatusValue] = useState<StatusFilter>("all");
  const [ratingValue, setRatingValue] = useState<RatingFilter>("all");

  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [drawerNotice, setDrawerNotice] = useState<Notice>(null);
  const [draftStatus, setDraftStatus] = useState<AdminProductReviewStatus>("pending");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const hasFilters =
    searchValue.trim().length > 0 ||
    productValue.trim().length > 0 ||
    statusValue !== "all" ||
    ratingValue !== "all";
  const activeReview = selectedReviewId ? reviews.find((review) => review.id === selectedReviewId) ?? null : null;

  useEffect(() => {
    if (!activeReview) {
      return;
    }

    setDraftStatus(activeReview.status);
    setDraftTitle(activeReview.title ?? "");
    setDraftBody(activeReview.body);
  }, [activeReview]);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams();
        if (searchValue.trim()) {
          params.set("search", searchValue.trim());
        }
        if (productValue.trim()) {
          params.set("product", productValue.trim());
        }
        if (statusValue !== "all") {
          params.set("status", statusValue);
        }
        if (ratingValue !== "all") {
          params.set("rating", ratingValue);
        }

        const requestUrl = params.size > 0 ? `/api/admin/reviews?${params.toString()}` : "/api/admin/reviews";
        const response = await fetch(requestUrl, { cache: "no-store" });
        const payload = (await response.json()) as ReviewsApiResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setReviews([]);
          setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
          return;
        }

        setReviews(payload.data);
        setErrorReason(null);
      } catch {
        if (!cancelled) {
          setReviews([]);
          setErrorReason("fetch_failed");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadReviews();
    return () => {
      cancelled = true;
    };
  }, [productValue, ratingValue, searchValue, statusValue]);

  const reviewCountLabel = useMemo(() => {
    return reviews.length === 1 ? "1 resena" : `${reviews.length} resenas`;
  }, [reviews.length]);

  function mergeUpdatedReview(updatedReview: AdminProductReview) {
    setReviews((current) => current.map((review) => (review.id === updatedReview.id ? updatedReview : review)));
  }

  async function handleSave() {
    if (!activeReview) {
      return;
    }

    const payload: AdminProductReviewUpdateInput = {};
    if (draftStatus !== activeReview.status) {
      payload.status = draftStatus;
    }
    if (draftTitle !== (activeReview.title ?? "")) {
      payload.title = draftTitle.trim().length > 0 ? draftTitle.trim() : null;
    }
    if (draftBody !== activeReview.body) {
      payload.body = draftBody.trim();
    }

    if (Object.keys(payload).length === 0) {
      setDrawerNotice({
        kind: "success",
        message: "No habia cambios por guardar en esta resena.",
      });
      return;
    }

    setIsSaving(true);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/reviews/${activeReview.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ReviewMutationResponse;

      if (!response.ok || !result.ok) {
        setDrawerNotice({
          kind: "error",
          message: "No pudimos guardar la resena por ahora.",
        });
        return;
      }

      mergeUpdatedReview(result.data);
      setDrawerNotice({
        kind: "success",
        message: "Resena actualizada correctamente.",
      });
      setPageNotice({
        kind: "success",
        message: `Se actualizo la resena de ${result.data.customerName}.`,
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos guardar la resena por ahora.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <section className="soft-panel rounded-[1.8rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Resenas</p>
              <h1 className="mt-2 font-serif text-4xl text-stone-900">Moderacion de opiniones</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                Revisa comentarios de clientas, aprueba o rechaza publicaciones y ajusta el contenido antes de mostrarlo en storefront.
              </p>
            </div>
            <div className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
              {isLoading ? "Cargando..." : reviewCountLabel}
            </div>
          </div>

          {pageNotice ? <NoticeBanner className="mt-5" notice={pageNotice} /> : null}

          <div className="mt-6 grid gap-3 xl:grid-cols-[1.2fr_1fr_0.8fr_0.8fr]">
            <FieldFilter
              label="Buscar"
              onChange={setSearchValue}
              placeholder="Clienta, email, titulo o comentario"
              value={searchValue}
            />
            <FieldFilter
              label="Producto"
              onChange={setProductValue}
              placeholder="Nombre, slug o ID"
              value={productValue}
            />
            <SelectFilter
              label="Status"
              onChange={(value) => {
                setStatusValue(value as StatusFilter);
              }}
              options={[
                { value: "all", label: "Todos los status" },
                ...ADMIN_PRODUCT_REVIEW_STATUS_OPTIONS,
              ]}
              value={statusValue}
            />
            <SelectFilter
              label="Rating"
              onChange={(value) => {
                setRatingValue(value as RatingFilter);
              }}
              options={ADMIN_PRODUCT_REVIEW_RATING_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={ratingValue}
            />
          </div>
        </section>

        <section className="soft-panel rounded-[1.8rem] p-4 sm:p-6">
          {isLoading ? (
            <EmptyBlock message="Cargando resenas reales..." />
          ) : reviews.length === 0 ? (
            <EmptyBlock message={getPageMessage(errorReason, hasFilters)} />
          ) : (
            <div className="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-left">
                  <thead className="bg-[#fff8f3] text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    <tr>
                      <th className="px-4 py-4">Producto</th>
                      <th className="px-4 py-4">Clienta</th>
                      <th className="px-4 py-4">Rating</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Source</th>
                      <th className="px-4 py-4">Fecha</th>
                      <th className="px-4 py-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                    {reviews.map((review) => (
                      <tr className="align-top" key={review.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-stone-900">{review.productName}</p>
                          <p className="mt-1 text-xs text-stone-500">/{review.productSlug}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-stone-900">{review.customerName}</p>
                          <p className="mt-1 text-xs text-stone-500">{review.customerEmail ?? "Sin email"}</p>
                        </td>
                        <td className="px-4 py-4">
                          <RatingStars rating={review.rating} />
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(review.status)}`}
                          >
                            {getAdminProductReviewStatusLabel(review.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-stone-600">
                          {getAdminProductReviewSourceLabel(review.source)}
                        </td>
                        <td className="px-4 py-4 text-stone-600">{formatDateTime(review.createdAt)}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500"
                            onClick={() => {
                              setSelectedReviewId(review.id);
                              setDrawerNotice(null);
                            }}
                            type="button"
                          >
                            Ver detalle
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

      {activeReview ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 bg-stone-950/25 backdrop-blur-sm"
          onClick={() => {
            setSelectedReviewId(null);
            setDrawerNotice(null);
          }}
          role="dialog"
        >
          <div className="flex h-full justify-end">
            <aside
              className="h-full w-full max-w-2xl overflow-y-auto border-l border-stone-200 bg-[#fffaf7] p-5 shadow-[0_30px_90px_rgba(28,20,16,0.18)] sm:p-6"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Detalle resena</p>
                  <h2 className="mt-2 font-serif text-3xl text-stone-900">{activeReview.productName}</h2>
                </div>
                <button
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                  onClick={() => {
                    setSelectedReviewId(null);
                    setDrawerNotice(null);
                  }}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-6 space-y-6">
                {drawerNotice ? <NoticeBanner notice={drawerNotice} /> : null}

                <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-stone-900">{activeReview.customerName}</p>
                      <p className="mt-1 text-sm text-stone-600">{activeReview.customerEmail ?? "Sin email"}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-500">
                        {formatDateTime(activeReview.createdAt)}
                      </p>
                    </div>
                    <RatingStars rating={activeReview.rating} />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MetaPill label="Producto" value={activeReview.productName} />
                    <MetaPill label="Slug" value={activeReview.productSlug} />
                    <MetaPill label="Status" value={getAdminProductReviewStatusLabel(activeReview.status)} />
                    <MetaPill label="Source" value={getAdminProductReviewSourceLabel(activeReview.source)} />
                  </div>
                </section>

                <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="rounded-full border border-[#d8e3cf] bg-[#f3faf0] px-4 py-2 text-sm font-semibold text-[#476638] transition hover:border-[#9dbe8e]"
                      onClick={() => {
                        setDraftStatus("approved");
                      }}
                      type="button"
                    >
                      Aprobar
                    </button>
                    <button
                      className="rounded-full border border-[#ead0c7] bg-[#fff6f2] px-4 py-2 text-sm font-semibold text-[#8a4d3b] transition hover:border-[#d9a898]"
                      onClick={() => {
                        setDraftStatus("rejected");
                      }}
                      type="button"
                    >
                      Rechazar
                    </button>
                    <button
                      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-500"
                      onClick={() => {
                        setDraftStatus("pending");
                      }}
                      type="button"
                    >
                      Volver a pendiente
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Status</span>
                      <select
                        className="w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                        onChange={(event) => {
                          setDraftStatus(event.target.value as AdminProductReviewStatus);
                        }}
                        value={draftStatus}
                      >
                        {ADMIN_PRODUCT_REVIEW_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Titulo</span>
                      <input
                        className="w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                        onChange={(event) => {
                          setDraftTitle(event.target.value);
                        }}
                        placeholder="Titulo visible en storefront"
                        value={draftTitle}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Comentario</span>
                      <textarea
                        className="min-h-40 w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition focus:border-stone-500"
                        onChange={(event) => {
                          setDraftBody(event.target.value);
                        }}
                        value={draftBody}
                      />
                    </label>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-stone-500">
                        {activeReview.approvedAt
                          ? `Aprobada el ${formatDateTime(activeReview.approvedAt)}`
                          : "Sin aprobacion registrada todavia"}
                      </p>
                      <button
                        className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSaving}
                        onClick={() => {
                          void handleSave();
                        }}
                        type="button"
                      >
                        {isSaving ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </>
  );
}

function FieldFilter({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">{label}</span>
      <input
        className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function SelectFilter({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">{label}</span>
      <select
        className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-stone-900">{value}</p>
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center">
      <p className="font-serif text-2xl text-stone-900">Sin resultados por ahora</p>
      <p className="mt-3 text-sm leading-7 text-stone-600">{message}</p>
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
      className={`${className} rounded-[1.4rem] border px-4 py-4 text-sm leading-7 ${
        notice.kind === "success"
          ? "border-[#d8e3cf] bg-[#f5faf1] text-[#476638]"
          : "border-[#ead0c7] bg-[#fff6f2] text-[#8a4d3b]"
      }`}
    >
      {notice.message}
    </div>
  );
}
