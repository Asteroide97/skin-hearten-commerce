"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";

import { ArrowUpRightIcon, SearchIcon, WhatsAppIcon } from "@/components/shared/icons";
import type {
  CustomerOrderDetail,
  CustomerOrderLookupInput,
  CustomerOrderStatus,
  CustomerOrderSummary,
} from "@/lib/customer-orders";
import {
  buildCustomerOrderSupportWhatsAppHref,
  getCustomerOrderStatusLabel,
  getCustomerPaymentProviderLabel,
  getCustomerPaymentStatusLabel,
} from "@/lib/customer-orders";
import { formatCurrency, formatDateTime, formatLongDate } from "@/lib/format";

type OrdersLookupResponse =
  | { ok: true; data: CustomerOrderSummary[] }
  | { ok: false; reason: string; message?: string };

type OrderDetailResponse =
  | { ok: true; data: CustomerOrderDetail }
  | { ok: false; reason: string; message?: string };

type LookupFormValues = {
  email: string;
  phone: string;
};

type Notice =
  | {
      kind: "error" | "success";
      message: string;
    }
  | null;

const lookupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .max(255, "El email es demasiado largo.")
      .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
        message: "Ingresa un email valido.",
      }),
    phone: z.string().trim().max(30, "El telefono es demasiado largo."),
  })
  .superRefine((values, context) => {
    if (values.email.length === 0 && values.phone.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa al menos tu email o tu telefono.",
        path: ["email"],
      });
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa al menos tu email o tu telefono.",
        path: ["phone"],
      });
    }
  });

function normalizeLookupPayload(values: LookupFormValues): CustomerOrderLookupInput {
  const email = values.email.trim();
  const phone = values.phone.trim();
  return {
    email: email.length > 0 ? email : undefined,
    phone: phone.length > 0 ? phone : undefined,
  };
}

function getLookupMessage(reason: string | null, hasSubmitted: boolean) {
  if (!hasSubmitted) {
    return "Usa el email o telefono con el que hiciste tu compra para consultar pedidos reales sin iniciar sesion.";
  }

  if (reason === "api_url_missing") {
    return "La consulta de pedidos todavia no esta conectada a la API en este entorno.";
  }

  return "No encontramos pedidos con esos datos. Verifica el email o telefono usado en checkout.";
}

function getOrderStatusBadgeClasses(status: CustomerOrderStatus) {
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
    case "mock_paid":
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

export function CustomerOrdersLookup() {
  const form = useForm<LookupFormValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      email: "",
      phone: "",
    },
  });

  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [submittedLookup, setSubmittedLookup] = useState<CustomerOrderLookupInput | null>(null);
  const [lookupNotice, setLookupNotice] = useState<Notice>(null);
  const [lookupErrorReason, setLookupErrorReason] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, CustomerOrderDetail>>({});
  const [detailNotice, setDetailNotice] = useState<Notice>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const activeOrder = activeOrderId ? detailCache[activeOrderId] : null;
  const hasSubmitted = submittedLookup !== null;

  const resultsLabel = useMemo(() => {
    if (orders.length === 1) {
      return "1 pedido encontrado";
    }
    return `${orders.length} pedidos encontrados`;
  }, [orders.length]);

  async function handleLookup(values: LookupFormValues) {
    const payload = normalizeLookupPayload(values);

    setIsLookupLoading(true);
    setLookupNotice(null);
    setLookupErrorReason(null);
    setActiveOrderId(null);
    setDetailCache({});
    setDetailNotice(null);

    try {
      const response = await fetch("/api/customer/orders/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as OrdersLookupResponse;

      setSubmittedLookup(payload);

      if (!response.ok || !result.ok) {
        setOrders([]);
        setLookupErrorReason(result.ok ? "fetch_failed" : result.reason);
        setLookupNotice({
          kind: "error",
          message:
            result.ok || !result.message
              ? "No pudimos consultar tus pedidos por ahora."
              : result.message,
        });
        return;
      }

      setOrders(result.data);
      if (result.data.length === 0) {
        setLookupErrorReason("empty");
        return;
      }

      setLookupNotice({
        kind: "success",
        message: `Encontramos ${result.data.length} ${
          result.data.length === 1 ? "pedido" : "pedidos"
        } asociados a tus datos.`,
      });
    } catch {
      setOrders([]);
      setSubmittedLookup(payload);
      setLookupErrorReason("fetch_failed");
      setLookupNotice({
        kind: "error",
        message: "No pudimos conectar con el historial de pedidos.",
      });
    } finally {
      setIsLookupLoading(false);
    }
  }

  async function handleOpenDetail(orderId: number) {
    if (!submittedLookup) {
      return;
    }

    setActiveOrderId(orderId);
    setDetailNotice(null);

    if (detailCache[orderId]) {
      return;
    }

    setIsDetailLoading(true);

    try {
      const response = await fetch(`/api/customer/orders/${orderId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submittedLookup),
      });
      const result = (await response.json()) as OrderDetailResponse;

      if (!response.ok || !result.ok) {
        setDetailNotice({
          kind: "error",
          message:
            result.ok || !result.message
              ? "No pudimos validar ese pedido con los datos proporcionados."
              : result.message,
        });
        return;
      }

      setDetailCache((current) => ({
        ...current,
        [orderId]: result.data,
      }));
    } catch {
      setDetailNotice({
        kind: "error",
        message: "No pudimos cargar el detalle del pedido por ahora.",
      });
    } finally {
      setIsDetailLoading(false);
    }
  }

  return (
    <section className="soft-panel rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-stone-500">Consulta tus pedidos</p>
          <h2 className="mt-2 font-serif text-3xl text-stone-900 sm:text-4xl">
            Revisa tu historial real sin iniciar sesion
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
            Usa el email o telefono con el que compraste para ver estado de pago, envio, tracking y detalle de tus productos.
          </p>
        </div>
        <a
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cfe0df] bg-[#eef8f7] px-5 py-3 text-sm font-semibold text-[#2c6160] transition hover:border-[#98b8b6]"
          href={buildCustomerOrderSupportWhatsAppHref()}
          rel="noreferrer"
          target="_blank"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Soporte por WhatsApp
        </a>
      </div>

      <form className="mt-6 grid gap-4 rounded-[1.8rem] border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-6" onSubmit={form.handleSubmit(handleLookup)}>
        <Field
          error={form.formState.errors.email?.message}
          label="Email"
          placeholder="tu@email.com"
          registration={form.register("email")}
        />
        <Field
          error={form.formState.errors.phone?.message}
          label="WhatsApp o telefono"
          placeholder="+52 55 0000 0000"
          registration={form.register("phone")}
        />
        <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-stone-500">
            Si ya compraste por checkout, no necesitas crear una cuenta completa para consultar tus pedidos.
          </p>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLookupLoading}
            type="submit"
          >
            <SearchIcon className="h-4 w-4" />
            {isLookupLoading ? "Buscando..." : "Buscar pedidos"}
          </button>
        </div>
      </form>

      {lookupNotice ? <NoticeBanner className="mt-5" notice={lookupNotice} /> : null}

      <div className="mt-6">
        {isLookupLoading ? (
          <EmptyBlock message="Consultando pedidos reales..." />
        ) : orders.length === 0 ? (
          <EmptyBlock message={getLookupMessage(lookupErrorReason, hasSubmitted)} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Resultados</p>
                <h3 className="mt-2 font-serif text-2xl text-stone-900">{resultsLabel}</h3>
              </div>
              <p className="text-sm text-stone-500">Tus pedidos se muestran del mas reciente al mas antiguo.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {orders.map((order) => (
                <article className="rounded-[1.8rem] border border-stone-200 bg-white p-5 shadow-soft" key={order.orderId}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Pedido</p>
                      <h4 className="mt-2 font-serif text-2xl text-stone-900">{order.orderNumber}</h4>
                      <p className="mt-2 text-sm text-stone-500">{formatLongDate(order.createdAt)}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Total</p>
                      <p className="mt-2 text-xl font-semibold text-stone-900">{formatCurrency(order.total)}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusBadgeClasses(order.status)}`}>
                      {getCustomerOrderStatusLabel(order.status)}
                    </span>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentStatusBadgeClasses(order.paymentStatus)}`}>
                      {getCustomerPaymentStatusLabel(order.paymentStatus)}
                    </span>
                    <span className="inline-flex rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                      {getCustomerPaymentProviderLabel(order.paymentProvider)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <MetaPill label="Envio" value={order.shippingCarrier ?? "Pendiente"} />
                    <MetaPill label="Tracking" value={order.trackingNumber ?? "Aun no disponible"} />
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-stone-500">
                      {order.deliveredAt
                        ? `Entregado el ${formatLongDate(order.deliveredAt)}`
                        : order.shippedAt
                          ? `Enviado el ${formatLongDate(order.shippedAt)}`
                          : "Tu pedido sigue en preparacion o pendiente de pago."}
                    </p>
                    <button
                      className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-500"
                      onClick={() => {
                        void handleOpenDetail(order.orderId);
                      }}
                      type="button"
                    >
                      Ver detalle
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {activeOrderId ? (
        <div className="mt-6 rounded-[1.8rem] border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Detalle del pedido</p>
              <h3 className="mt-2 font-serif text-3xl text-stone-900">
                {activeOrder?.orderNumber ?? `Pedido #${activeOrderId}`}
              </h3>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-500"
              onClick={() => {
                setActiveOrderId(null);
                setDetailNotice(null);
              }}
              type="button"
            >
              Cerrar
            </button>
          </div>

          {detailNotice ? <NoticeBanner className="mt-5" notice={detailNotice} /> : null}

          {isDetailLoading && !activeOrder ? (
            <EmptyBlock className="mt-5" message="Validando pedido..." />
          ) : activeOrder ? (
            <div className="mt-6 space-y-5">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetaPill label="Estado orden" value={getCustomerOrderStatusLabel(activeOrder.orderStatus)} />
                <MetaPill label="Pago" value={getCustomerPaymentStatusLabel(activeOrder.paymentStatus)} />
                <MetaPill label="Proveedor" value={getCustomerPaymentProviderLabel(activeOrder.paymentProvider)} />
                <MetaPill label="Total" value={formatCurrency(activeOrder.total)} />
              </section>

              <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.6rem] bg-[#fff8f3] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Productos</p>
                  <div className="mt-4 space-y-3">
                    {activeOrder.items.map((item) => (
                      <article className="rounded-[1.2rem] border border-white/70 bg-white/80 px-4 py-4" key={`${item.productId}-${item.productName}`}>
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
                </div>

                <div className="rounded-[1.6rem] bg-[#fcfaf8] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Cliente y envio</p>
                  <div className="mt-4 grid gap-3">
                    <MetaPill label="Cliente" value={activeOrder.customer.name} />
                    <MetaPill label="Email" value={activeOrder.customer.email ?? "Sin email"} />
                    <MetaPill label="Telefono" value={activeOrder.customer.phone ?? "Sin telefono"} />
                    <MetaPill label="Direccion" value={activeOrder.shippingAddress.fullAddress} />
                    <MetaPill
                      label="Tracking"
                      value={
                        activeOrder.tracking.trackingNumber
                          ? `${activeOrder.tracking.shippingCarrier ?? "Paqueteria"} - ${activeOrder.tracking.trackingNumber}`
                          : "Aun no disponible"
                      }
                    />
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetaPill label="Subtotal" value={formatCurrency(activeOrder.subtotal)} />
                <MetaPill label="Descuento" value={formatCurrency(activeOrder.discount)} />
                <MetaPill label="Envio" value={formatCurrency(activeOrder.shipping)} />
                <MetaPill
                  label="Actualizado"
                  value={formatDateTime(activeOrder.timestamps.updatedAt ?? activeOrder.timestamps.createdAt)}
                />
              </section>

              <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Tiempos del pedido</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetaPill label="Creado" value={formatDateTime(activeOrder.timestamps.createdAt)} />
                  <MetaPill
                    label="Pagado"
                    value={activeOrder.timestamps.paidAt ? formatDateTime(activeOrder.timestamps.paidAt) : "Pendiente"}
                  />
                  <MetaPill
                    label="Enviado"
                    value={activeOrder.timestamps.shippedAt ? formatDateTime(activeOrder.timestamps.shippedAt) : "Pendiente"}
                  />
                  <MetaPill
                    label="Entregado"
                    value={
                      activeOrder.timestamps.deliveredAt ? formatDateTime(activeOrder.timestamps.deliveredAt) : "Pendiente"
                    }
                  />
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <a
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                    href={buildCustomerOrderSupportWhatsAppHref(activeOrder.orderNumber)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    WhatsApp soporte
                  </a>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500"
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    type="button"
                  >
                    <ArrowUpRightIcon className="h-4 w-4" />
                    Buscar otro pedido
                  </button>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Field({
  error,
  label,
  placeholder,
  registration,
}: {
  error?: string;
  label: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-900">{label}</span>
      <input
        className="mt-3 w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-stone-500"
        placeholder={placeholder}
        {...registration}
      />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
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

function EmptyBlock({
  className = "",
  message,
}: {
  className?: string;
  message: string;
}) {
  return (
    <div className={`${className} rounded-[1.6rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-sm leading-7 text-stone-500`}>
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
