"use client";

import { useEffect, useMemo, useState } from "react";

import { ArrowUpRightIcon, SearchIcon, WhatsAppIcon } from "@/components/shared/icons";
import {
  ADMIN_ORDER_STATUS_OPTIONS,
  ADMIN_PAYMENT_PROVIDER_OPTIONS,
  ADMIN_PAYMENT_STATUS_OPTIONS,
  buildAdminOrderMailtoHref,
  buildAdminOrderWhatsAppHref,
  getAdminOrderStatusLabel,
  getAdminPaymentProviderLabel,
  getAdminPaymentStatusLabel,
  type AdminOrderDetail,
  type AdminOrderStatus,
  type AdminOrderSummary,
  type AdminOrderUpdateInput,
  type AdminPaymentProvider,
  type AdminPaymentStatus,
} from "@/lib/admin-orders";
import { formatCurrency, formatDateTime } from "@/lib/format";

type OrdersApiResponse =
  | { ok: true; data: AdminOrderSummary[] }
  | { ok: false; reason: string };

type OrderDetailApiResponse =
  | { ok: true; data: AdminOrderDetail }
  | { ok: false; reason: string };

type Notice = {
  kind: "error" | "success";
  message: string;
} | null;

type StatusFilter = "all" | AdminOrderStatus;
type PaymentStatusFilter = "all" | AdminPaymentStatus;
type PaymentProviderFilter = "all" | AdminPaymentProvider | string;

function getPageMessage(reason: string | null, hasFilters: boolean) {
  if (!reason) {
    return hasFilters
      ? "No encontramos pedidos con esos filtros. Prueba otra combinacion o limpia la busqueda."
      : "Aun no hay ordenes sincronizadas desde checkout en el panel admin.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para consultar ordenes reales desde FastAPI.";
  }

  if (reason === "auth_failed") {
    return "Tu sesion de SuperAdmin no es valida o expiro. Vuelve a iniciar sesion.";
  }

  return "No fue posible cargar las ordenes por ahora. El panel mantiene un estado vacio amigable mientras la API no este disponible.";
}

function getOrderStatusBadgeClasses(status: string) {
  switch (status) {
    case "paid":
      return "border-[#cfe0df] bg-[#eef8f7] text-[#2c6160]";
    case "preparing":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "shipped":
      return "border-[#d7d8ef] bg-[#f4f5ff] text-[#4f5cb8]";
    case "delivered":
      return "border-[#d8e3cf] bg-[#f1f8ed] text-[#49673a]";
    case "refunded":
    case "canceled":
      return "border-stone-200 bg-stone-100 text-stone-600";
    case "pending":
    default:
      return "border-[#e7d3c1] bg-[#fff8f3] text-stone-800";
  }
}

function getPaymentStatusBadgeClasses(status: string) {
  switch (status) {
    case "paid":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "requires_action":
      return "border-[#ecd9b7] bg-[#fff8e8] text-[#8a632f]";
    case "failed":
    case "refunded":
      return "border-[#ead0c7] bg-[#fff6f2] text-[#8a4d3b]";
    case "pending":
    default:
      return "border-stone-200 bg-stone-100 text-stone-700";
  }
}

function isSameCalendarDay(value: string, baseDate: Date) {
  const date = new Date(value);
  return (
    date.getFullYear() === baseDate.getFullYear() &&
    date.getMonth() === baseDate.getMonth() &&
    date.getDate() === baseDate.getDate()
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<Notice>(null);

  const [searchValue, setSearchValue] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<StatusFilter>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>("all");
  const [paymentProviderFilter, setPaymentProviderFilter] = useState<PaymentProviderFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, AdminOrderDetail>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [drawerNotice, setDrawerNotice] = useState<Notice>(null);

  const [draftStatus, setDraftStatus] = useState<AdminOrderStatus>("pending");
  const [draftTrackingNumber, setDraftTrackingNumber] = useState("");
  const [draftShippingCarrier, setDraftShippingCarrier] = useState("");
  const [draftInternalNotes, setDraftInternalNotes] = useState("");
  const [draftManualOverride, setDraftManualOverride] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasFilters =
    searchValue.trim().length > 0 ||
    orderStatusFilter !== "all" ||
    paymentStatusFilter !== "all" ||
    paymentProviderFilter !== "all" ||
    dateFrom.length > 0 ||
    dateTo.length > 0;
  const activeOrder = selectedOrderId ? detailCache[selectedOrderId] : null;

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchValue.trim()) {
          params.set("search", searchValue.trim());
        }
        if (orderStatusFilter !== "all") {
          params.set("order_status", orderStatusFilter);
        }
        if (paymentStatusFilter !== "all") {
          params.set("payment_status", paymentStatusFilter);
        }
        if (paymentProviderFilter !== "all") {
          params.set("payment_provider", paymentProviderFilter);
        }
        if (dateFrom) {
          params.set("date_from", dateFrom);
        }
        if (dateTo) {
          params.set("date_to", dateTo);
        }

        const requestUrl = params.size > 0 ? `/api/admin/orders?${params.toString()}` : "/api/admin/orders";
        const response = await fetch(requestUrl, { cache: "no-store" });
        const payload = (await response.json()) as OrdersApiResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setOrders([]);
          setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
          return;
        }

        setOrders(payload.data);
        setErrorReason(null);
      } catch {
        if (!cancelled) {
          setOrders([]);
          setErrorReason("fetch_failed");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, orderStatusFilter, paymentProviderFilter, paymentStatusFilter, searchValue]);

  useEffect(() => {
    if (!activeOrder) {
      return;
    }
    setDraftStatus(activeOrder.status);
    setDraftTrackingNumber(activeOrder.trackingNumber ?? "");
    setDraftShippingCarrier(activeOrder.shippingCarrier ?? "");
    setDraftInternalNotes(activeOrder.internalNotes ?? "");
    setDraftManualOverride(false);
  }, [activeOrder]);

  const kpis = useMemo(() => {
    const today = new Date();
    return {
      ordersToday: orders.filter((order) => isSameCalendarDay(order.createdAt, today)).length,
      paid: orders.filter((order) => order.paymentStatus === "paid").length,
      pendingPayment: orders.filter((order) =>
        order.paymentStatus === "pending" || order.paymentStatus === "requires_action",
      ).length,
      preparing: orders.filter((order) => order.status === "preparing").length,
    };
  }, [orders]);

  async function loadOrderDetail(orderId: number, force = false) {
    if (!force && detailCache[orderId]) {
      return;
    }

    setIsDetailLoading(true);
    setDetailError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { cache: "no-store" });
      const payload = (await response.json()) as OrderDetailApiResponse;

      if (!response.ok || !payload.ok) {
        setDetailError(payload.ok ? "fetch_failed" : payload.reason);
        return;
      }

      setDetailCache((current) => ({
        ...current,
        [orderId]: payload.data,
      }));
    } catch {
      setDetailError("fetch_failed");
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleOpenDetail(orderId: number) {
    setSelectedOrderId(orderId);
    setDrawerNotice(null);
    await loadOrderDetail(orderId);
  }

  function mergeUpdatedOrder(updatedOrder: AdminOrderDetail) {
    setDetailCache((current) => ({
      ...current,
      [updatedOrder.id]: updatedOrder,
    }));
    setOrders((current) =>
      current.map((order) =>
        order.id === updatedOrder.id
          ? {
              ...order,
              customerEmail: updatedOrder.customer.email,
              customerName: updatedOrder.customer.name,
              customerPhone: updatedOrder.customer.phone,
              paidAt: updatedOrder.timestamps.paidAt,
              paymentProvider: updatedOrder.paymentProvider,
              paymentStatus: updatedOrder.paymentStatus,
              status: updatedOrder.status,
              total: updatedOrder.total,
            }
          : order,
      ),
    );
  }

  async function handleSaveOrder() {
    if (!activeOrder) {
      return;
    }

    const payload: AdminOrderUpdateInput = {};
    if (draftStatus !== activeOrder.status) {
      payload.status = draftStatus;
    }
    if (draftTrackingNumber !== (activeOrder.trackingNumber ?? "")) {
      payload.trackingNumber = draftTrackingNumber.trim() || null;
    }
    if (draftShippingCarrier !== (activeOrder.shippingCarrier ?? "")) {
      payload.shippingCarrier = draftShippingCarrier.trim() || null;
    }
    if (draftInternalNotes !== (activeOrder.internalNotes ?? "")) {
      payload.internalNotes = draftInternalNotes.trim() || null;
    }
    if (draftManualOverride) {
      payload.explicitManualOverride = true;
    }

    if (Object.keys(payload).length === 0) {
      setDrawerNotice({
        kind: "success",
        message: "No habia cambios por guardar en esta orden.",
      });
      return;
    }

    setIsSaving(true);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/orders/${activeOrder.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as OrderDetailApiResponse;

      if (!response.ok || !result.ok) {
        setDrawerNotice({
          kind: "error",
          message:
            "No pudimos guardar los cambios del pedido. Si intentas marcarlo como pagado, confirma primero el estado del pago o usa override manual.",
        });
        return;
      }

      mergeUpdatedOrder(result.data);
      setDraftManualOverride(false);
      setDrawerNotice({
        kind: "success",
        message: "Pedido actualizado correctamente.",
      });
      setPageNotice({
        kind: "success",
        message: `Se actualizo la orden ${result.data.orderNumber}.`,
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos guardar la orden por ahora. Reintenta cuando la API este disponible.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="admin-workspace admin-orders space-y-5">
        <section className="admin-panel px-4 py-5 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-label">Pedidos</p>
              <h1 className="mt-2 font-serif text-3xl text-stone-900 sm:text-[2.4rem]">Operacion de ordenes</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                Consulta ordenes reales creadas desde checkout, revisa el estado de pago y gestiona preparacion, envio y seguimiento comercial desde un solo lugar.
              </p>
            </div>
            <button
              className="btn-secondary px-4 py-2.5"
              onClick={() => {
                setSearchValue("");
                setOrderStatusFilter("all");
                setPaymentStatusFilter("all");
                setPaymentProviderFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
              type="button"
            >
              Limpiar filtros
            </button>
          </div>

          {pageNotice ? <NoticeBanner className="mt-5" notice={pageNotice} /> : null}

          <div className="mt-5 grid gap-2 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
            <label className="flex items-center gap-3 rounded-[1rem] border border-stone-200 bg-white px-4 py-2.5">
              <SearchIcon className="h-4 w-4 text-stone-500" />
              <input
                className="w-full border-none bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
                onChange={(event) => {
                  setSearchValue(event.target.value);
                }}
                placeholder="Buscar por orden, cliente, email o referencia"
                value={searchValue}
              />
            </label>

            <FilterSelect
              label="Estado orden"
              onChange={(value) => {
                setOrderStatusFilter(value as StatusFilter);
              }}
              options={[
                { value: "all", label: "Todos" },
                ...ADMIN_ORDER_STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
              value={orderStatusFilter}
            />
            <FilterSelect
              label="Estado pago"
              onChange={(value) => {
                setPaymentStatusFilter(value as PaymentStatusFilter);
              }}
              options={[
                { value: "all", label: "Todos" },
                ...ADMIN_PAYMENT_STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
              value={paymentStatusFilter}
            />
            <FilterSelect
              label="Proveedor"
              onChange={(value) => {
                setPaymentProviderFilter(value as PaymentProviderFilter);
              }}
              options={ADMIN_PAYMENT_PROVIDER_OPTIONS}
              value={paymentProviderFilter}
            />
            <DateRangeInputs
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Ordenes hoy" value={String(kpis.ordersToday)} />
          <KpiCard label="Pendientes de pago" value={String(kpis.pendingPayment)} />
          <KpiCard label="Pagadas" value={String(kpis.paid)} />
          <KpiCard label="Por preparar" value={String(kpis.preparing)} />
        </section>

        <section className="admin-panel px-4 py-5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">Listado</p>
              <h2 className="mt-2 font-serif text-2xl text-stone-900 sm:text-[2rem]">Pedidos recientes</h2>
            </div>
            <p className="text-sm text-stone-500">
              {isLoading ? "Cargando..." : `${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"}`}
            </p>
          </div>

          {isLoading ? (
            <div className="mt-5 rounded-[1.2rem] border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-500">
              Cargando ordenes reales desde la API...
            </div>
          ) : orders.length === 0 ? (
            <EmptyBlock className="mt-6" message={getPageMessage(errorReason, hasFilters)} />
          ) : (
            <div className="admin-table-shell mt-5">
              <div className="max-h-[62vh] overflow-auto">
                <table className="min-w-full divide-y divide-stone-200">
                  <thead className="bg-[#faf5ef]">
                    <tr className="text-left text-xs font-semibold tracking-[0.1em] text-stone-500">
                      <th className="px-4 py-3">Orden</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Pago</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {orders.map((order) => (
                      <tr className="align-top text-sm text-stone-700" key={order.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-900">{order.orderNumber}</p>
                          <p className="mt-1 text-xs text-stone-500">#{order.id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-stone-900">{order.customerName}</p>
                          <p className="mt-1 text-xs text-stone-500">{order.customerEmail ?? "Sin email"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentStatusBadgeClasses(order.paymentStatus)}`}
                          >
                            {getAdminPaymentStatusLabel(order.paymentStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {getAdminPaymentProviderLabel(order.paymentProvider)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusBadgeClasses(order.status)}`}
                          >
                            {getAdminOrderStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-stone-900">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500"
                            onClick={() => {
                              void handleOpenDetail(order.id);
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

      {selectedOrderId ? (
        <div className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-[2px]">
          <div className="absolute inset-y-0 right-0 flex w-full justify-end">
            <button
              aria-label="Cerrar detalle"
              className="hidden flex-1 cursor-default lg:block"
              onClick={() => {
                setSelectedOrderId(null);
                setDrawerNotice(null);
              }}
              type="button"
            />
            <aside className="flex h-full w-full max-w-[980px] flex-col overflow-y-auto border-l border-stone-200 bg-[#fcfaf8] px-4 py-4 shadow-2xl sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Detalle pedido</p>
                  <h2 className="mt-2 font-serif text-2xl text-stone-900 sm:text-[2rem]">
                    {activeOrder?.orderNumber ?? `Pedido #${selectedOrderId}`}
                  </h2>
                </div>
                <button
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-500"
                  onClick={() => {
                    setSelectedOrderId(null);
                    setDrawerNotice(null);
                  }}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              {drawerNotice ? <NoticeBanner className="mt-5" notice={drawerNotice} /> : null}

              {isDetailLoading && !activeOrder ? (
                <EmptyBlock className="mt-6" message="Cargando detalle del pedido..." />
              ) : detailError && !activeOrder ? (
                <EmptyBlock
                  className="mt-6"
                  message="No pudimos cargar el detalle del pedido. Revisa que la API local este disponible."
                />
              ) : activeOrder ? (
                <div className="mt-5 space-y-4 pb-8">
                  <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetaPill label="Cliente" value={activeOrder.customer.name} />
                      <MetaPill label="Pago" value={getAdminPaymentStatusLabel(activeOrder.paymentStatus)} />
                      <MetaPill label="Proveedor" value={getAdminPaymentProviderLabel(activeOrder.paymentProvider)} />
                      <MetaPill label="Total" value={formatCurrency(activeOrder.total)} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {activeOrder.customer.phone ? (
                        <a
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cfe0df] bg-[#eef8f7] px-5 py-3 text-sm font-semibold text-[#2c6160] transition hover:border-[#98b8b6]"
                          href={buildAdminOrderWhatsAppHref(
                            activeOrder.customer.phone,
                            activeOrder.customer.name,
                            activeOrder.orderNumber,
                          )}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                          Abrir WhatsApp
                        </a>
                      ) : null}
                      {activeOrder.customer.email ? (
                        <a
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500"
                          href={buildAdminOrderMailtoHref(activeOrder.customer.email, activeOrder.orderNumber)}
                        >
                          <ArrowUpRightIcon className="h-4 w-4" />
                          Email cliente
                        </a>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Gestion</p>
                    <h3 className="mt-2 font-serif text-[1.6rem] text-stone-900">Estado y seguimiento</h3>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Estado de orden
                        </span>
                        <select
                          className="w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                          onChange={(event) => {
                            setDraftStatus(event.target.value as AdminOrderStatus);
                          }}
                          value={draftStatus}
                        >
                          {ADMIN_ORDER_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Tracking
                        </span>
                        <input
                          className="w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                          onChange={(event) => {
                            setDraftTrackingNumber(event.target.value);
                          }}
                          placeholder="Ejemplo: 1Z-12345"
                          value={draftTrackingNumber}
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Paqueteria
                        </span>
                        <input
                          className="w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                          onChange={(event) => {
                            setDraftShippingCarrier(event.target.value);
                          }}
                          placeholder="Ejemplo: DHL"
                          value={draftShippingCarrier}
                        />
                      </label>

                      <div className="rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Pago actual
                        </p>
                        <p className="mt-2 text-sm font-medium text-stone-900">
                          {getAdminPaymentStatusLabel(activeOrder.paymentStatus)}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {getAdminPaymentProviderLabel(activeOrder.paymentProvider)}
                          {activeOrder.rawProviderReference ? ` · ${activeOrder.rawProviderReference}` : ""}
                        </p>
                      </div>
                    </div>

                    {draftStatus === "paid" && activeOrder.paymentStatus !== "paid" ? (
                      <label className="mt-4 flex items-start gap-3 rounded-[1.2rem] border border-[#ead0c7] bg-[#fff6f2] px-4 py-4 text-sm text-[#8a4d3b]">
                        <input
                          checked={draftManualOverride}
                          className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                          onChange={(event) => {
                            setDraftManualOverride(event.target.checked);
                          }}
                          type="checkbox"
                        />
                        <span>
                          El pago aun no esta confirmado como pagado. Activa override manual solo si necesitas cerrar la operacion manualmente.
                        </span>
                      </label>
                    ) : null}

                    <div className="mt-4 grid gap-3">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Notas internas
                        </span>
                        <textarea
                          className="min-h-28 w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition focus:border-stone-500"
                          maxLength={2000}
                          onChange={(event) => {
                            setDraftInternalNotes(event.target.value);
                          }}
                          placeholder="Notas de seguimiento, observaciones de envio o acuerdos comerciales."
                          value={draftInternalNotes}
                        />
                      </label>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-stone-500">{draftInternalNotes.length}/2000 caracteres</p>
                        <button
                          className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isSaving}
                          onClick={() => {
                            void handleSaveOrder();
                          }}
                          type="button"
                        >
                          {isSaving ? "Guardando..." : "Guardar cambios"}
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Cliente</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <MetaPill label="Email" value={activeOrder.customer.email ?? "Sin email"} />
                      <MetaPill label="Telefono" value={activeOrder.customer.phone ?? "Sin telefono"} />
                      <MetaPill label="Direccion" value={activeOrder.shippingAddress.fullAddress} />
                      <MetaPill
                        label="Contacto CRM"
                        value={activeOrder.crmContact ? activeOrder.crmContact.name : "Sin contacto vinculado"}
                      />
                    </div>
                  </section>

                  <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Productos</p>
                    <div className="mt-4 space-y-3">
                      {activeOrder.items.map((item) => (
                        <article className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4" key={`${item.productId}-${item.productName}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-stone-900">{item.productName}</p>
                              <p className="mt-1 text-xs text-stone-500">Producto #{item.productId}</p>
                            </div>
                            <div className="text-sm text-stone-600">
                              <p>Cantidad: {item.quantity}</p>
                              <p>{formatCurrency(item.unitPrice)} c/u</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <MetaPill label="Subtotal" value={formatCurrency(activeOrder.subtotal)} />
                      <MetaPill label="Descuento" value={formatCurrency(activeOrder.discountTotal)} />
                      <MetaPill label="Envio" value={formatCurrency(activeOrder.shippingTotal)} />
                    </div>
                  </section>

                  <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Pago y trazabilidad</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <MetaPill label="Referencia proveedor" value={activeOrder.rawProviderReference ?? "Sin referencia"} />
                      <MetaPill
                        label="Pagado en"
                        value={activeOrder.timestamps.paidAt ? formatDateTime(activeOrder.timestamps.paidAt) : "Aun no"}
                      />
                      <MetaPill
                        label="Enviado en"
                        value={activeOrder.timestamps.shippedAt ? formatDateTime(activeOrder.timestamps.shippedAt) : "Aun no"}
                      />
                      <MetaPill
                        label="Ultima actualizacion"
                        value={
                          activeOrder.timestamps.updatedAt
                            ? formatDateTime(activeOrder.timestamps.updatedAt)
                            : formatDateTime(activeOrder.timestamps.createdAt)
                        }
                      />
                    </div>

                    {activeOrder.payment.rawPayloadJson ? (
                      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-[1.2rem] bg-[#fffaf7] px-4 py-4 text-xs leading-6 text-stone-600">
                        {JSON.stringify(activeOrder.payment.rawPayloadJson, null, 2)}
                      </pre>
                    ) : null}
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

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-panel px-4 py-4">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">{label}</p>
      <p className="mt-2 font-serif text-[2rem] leading-none text-stone-900">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold tracking-[0.08em] text-stone-500">{label}</span>
      <select
        className="w-full rounded-[1rem] border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-500"
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

function DateRangeInputs({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Desde</span>
        <input
          className="w-full rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-500"
          onChange={(event) => {
            onDateFromChange(event.target.value);
          }}
          type="date"
          value={dateFrom}
        />
      </label>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Hasta</span>
        <input
          className="w-full rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-500"
          onChange={(event) => {
            onDateToChange(event.target.value);
          }}
          type="date"
          value={dateTo}
        />
      </label>
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] bg-[#fff8f3] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-stone-900">{value}</p>
    </div>
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
    <div className={`${className} rounded-[1.2rem] border border-dashed border-stone-300 bg-white px-4 py-6 text-sm leading-6 text-stone-500`}>
      {message}
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

