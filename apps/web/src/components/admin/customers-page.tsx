"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { ArrowUpRightIcon, SearchIcon, WhatsAppIcon } from "@/components/shared/icons";
import type {
  AdminCustomerDetail,
  AdminCustomerSummary,
  PaginatedAdminCustomersResponse,
} from "@/lib/admin-customers";
import type { CRMContactLifecycleStatus } from "@/lib/admin-crm";
import {
  buildCrmWhatsAppHref,
  CRM_LIFECYCLE_STATUS_OPTIONS,
  getCrmLifecycleStatusLabel,
  getCrmMainGoalLabel,
  getCrmSkinTypeLabel,
} from "@/lib/admin-crm";
import {
  buildAdminOrderMailtoHref,
  buildAdminOrderWhatsAppHref,
  getAdminOrderStatusLabel,
  getAdminPaymentProviderLabel,
  getAdminPaymentStatusLabel,
} from "@/lib/admin-orders";
import { formatCurrency, formatDateTime } from "@/lib/format";

type CustomersListApiResponse =
  | { ok: true; data: PaginatedAdminCustomersResponse }
  | { ok: false; reason: string; message?: string };

type CustomerDetailApiResponse =
  | { ok: true; data: AdminCustomerDetail }
  | { ok: false; reason: string; message?: string };

type Notice = {
  kind: "error" | "success";
  message: string;
} | null;

type LifecycleFilter = "all" | CRMContactLifecycleStatus;
type BooleanFilter = "all" | "true" | "false";

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const SORT_OPTIONS = [
  { label: "Ultima compra", value: "lastPurchaseAt" },
  { label: "Mayor gasto", value: "totalSpent" },
  { label: "Mas pedidos", value: "ordersCount" },
  { label: "Nombre", value: "customer" },
];

function getLoadMessage(reason: string | null, hasFilters: boolean) {
  if (!reason) {
    return hasFilters
      ? "No encontramos clientas con esos filtros. Ajusta la busqueda o limpia algunos criterios."
      : "Todavia no hay clientas sincronizadas desde checkout o importacion.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para consultar clientes reales desde FastAPI.";
  }

  if (reason === "auth_failed") {
    return "Tu sesion de SuperAdmin no es valida o expiro. Vuelve a iniciar sesion.";
  }

  return "No fue posible cargar la base de clientas por ahora. El panel mantiene un estado vacio amigable mientras la API no este disponible.";
}

function getLifecycleBadgeClasses(status: CRMContactLifecycleStatus | null) {
  switch (status) {
    case "customer":
      return "border-[#cfe0df] bg-[#eef8f7] text-[#2c6160]";
    case "repeat_customer":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "inactive":
      return "border-stone-200 bg-stone-100 text-stone-600";
    case "lead":
      return "border-[#ead9c8] bg-[#fff8f3] text-stone-800";
    default:
      return "border-stone-200 bg-white text-stone-500";
  }
}

function getMarketingBadgeClasses(value: boolean | null) {
  if (value === true) {
    return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
  }
  if (value === false) {
    return "border-stone-200 bg-stone-100 text-stone-600";
  }
  return "border-stone-200 bg-white text-stone-500";
}

function getCustomerLifecycleLabel(status: CRMContactLifecycleStatus | null) {
  if (!status) {
    return "Sin CRM";
  }

  return getCrmLifecycleStatusLabel(status);
}

function formatTag(tag: string) {
  return tag
    .replaceAll("_", " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");
  const [hasOrdersFilter, setHasOrdersFilter] = useState<BooleanFilter>("all");
  const [marketingFilter, setMarketingFilter] = useState<BooleanFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState("lastPurchaseAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, AdminCustomerDetail>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [drawerNotice, setDrawerNotice] = useState<Notice>(null);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const hasFilters =
    deferredSearch.trim().length > 0 ||
    lifecycleFilter !== "all" ||
    hasOrdersFilter !== "all" ||
    marketingFilter !== "all";
  const activeCustomer = selectedCustomerId ? detailCache[selectedCustomerId] ?? null : null;

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, hasOrdersFilter, lifecycleFilter, marketingFilter, pageSize, sortBy, sortDir]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          sortBy,
          sortDir,
        });

        if (deferredSearch.trim()) {
          params.set("search", deferredSearch.trim());
        }
        if (lifecycleFilter !== "all") {
          params.set("lifecycle_status", lifecycleFilter);
        }
        if (hasOrdersFilter !== "all") {
          params.set("has_orders", hasOrdersFilter);
        }
        if (marketingFilter !== "all") {
          params.set("accepted_marketing", marketingFilter);
        }

        const response = await fetch(`/api/admin/customers?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as CustomersListApiResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setCustomers([]);
          setTotal(0);
          setTotalPages(1);
          setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
          return;
        }

        setCustomers(payload.data.items);
        setTotal(payload.data.total);
        setTotalPages(Math.max(1, payload.data.totalPages));
        setErrorReason(null);
      } catch {
        if (!cancelled) {
          setCustomers([]);
          setTotal(0);
          setTotalPages(1);
          setErrorReason("fetch_failed");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCustomers();
    return () => {
      cancelled = true;
    };
  }, [deferredSearch, hasOrdersFilter, lifecycleFilter, marketingFilter, page, pageSize, sortBy, sortDir]);

  async function loadCustomerDetail(customerId: number, force = false) {
    if (!force && detailCache[customerId]) {
      return;
    }

    setIsDetailLoading(true);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as CustomerDetailApiResponse;

      if (!response.ok || !payload.ok) {
        setDrawerNotice({
          kind: "error",
          message: payload.ok ? "No pudimos cargar el detalle de la clienta." : payload.message ?? "No pudimos cargar el detalle de la clienta.",
        });
        return;
      }

      setDetailCache((current) => ({
        ...current,
        [customerId]: payload.data,
      }));
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos cargar el detalle de la clienta por ahora.",
      });
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleOpenDetail(customerId: number) {
    setSelectedCustomerId(customerId);
    await loadCustomerDetail(customerId);
  }

  return (
    <>
      <div className="space-y-5">
        <section className="soft-panel rounded-[1.5rem] p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Clientes</p>
              <h1 className="mt-2 font-serif text-3xl text-stone-900 sm:text-[2.4rem]">Base comercial operativa</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                Vista compacta, filtrable y paginada para operar miles de clientas sin depender de cards grandes ni cargas masivas.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetricPill label="Total" value={String(total)} />
              <MetricPill label="Pagina" value={`${page}/${Math.max(1, totalPages)}`} />
            </div>
          </div>

          <div className="mt-5 grid gap-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
            <label className="flex items-center gap-3 rounded-full border border-stone-200 bg-white px-4 py-2.5">
              <SearchIcon className="h-4 w-4 text-stone-500" />
              <input
                className="w-full border-none bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
                onChange={(event) => {
                  setSearchValue(event.target.value);
                }}
                placeholder="Buscar por nombre, email o WhatsApp"
                value={searchValue}
              />
            </label>

            <FilterSelect
              label="Estado"
              onChange={(value) => {
                setLifecycleFilter(value as LifecycleFilter);
              }}
              options={[
                { label: "Todos", value: "all" },
                ...CRM_LIFECYCLE_STATUS_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.value,
                })),
              ]}
              value={lifecycleFilter}
            />
            <FilterSelect
              label="Pedidos"
              onChange={(value) => {
                setHasOrdersFilter(value as BooleanFilter);
              }}
              options={[
                { label: "Todos", value: "all" },
                { label: "Con pedidos", value: "true" },
                { label: "Sin pedidos", value: "false" },
              ]}
              value={hasOrdersFilter}
            />
            <FilterSelect
              label="Marketing"
              onChange={(value) => {
                setMarketingFilter(value as BooleanFilter);
              }}
              options={[
                { label: "Todos", value: "all" },
                { label: "Aceptado", value: "true" },
                { label: "No aceptado", value: "false" },
              ]}
              value={marketingFilter}
            />
            <FilterSelect
              label="Orden"
              onChange={(value) => {
                setSortBy(value);
              }}
              options={SORT_OPTIONS}
              value={sortBy}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FilterSelect
                label="Direccion"
                onChange={(value) => {
                  setSortDir(value as "asc" | "desc");
                }}
                options={[
                  { label: "Desc", value: "desc" },
                  { label: "Asc", value: "asc" },
                ]}
                value={sortDir}
              />
              <FilterSelect
                label="Page size"
                onChange={(value) => {
                  setPageSize(Number(value));
                }}
                options={PAGE_SIZE_OPTIONS.map((option) => ({
                  label: String(option),
                  value: String(option),
                }))}
                value={String(pageSize)}
              />
            </div>
          </div>
        </section>

        <section className="soft-panel rounded-[1.5rem] p-3 sm:p-4">
          <div className="overflow-hidden rounded-[1.3rem] border border-stone-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200 text-left">
                <thead className="bg-[#fff8f3] text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">WhatsApp</th>
                    <th className="px-4 py-3">Pedidos</th>
                    <th className="px-4 py-3">Total gastado</th>
                    <th className="px-4 py-3">Ultima compra</th>
                    <th className="px-4 py-3">Marketing</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} />)
                  ) : customers.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10" colSpan={9}>
                        <EmptyBlock message={getLoadMessage(errorReason, hasFilters)} />
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr className="align-top transition hover:bg-[#fffdfb]" key={customer.id}>
                        <td className="px-4 py-3">
                          <button
                            className="text-left"
                            onClick={() => {
                              void handleOpenDetail(customer.id);
                            }}
                            type="button"
                          >
                            <p className="font-semibold text-stone-900">{customer.name}</p>
                            <p className="mt-1 text-xs text-stone-500">{customer.source ? customer.source.replaceAll("_", " ") : "Sin origen CRM"}</p>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">{customer.email ?? "Sin email"}</td>
                        <td className="px-4 py-3 text-sm text-stone-600">{customer.whatsapp ?? "Sin WhatsApp"}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-stone-900">{customer.ordersCount}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-stone-900">{formatCurrency(customer.totalSpent)}</td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {customer.lastPurchaseAt ? formatDateTime(customer.lastPurchaseAt) : "Sin compra"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getMarketingBadgeClasses(customer.acceptedMarketing)}`}>
                            {customer.acceptedMarketing === true ? "Aceptado" : customer.acceptedMarketing === false ? "No" : "Sin dato"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getLifecycleBadgeClasses(customer.lifecycleStatus)}`}>
                            {getCustomerLifecycleLabel(customer.lifecycleStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500"
                            onClick={() => {
                              void handleOpenDetail(customer.id);
                            }}
                            type="button"
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationFooter
            currentPage={page}
            disabled={isLoading || customers.length === 0}
            onNext={() => {
              setPage((current) => Math.min(totalPages, current + 1));
            }}
            onPrevious={() => {
              setPage((current) => Math.max(1, current - 1));
            }}
            total={total}
            totalPages={totalPages}
          />
        </section>
      </div>

      {selectedCustomerId ? (
        <div className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-[2px]">
          <div className="absolute inset-y-0 right-0 flex w-full justify-end">
            <button
              aria-label="Cerrar detalle"
              className="hidden flex-1 cursor-default lg:block"
              onClick={() => {
                setSelectedCustomerId(null);
                setDrawerNotice(null);
              }}
              type="button"
            />
            <aside className="flex h-full w-full max-w-[980px] flex-col overflow-y-auto border-l border-stone-200 bg-[#fcfaf8] px-4 py-4 shadow-2xl sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Detalle cliente</p>
                  <h2 className="mt-2 font-serif text-2xl text-stone-900 sm:text-[2rem]">
                    {activeCustomer?.name ?? `Cliente #${selectedCustomerId}`}
                  </h2>
                  {activeCustomer ? (
                    <p className="mt-2 text-sm text-stone-600">
                      {activeCustomer.email ?? "Sin email"} / {activeCustomer.whatsapp ?? "Sin WhatsApp"}
                    </p>
                  ) : null}
                </div>
                <button
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-500"
                  onClick={() => {
                    setSelectedCustomerId(null);
                    setDrawerNotice(null);
                  }}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              {drawerNotice ? <NoticeBanner className="mt-5" notice={drawerNotice} /> : null}

              {isDetailLoading && !activeCustomer ? (
                <EmptyBlock className="mt-6" message="Cargando detalle de la clienta..." />
              ) : activeCustomer ? (
                <div className="mt-5 space-y-4 pb-8">
                  <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetaPill label="Pedidos" value={String(activeCustomer.ordersCount)} />
                      <MetaPill label="Total gastado" value={formatCurrency(activeCustomer.totalSpent)} />
                      <MetaPill
                        label="Ultima compra"
                        value={activeCustomer.lastPurchaseAt ? formatDateTime(activeCustomer.lastPurchaseAt) : "Sin compra"}
                      />
                      <MetaPill label="Marketing" value={activeCustomer.acceptedMarketing === true ? "Aceptado" : activeCustomer.acceptedMarketing === false ? "No aceptado" : "Sin dato"} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {activeCustomer.whatsapp ? (
                        <a
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cfe0df] bg-[#eef8f7] px-5 py-3 text-sm font-semibold text-[#2c6160] transition hover:border-[#98b8b6]"
                          href={
                            activeCustomer.recentOrders[0]
                              ? buildAdminOrderWhatsAppHref(activeCustomer.whatsapp, activeCustomer.name, activeCustomer.recentOrders[0].orderNumber)
                              : buildCrmWhatsAppHref(activeCustomer.whatsapp, activeCustomer.name)
                          }
                          rel="noreferrer"
                          target="_blank"
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                          WhatsApp
                        </a>
                      ) : null}
                      {activeCustomer.email ? (
                        <a
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500"
                          href={
                            activeCustomer.recentOrders[0]
                              ? buildAdminOrderMailtoHref(activeCustomer.email, activeCustomer.recentOrders[0].orderNumber)
                              : `mailto:${activeCustomer.email}`
                          }
                        >
                          <ArrowUpRightIcon className="h-4 w-4" />
                          Email
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <MetaPill label="Estado CRM" value={getCustomerLifecycleLabel(activeCustomer.lifecycleStatus)} />
                      <MetaPill label="Objetivo" value={getCrmMainGoalLabel(activeCustomer.mainGoal)} />
                      <MetaPill label="Tipo de piel" value={getCrmSkinTypeLabel(activeCustomer.skinType)} />
                      <MetaPill label="Origen" value={activeCustomer.source ? activeCustomer.source.replaceAll("_", " ") : "Sin CRM"} />
                    </div>

                    {activeCustomer.tags.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {activeCustomer.tags.map((tag) => (
                          <span
                            className="rounded-full border border-stone-200 bg-[#fff8f3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600"
                            key={tag}
                          >
                            {formatTag(tag)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Direcciones</p>
                        <h3 className="mt-2 font-serif text-[1.6rem] text-stone-900">Datos de entrega</h3>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {activeCustomer.addresses.length === 0 ? (
                        <EmptyBlock message="No hay direcciones guardadas para esta clienta." />
                      ) : (
                        activeCustomer.addresses.map((address) => (
                          <article className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4" key={address.id}>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-stone-900">{address.label}</p>
                              {address.isDefault ? (
                                <span className="rounded-full border border-[#d8e3cf] bg-[#f3faf0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#476638]">
                                  Predeterminada
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm leading-7 text-stone-700">
                              {address.addressLine1}, {address.city}, {address.state}, {address.postalCode}
                            </p>
                          </article>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Pedidos recientes</p>
                    <div className="mt-4 space-y-3">
                      {activeCustomer.recentOrders.length === 0 ? (
                        <EmptyBlock message="Todavia no hay pedidos para esta clienta." />
                      ) : (
                        activeCustomer.recentOrders.map((order) => (
                          <article className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4" key={order.id}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-semibold text-stone-900">{order.orderNumber}</p>
                                <p className="mt-1 text-xs text-stone-500">{formatDateTime(order.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-stone-900">{formatCurrency(order.total)}</p>
                                <p className="mt-1 text-xs text-stone-500">
                                  {getAdminPaymentProviderLabel(order.paymentProvider)} / {getAdminPaymentStatusLabel(order.paymentStatus)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700">
                                {getAdminOrderStatusLabel(order.status)}
                              </span>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Notas y seguimiento</p>
                    <div className="mt-4 space-y-3">
                      {activeCustomer.notes.length === 0 ? (
                        <EmptyBlock message="No hay notas internas asociadas a esta clienta." />
                      ) : (
                        activeCustomer.notes.map((note) => (
                          <article className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4" key={note.id}>
                            <p className="text-sm leading-7 text-stone-800">{note.note}</p>
                            <p className="mt-2 text-xs text-stone-500">{formatDateTime(note.createdAt)}</p>
                          </article>
                        ))
                      )}
                    </div>
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
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">{label}</span>
      <select
        className="w-full rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition focus:border-stone-500"
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

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700">
      <span className="font-semibold text-stone-900">{value}</span> {label}
    </div>
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

function PaginationFooter({
  currentPage,
  disabled,
  onNext,
  onPrevious,
  total,
  totalPages,
}: {
  currentPage: number;
  disabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
  total: number;
  totalPages: number;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-stone-200 pt-4 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
      <p>{total} clientas encontradas</p>
      <div className="flex items-center gap-3">
        <button
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || currentPage <= 1}
          onClick={onPrevious}
          type="button"
        >
          Anterior
        </button>
        <span>
          Pagina {currentPage} de {Math.max(1, totalPages)}
        </span>
        <button
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || currentPage >= totalPages}
          onClick={onNext}
          type="button"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 9 }).map((_, index) => (
        <td className="px-4 py-4" key={index}>
          <div className="h-4 rounded-full bg-stone-100" />
        </td>
      ))}
    </tr>
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
    <div className={`${className} rounded-[1.2rem] border border-dashed border-stone-300 bg-white px-4 py-5 text-sm leading-7 text-stone-500`}>
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
