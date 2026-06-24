"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ADMIN_COUPON_DISCOUNT_TYPE_OPTIONS,
  getAdminCouponDiscountPreview,
  getAdminCouponDiscountTypeLabel,
  type AdminCoupon,
  type AdminCouponDiscountType,
  type AdminCouponUpdateInput,
  type AdminCouponWriteInput,
} from "@/lib/admin-coupons";
import { formatCurrency, formatDateTime } from "@/lib/format";

type CouponsApiResponse =
  | { ok: true; data: AdminCoupon[] }
  | { ok: false; reason: string };

type CouponMutationResponse =
  | { ok: true; data: AdminCoupon }
  | { ok: false; reason: string };

type CouponDeleteResponse =
  | { ok: true; data: { message: string } }
  | { ok: false; reason: string };

type Notice =
  | {
      kind: "error" | "success";
      message: string;
    }
  | null;

type DraftState = {
  code: string;
  name: string;
  description: string;
  discountType: AdminCouponDiscountType;
  discountValue: string;
  minSubtotal: string;
  maxDiscount: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perCustomerLimit: string;
  isActive: boolean;
};

const EMPTY_DRAFT: DraftState = {
  code: "",
  name: "",
  description: "",
  discountType: "percentage",
  discountValue: "10",
  minSubtotal: "",
  maxDiscount: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  perCustomerLimit: "",
  isActive: true,
};

function getPageMessage(reason: string | null) {
  if (!reason) {
    return "Aun no hay cupones creados. Puedes publicar GLOW10 o promociones de envio gratis desde este panel.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para administrar cupones reales desde FastAPI.";
  }

  if (reason === "auth_failed") {
    return "Tu sesion de SuperAdmin no es valida o expiro. Vuelve a iniciar sesion.";
  }

  return "No fue posible cargar cupones por ahora. El panel mantiene un estado vacio amigable mientras la API no este disponible.";
}

function getStatusBadgeClasses(isActive: boolean) {
  return isActive
    ? "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]"
    : "border-stone-200 bg-stone-100 text-stone-600";
}

function formatDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toNumberOrNull(value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function buildDraftFromCoupon(coupon: AdminCoupon): DraftState {
  return {
    code: coupon.code,
    name: coupon.name,
    description: coupon.description ?? "",
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    minSubtotal: coupon.minSubtotal === null ? "" : String(coupon.minSubtotal),
    maxDiscount: coupon.maxDiscount === null ? "" : String(coupon.maxDiscount),
    startsAt: formatDateTimeInput(coupon.startsAt),
    endsAt: formatDateTimeInput(coupon.endsAt),
    usageLimit: coupon.usageLimit === null ? "" : String(coupon.usageLimit),
    perCustomerLimit: coupon.perCustomerLimit === null ? "" : String(coupon.perCustomerLimit),
    isActive: coupon.isActive,
  };
}

function buildPayloadFromDraft(draft: DraftState): AdminCouponWriteInput {
  return {
    code: draft.code.trim().toUpperCase(),
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    discountType: draft.discountType,
    discountValue: draft.discountType === "free_shipping" ? 0 : Number(draft.discountValue || 0),
    minSubtotal: toNumberOrNull(draft.minSubtotal),
    maxDiscount: draft.discountType === "free_shipping" ? null : toNumberOrNull(draft.maxDiscount),
    startsAt: toIsoOrNull(draft.startsAt),
    endsAt: toIsoOrNull(draft.endsAt),
    usageLimit: toNumberOrNull(draft.usageLimit),
    perCustomerLimit: toNumberOrNull(draft.perCustomerLimit),
    isActive: draft.isActive,
  };
}

export function CouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<Notice>(null);

  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("edit");
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [drawerNotice, setDrawerNotice] = useState<Notice>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeCoupon = selectedCouponId
    ? coupons.find((coupon) => coupon.id === selectedCouponId) ?? null
    : null;

  useEffect(() => {
    let cancelled = false;

    async function loadCoupons() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/admin/coupons", { cache: "no-store" });
        const payload = (await response.json()) as CouponsApiResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setCoupons([]);
          setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
          return;
        }

        setCoupons(payload.data);
        setErrorReason(null);
      } catch {
        if (!cancelled) {
          setCoupons([]);
          setErrorReason("fetch_failed");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCoupons();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (drawerMode === "create") {
      setDraft(EMPTY_DRAFT);
      return;
    }

    if (activeCoupon) {
      setDraft(buildDraftFromCoupon(activeCoupon));
    }
  }, [activeCoupon, drawerMode]);

  const couponCountLabel = useMemo(() => {
    return coupons.length === 1 ? "1 cupon" : `${coupons.length} cupones`;
  }, [coupons.length]);

  const activeCount = useMemo(() => coupons.filter((coupon) => coupon.isActive).length, [coupons]);

  function openCreateDrawer() {
    setDrawerMode("create");
    setSelectedCouponId(null);
    setDrawerNotice(null);
    setDraft(EMPTY_DRAFT);
  }

  function openEditDrawer(couponId: number) {
    setDrawerMode("edit");
    setSelectedCouponId(couponId);
    setDrawerNotice(null);
  }

  function closeDrawer() {
    setSelectedCouponId(null);
    setDrawerMode("edit");
    setDrawerNotice(null);
    setIsDeleting(false);
    setIsSaving(false);
  }

  function mergeCoupon(updatedCoupon: AdminCoupon) {
    setCoupons((current) => {
      const existingIndex = current.findIndex((coupon) => coupon.id === updatedCoupon.id);
      if (existingIndex === -1) {
        return [updatedCoupon, ...current];
      }

      return current.map((coupon) => (coupon.id === updatedCoupon.id ? updatedCoupon : coupon));
    });
  }

  async function handleSave() {
    const payload = buildPayloadFromDraft(draft);
    if (!payload.code || !payload.name) {
      setDrawerNotice({
        kind: "error",
        message: "Codigo y nombre son obligatorios.",
      });
      return;
    }
    if (payload.discountType !== "free_shipping" && payload.discountValue <= 0) {
      setDrawerNotice({
        kind: "error",
        message: "El valor del descuento debe ser mayor a cero.",
      });
      return;
    }

    setIsSaving(true);
    setDrawerNotice(null);

    try {
      const requestUrl =
        drawerMode === "create" ? "/api/admin/coupons" : `/api/admin/coupons/${selectedCouponId}`;
      const response = await fetch(requestUrl, {
        method: drawerMode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          drawerMode === "create" ? payload : (payload as AdminCouponUpdateInput),
        ),
      });
      const result = (await response.json()) as CouponMutationResponse;

      if (!response.ok || !result.ok) {
        setDrawerNotice({
          kind: "error",
          message: "No pudimos guardar el cupon por ahora. Revisa el codigo, vigencia y limites.",
        });
        return;
      }

      mergeCoupon(result.data);
      setSelectedCouponId(result.data.id);
      setDrawerMode("edit");
      setDrawerNotice({
        kind: "success",
        message: "Cupon guardado correctamente.",
      });
      setPageNotice({
        kind: "success",
        message: `Se guardo ${result.data.code}.`,
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos guardar el cupon por ahora.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeCoupon) {
      return;
    }

    setIsDeleting(true);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/coupons/${activeCoupon.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as CouponDeleteResponse;

      if (!response.ok || !result.ok) {
        setDrawerNotice({
          kind: "error",
          message: "No pudimos eliminar o desactivar el cupon.",
        });
        return;
      }

      const normalizedMessage = result.data.message.toLowerCase();
      if (normalizedMessage.includes("deactivated")) {
        setCoupons((current) =>
          current.map((coupon) =>
            coupon.id === activeCoupon.id ? { ...coupon, isActive: false } : coupon,
          ),
        );
      } else {
        setCoupons((current) => current.filter((coupon) => coupon.id !== activeCoupon.id));
      }
      setPageNotice({
        kind: "success",
        message: result.data.message,
      });
      closeDrawer();
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos eliminar o desactivar el cupon.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDuplicate(coupon: AdminCoupon) {
    const newCode = window.prompt("Nuevo codigo para duplicar el cupon", `${coupon.code}-COPY`);
    if (!newCode || !newCode.trim()) {
      return;
    }

    setPageNotice(null);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}/duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: newCode.trim().toUpperCase() }),
      });
      const result = (await response.json()) as CouponMutationResponse;

      if (!response.ok || !result.ok) {
        setPageNotice({
          kind: "error",
          message: "No pudimos duplicar el cupon. Revisa que el nuevo codigo no exista.",
        });
        return;
      }

      mergeCoupon(result.data);
      setPageNotice({
        kind: "success",
        message: `Se duplico ${coupon.code} como ${result.data.code}.`,
      });
    } catch {
      setPageNotice({
        kind: "error",
        message: "No pudimos duplicar el cupon por ahora.",
      });
    }
  }

  return (
    <>
      <div className="space-y-6">
        <section className="soft-panel rounded-[1.8rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Cupones</p>
              <h1 className="mt-2 font-serif text-4xl text-stone-900">Promociones y descuentos</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                Crea cupones reales para checkout, controla limites de uso y activa promociones de porcentaje, monto fijo o envio gratis desde un solo panel.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
                {isLoading ? "Cargando..." : couponCountLabel}
              </div>
              <div className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
                {activeCount} activos
              </div>
              <button
                className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white"
                onClick={openCreateDrawer}
                type="button"
              >
                Nuevo cupon
              </button>
            </div>
          </div>

          {pageNotice ? <NoticeBanner className="mt-5" notice={pageNotice} /> : null}
        </section>

        <section className="soft-panel rounded-[1.8rem] p-4 sm:p-6">
          {isLoading ? (
            <EmptyBlock message="Cargando cupones reales..." />
          ) : coupons.length === 0 ? (
            <EmptyBlock message={getPageMessage(errorReason)} />
          ) : (
            <div className="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-left">
                  <thead className="bg-[#fff8f3] text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    <tr>
                      <th className="px-4 py-4">Codigo</th>
                      <th className="px-4 py-4">Promocion</th>
                      <th className="px-4 py-4">Restricciones</th>
                      <th className="px-4 py-4">Uso</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Vigencia</th>
                      <th className="px-4 py-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                    {coupons.map((coupon) => (
                      <tr className="align-top" key={coupon.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold uppercase tracking-[0.2em] text-stone-900">{coupon.code}</p>
                          <p className="mt-1 text-xs text-stone-500">{coupon.name}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-stone-900">
                            {getAdminCouponDiscountTypeLabel(coupon.discountType)}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {getAdminCouponDiscountPreview(coupon)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-xs leading-6 text-stone-600">
                          <p>
                            Minimo:{" "}
                            {coupon.minSubtotal === null ? "Sin minimo" : formatCurrency(coupon.minSubtotal)}
                          </p>
                          <p>
                            Maximo descuento:{" "}
                            {coupon.maxDiscount === null ? "Sin tope" : formatCurrency(coupon.maxDiscount)}
                          </p>
                          <p>
                            Limite por clienta: {coupon.perCustomerLimit === null ? "Sin limite" : coupon.perCustomerLimit}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-stone-900">
                            {coupon.usageCount} / {coupon.usageLimit ?? "Ilimitado"}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {coupon.usageLimit === null ? "Sin limite total" : "uso total permitido"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(coupon.isActive)}`}
                          >
                            {coupon.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs leading-6 text-stone-600">
                          <p>{coupon.startsAt ? formatDateTime(coupon.startsAt) : "Sin inicio"}</p>
                          <p>{coupon.endsAt ? formatDateTime(coupon.endsAt) : "Sin fin"}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
                              onClick={() => {
                                void handleDuplicate(coupon);
                              }}
                              type="button"
                            >
                              Duplicar
                            </button>
                            <button
                              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
                              onClick={() => openEditDrawer(coupon.id)}
                              type="button"
                            >
                              Editar
                            </button>
                          </div>
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

      {(drawerMode === "create" || activeCoupon) ? (
        <div className="fixed inset-0 z-50 bg-stone-950/20 backdrop-blur-sm">
          <div className="ml-auto h-full w-full max-w-2xl overflow-y-auto bg-[#fffaf6] px-5 py-6 shadow-2xl sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                  {drawerMode === "create" ? "Nuevo cupon" : "Detalle"}
                </p>
                <h2 className="mt-2 font-serif text-3xl text-stone-900">
                  {drawerMode === "create" ? "Crear promocion" : activeCoupon?.code ?? "Editar cupon"}
                </h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  Define el descuento, vigencia y restricciones reales que el backend validara durante checkout.
                </p>
              </div>
              <button
                className="rounded-full border border-stone-300 px-3 py-2 text-sm text-stone-700"
                onClick={closeDrawer}
                type="button"
              >
                Cerrar
              </button>
            </div>

            {drawerNotice ? <NoticeBanner className="mt-5" notice={drawerNotice} /> : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Codigo"
                onChange={(value) => setDraft((current) => ({ ...current, code: value.toUpperCase() }))}
                placeholder="GLOW10"
                value={draft.code}
              />
              <Field
                label="Nombre"
                onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
                placeholder="Glow 10"
                value={draft.name}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Descripcion"
                  onChange={(value) => setDraft((current) => ({ ...current, description: value }))}
                  placeholder="Promocion para mejorar conversion"
                  value={draft.description}
                />
              </div>
              <SelectField
                label="Tipo de descuento"
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    discountType: value as AdminCouponDiscountType,
                    maxDiscount: value === "free_shipping" ? "" : current.maxDiscount,
                    discountValue: value === "free_shipping" ? "0" : current.discountValue,
                  }))
                }
                options={ADMIN_COUPON_DISCOUNT_TYPE_OPTIONS}
                value={draft.discountType}
              />
              <Field
                label={draft.discountType === "percentage" ? "Valor (%)" : "Valor descuento"}
                onChange={(value) => setDraft((current) => ({ ...current, discountValue: value }))}
                placeholder={draft.discountType === "percentage" ? "10" : "200"}
                type="number"
                value={draft.discountValue}
              />
              <Field
                label="Subtotal minimo"
                onChange={(value) => setDraft((current) => ({ ...current, minSubtotal: value }))}
                placeholder="999"
                type="number"
                value={draft.minSubtotal}
              />
              <Field
                disabled={draft.discountType === "free_shipping"}
                label="Maximo descuento"
                onChange={(value) => setDraft((current) => ({ ...current, maxDiscount: value }))}
                placeholder="500"
                type="number"
                value={draft.maxDiscount}
              />
              <Field
                label="Inicio"
                onChange={(value) => setDraft((current) => ({ ...current, startsAt: value }))}
                type="datetime-local"
                value={draft.startsAt}
              />
              <Field
                label="Fin"
                onChange={(value) => setDraft((current) => ({ ...current, endsAt: value }))}
                type="datetime-local"
                value={draft.endsAt}
              />
              <Field
                label="Limite total de usos"
                onChange={(value) => setDraft((current) => ({ ...current, usageLimit: value }))}
                placeholder="100"
                type="number"
                value={draft.usageLimit}
              />
              <Field
                label="Limite por clienta"
                onChange={(value) => setDraft((current) => ({ ...current, perCustomerLimit: value }))}
                placeholder="1"
                type="number"
                value={draft.perCustomerLimit}
              />
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-[1.2rem] border border-stone-200 bg-white px-4 py-4 text-sm text-stone-700">
              <input
                checked={draft.isActive}
                onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
                type="checkbox"
              />
              Cupon activo y disponible en checkout
            </label>

            <div className="mt-6 rounded-[1.4rem] border border-stone-200 bg-white px-4 py-4 text-sm text-stone-700">
              <p className="font-semibold text-stone-900">Preview</p>
              <p className="mt-2 text-stone-600">
                {draft.code || "CODIGO"}:{" "}
                {getAdminCouponDiscountPreview({
                  discountType: draft.discountType,
                  discountValue: Number(draft.discountValue || 0),
                } as Pick<AdminCoupon, "discountType" | "discountValue">)}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white disabled:bg-stone-300"
                disabled={isSaving}
                onClick={() => {
                  void handleSave();
                }}
                type="button"
              >
                {isSaving ? "Guardando..." : drawerMode === "create" ? "Crear cupon" : "Guardar cambios"}
              </button>
              {drawerMode === "edit" && activeCoupon ? (
                <button
                  className="rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700"
                  onClick={() => {
                    void handleDuplicate(activeCoupon);
                  }}
                  type="button"
                >
                  Duplicar
                </button>
              ) : null}
              {drawerMode === "edit" && activeCoupon ? (
                <button
                  className="rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 disabled:opacity-60"
                  disabled={isDeleting}
                  onClick={() => {
                    void handleDelete();
                  }}
                  type="button"
                >
                  {isDeleting ? "Procesando..." : "Eliminar o desactivar"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "datetime-local";
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-900">{label}</span>
      <input
        className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 disabled:bg-stone-100"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={type === "number" ? "0.01" : undefined}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-900">{label}</span>
      <select
        className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
        onChange={(event) => onChange(event.target.value)}
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

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-stone-300 bg-[#fffaf6] px-6 py-12 text-center text-sm leading-7 text-stone-600">
      {message}
    </div>
  );
}

function NoticeBanner({
  notice,
  className = "",
}: {
  notice: Exclude<Notice, null>;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.2rem] border px-4 py-4 text-sm ${
        notice.kind === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]"
      } ${className}`}
    >
      {notice.message}
    </div>
  );
}
