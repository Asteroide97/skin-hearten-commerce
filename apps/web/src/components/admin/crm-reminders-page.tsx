"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CRM_REMINDER_CHANNEL_OPTIONS,
  CRM_REMINDER_STATUS_OPTIONS,
  CRM_REMINDER_TYPE_OPTIONS,
  buildCrmContactName,
  buildCrmReminderMailtoHref,
  buildCrmReminderWhatsAppHref,
  getCrmReminderChannelLabel,
  getCrmReminderStatusLabel,
  getCrmReminderTypeLabel,
  type CRMReminderChannel,
  type CRMReminderDetail,
  type CRMReminderStatus,
  type CRMReminderSummary,
  type CRMReminderType,
  type CRMReminderUpdateInput,
} from "@/lib/admin-crm";
import { formatDateTime } from "@/lib/format";

type RemindersApiResponse =
  | { ok: true; data: CRMReminderSummary[] }
  | { ok: false; reason: string };

type ReminderDetailApiResponse =
  | { ok: true; data: CRMReminderDetail }
  | { ok: false; reason: string };

type Notice = {
  kind: "error" | "success";
  message: string;
} | null;

type ReminderFiltersState = {
  channel: "all" | CRMReminderChannel;
  dateFrom: string;
  dateTo: string;
  reminderType: "all" | CRMReminderType;
  search: string;
  status: "all" | CRMReminderStatus;
};

type ReminderDraft = {
  renderedBody: string;
  renderedSubject: string;
  scheduledFor: string;
  status: CRMReminderStatus;
};

function getLoadMessage(reason: string | null, hasFilters: boolean) {
  if (!reason) {
    return hasFilters
      ? "No encontramos recordatorios con esos filtros. Ajusta la busqueda o el rango de fechas."
      : "Aun no hay recordatorios CRM. Un lead de Skin Quiz o un checkout nuevo los generara automaticamente.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para consultar recordatorios CRM desde el panel admin.";
  }

  if (reason === "auth_failed") {
    return "No pudimos autenticar el panel admin contra la API local. Revisa credenciales y variables del entorno.";
  }

  return "No fue posible cargar recordatorios por ahora. La vista mantiene un estado vacio amigable mientras la API local no este disponible.";
}

function getStatusBadgeClasses(status: CRMReminderStatus) {
  switch (status) {
    case "ready":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "sent_manual":
      return "border-[#cfe0df] bg-[#eef8f7] text-[#2c6160]";
    case "skipped":
    case "cancelled":
      return "border-stone-200 bg-stone-100 text-stone-600";
    case "pending":
    default:
      return "border-[#e7d3c1] bg-[#fff8f3] text-stone-800";
  }
}

function toDatetimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function isPendingReminder(status: CRMReminderStatus) {
  return status === "pending" || status === "ready";
}

export function CrmRemindersPage() {
  const [reminders, setReminders] = useState<CRMReminderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<Notice>(null);

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReminderFiltersState["status"]>("all");
  const [channelFilter, setChannelFilter] = useState<ReminderFiltersState["channel"]>("all");
  const [typeFilter, setTypeFilter] = useState<ReminderFiltersState["reminderType"]>("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  const [selectedReminderId, setSelectedReminderId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, CRMReminderDetail>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [drawerNotice, setDrawerNotice] = useState<Notice>(null);
  const [draft, setDraft] = useState<ReminderDraft | null>(null);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [isSkippingReminder, setIsSkippingReminder] = useState(false);

  const hasFilters =
    searchValue.trim().length > 0 ||
    statusFilter !== "all" ||
    channelFilter !== "all" ||
    typeFilter !== "all" ||
    dateFromFilter.length > 0 ||
    dateToFilter.length > 0;

  const selectedReminderDetail = selectedReminderId ? detailCache[selectedReminderId] ?? null : null;
  const selectedReminderSummary = selectedReminderId
    ? selectedReminderDetail ?? reminders.find((reminder) => reminder.id === selectedReminderId) ?? null
    : null;

  const reminderCountLabel = reminders.length === 1 ? "1 recordatorio" : `${reminders.length} recordatorios`;

  const kpis = useMemo(() => {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return {
      emailPending: reminders.filter(
        (reminder) => reminder.channel === "email" && isPendingReminder(reminder.status),
      ).length,
      pending: reminders.filter((reminder) => reminder.status === "pending").length,
      readyToday: reminders.filter((reminder) => {
        if (reminder.status !== "ready") {
          return false;
        }
        const scheduledFor = new Date(reminder.scheduledFor);
        return !Number.isNaN(scheduledFor.getTime()) && scheduledFor <= todayEnd;
      }).length,
      whatsappPending: reminders.filter(
        (reminder) => reminder.channel === "whatsapp" && isPendingReminder(reminder.status),
      ).length,
    };
  }, [reminders]);

  const loadReminders = useCallback(async (filters: ReminderFiltersState) => {
    setIsLoading(true);

    const params = new URLSearchParams();
    if (filters.search.trim().length > 0) {
      params.set("search", filters.search.trim());
    }
    if (filters.status !== "all") {
      params.set("status", filters.status);
    }
    if (filters.channel !== "all") {
      params.set("channel", filters.channel);
    }
    if (filters.reminderType !== "all") {
      params.set("reminder_type", filters.reminderType);
    }
    if (filters.dateFrom) {
      params.set("date_from", filters.dateFrom);
    }
    if (filters.dateTo) {
      params.set("date_to", filters.dateTo);
    }

    try {
      const requestUrl = params.size > 0 ? `/api/admin/crm/reminders?${params.toString()}` : "/api/admin/crm/reminders";
      const response = await fetch(requestUrl, { cache: "no-store" });
      const payload = (await response.json()) as RemindersApiResponse;

      if (!response.ok || !payload.ok) {
        setReminders([]);
        setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
        return;
      }

      setReminders(payload.data);
      setErrorReason(null);
    } catch {
      setReminders([]);
      setErrorReason("fetch_failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function loadReminderDetail(reminderId: number, force = false) {
    if (!force && detailCache[reminderId]) {
      return;
    }

    setIsDetailLoading(true);
    setDetailError(null);

    try {
      const response = await fetch(`/api/admin/crm/reminders/${reminderId}`, { cache: "no-store" });
      const payload = (await response.json()) as ReminderDetailApiResponse;

      if (!response.ok || !payload.ok) {
        setDetailError(payload.ok ? "fetch_failed" : payload.reason);
        return;
      }

      setDetailCache((current) => ({
        ...current,
        [reminderId]: payload.data,
      }));
    } catch {
      setDetailError("fetch_failed");
    } finally {
      setIsDetailLoading(false);
    }
  }

  function mergeReminder(updatedReminder: CRMReminderDetail) {
    setDetailCache((current) => ({
      ...current,
      [updatedReminder.id]: updatedReminder,
    }));
    setReminders((current) =>
      current.map((reminder) => (reminder.id === updatedReminder.id ? updatedReminder : reminder)),
    );
  }

  function openReminder(reminderId: number) {
    setSelectedReminderId(reminderId);
    setDrawerNotice(null);
    void loadReminderDetail(reminderId);
  }

  async function handleSaveReminder() {
    if (!selectedReminderSummary || !draft) {
      return;
    }

    const renderedBody = draft.renderedBody.trim();
    if (renderedBody.length < 2) {
      setDrawerNotice({
        kind: "error",
        message: "Escribe un mensaje con al menos 2 caracteres.",
      });
      return;
    }

    const payload: CRMReminderUpdateInput = {};
    if (draft.status !== selectedReminderSummary.status) {
      payload.status = draft.status;
    }

    const nextScheduledFor = toIsoFromLocalDatetime(draft.scheduledFor);
    if (nextScheduledFor && nextScheduledFor !== selectedReminderSummary.scheduledFor) {
      payload.scheduledFor = nextScheduledFor;
    }

    if ((draft.renderedSubject || "") !== (selectedReminderSummary.renderedSubject || "")) {
      payload.renderedSubject = draft.renderedSubject || null;
    }

    if (renderedBody !== selectedReminderSummary.renderedBody) {
      payload.renderedBody = renderedBody;
    }

    if (Object.keys(payload).length === 0) {
      setDrawerNotice({
        kind: "success",
        message: "No habia cambios pendientes en este recordatorio.",
      });
      return;
    }

    setIsSavingReminder(true);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/crm/reminders/${selectedReminderSummary.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const payloadResponse = (await response.json()) as ReminderDetailApiResponse;

      if (!response.ok || !payloadResponse.ok) {
        setDrawerNotice({
          kind: "error",
          message: "No pudimos actualizar el recordatorio por ahora.",
        });
        return;
      }

      mergeReminder(payloadResponse.data);
      setDrawerNotice({
        kind: "success",
        message: "Recordatorio actualizado correctamente.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos actualizar el recordatorio por ahora.",
      });
    } finally {
      setIsSavingReminder(false);
    }
  }

  async function handleMarkSentManual() {
    if (!selectedReminderSummary) {
      return;
    }

    setIsSendingManual(true);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/crm/reminders/${selectedReminderSummary.id}/mark-sent-manual`, {
        method: "POST",
      });
      const payload = (await response.json()) as ReminderDetailApiResponse;

      if (!response.ok || !payload.ok) {
        setDrawerNotice({
          kind: "error",
          message: "No pudimos marcar el recordatorio como enviado.",
        });
        return;
      }

      mergeReminder(payload.data);
      setDrawerNotice({
        kind: "success",
        message: "Recordatorio marcado como enviado manualmente.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos marcar el recordatorio como enviado.",
      });
    } finally {
      setIsSendingManual(false);
    }
  }

  async function handleSkipReminder() {
    if (!selectedReminderSummary) {
      return;
    }

    setIsSkippingReminder(true);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/crm/reminders/${selectedReminderSummary.id}/skip`, {
        method: "POST",
      });
      const payload = (await response.json()) as ReminderDetailApiResponse;

      if (!response.ok || !payload.ok) {
        setDrawerNotice({
          kind: "error",
          message: "No pudimos omitir el recordatorio por ahora.",
        });
        return;
      }

      mergeReminder(payload.data);
      setDrawerNotice({
        kind: "success",
        message: "Recordatorio omitido.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos omitir el recordatorio por ahora.",
      });
    } finally {
      setIsSkippingReminder(false);
    }
  }

  async function handleCopyEmail() {
    if (!selectedReminderSummary || !selectedReminderSummary.contact.email) {
      return;
    }

    const emailText = [
      `Para: ${selectedReminderSummary.contact.email}`,
      `Subject: ${draft?.renderedSubject || selectedReminderSummary.renderedSubject || ""}`,
      "",
      draft?.renderedBody || selectedReminderSummary.renderedBody,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(emailText);
      setDrawerNotice({
        kind: "success",
        message: "Email copiado al portapapeles.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos copiar el email en este navegador.",
      });
    }
  }

  useEffect(() => {
    void loadReminders({
      channel: "all",
      dateFrom: "",
      dateTo: "",
      reminderType: "all",
      search: "",
      status: "all",
    });
  }, [loadReminders]);

  useEffect(() => {
    if (!selectedReminderSummary) {
      setDraft(null);
      return;
    }

    setDraft({
      renderedBody: selectedReminderSummary.renderedBody,
      renderedSubject: selectedReminderSummary.renderedSubject || "",
      scheduledFor: toDatetimeLocalValue(selectedReminderSummary.scheduledFor),
      status: selectedReminderSummary.status,
    });
  }, [selectedReminderSummary]);

  return (
    <>
      <div className="space-y-6">
        <section className="soft-panel rounded-[1.8rem] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                CRM Multichannel Reminders Base
              </p>
              <h1 className="mt-2 font-serif text-4xl text-stone-900">Recordatorios comerciales manuales</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                Centraliza seguimientos por WhatsApp y email sin enviar mensajes automaticamente. Cada recordatorio
                queda editable, reprogramable y trazable desde el panel admin.
              </p>
            </div>
            <div className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
              {isLoading ? "Cargando recordatorios..." : reminderCountLabel}
            </div>
          </div>

          {pageNotice ? <NoticeBanner className="mt-5" notice={pageNotice} /> : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pendientes" value={String(kpis.pending)} />
          <MetricCard label="Listos para hoy" value={String(kpis.readyToday)} />
          <MetricCard label="WhatsApp pendientes" value={String(kpis.whatsappPending)} />
          <MetricCard label="Email pendientes" value={String(kpis.emailPending)} />
        </section>

        <section className="soft-panel rounded-[1.8rem] p-6">
          <form
            className="grid gap-3 xl:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setPageNotice(null);
              void loadReminders({
                channel: channelFilter,
                dateFrom: dateFromFilter,
                dateTo: dateToFilter,
                reminderType: typeFilter,
                search: searchValue,
                status: statusFilter,
              });
            }}
          >
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Buscar</span>
              <input
                className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                onChange={(event) => {
                  setSearchValue(event.target.value);
                }}
                placeholder="Contacto, email, WhatsApp o mensaje"
                value={searchValue}
              />
            </label>

            <FilterSelect
              label="Status"
              onChange={(value) => {
                setStatusFilter(value as ReminderFiltersState["status"]);
              }}
              options={[{ label: "Todos", value: "all" }, ...CRM_REMINDER_STATUS_OPTIONS]}
              value={statusFilter}
            />

            <FilterSelect
              label="Canal"
              onChange={(value) => {
                setChannelFilter(value as ReminderFiltersState["channel"]);
              }}
              options={[{ label: "Todos", value: "all" }, ...CRM_REMINDER_CHANNEL_OPTIONS]}
              value={channelFilter}
            />

            <FilterSelect
              label="Tipo"
              onChange={(value) => {
                setTypeFilter(value as ReminderFiltersState["reminderType"]);
              }}
              options={[{ label: "Todos", value: "all" }, ...CRM_REMINDER_TYPE_OPTIONS]}
              value={typeFilter}
            />

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Desde</span>
              <input
                className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                onChange={(event) => {
                  setDateFromFilter(event.target.value);
                }}
                type="date"
                value={dateFromFilter}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Hasta</span>
              <input
                className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                onChange={(event) => {
                  setDateToFilter(event.target.value);
                }}
                type="date"
                value={dateToFilter}
              />
            </label>

            <div className="flex items-end">
              <button
                className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 md:w-auto"
                type="submit"
              >
                Aplicar filtros
              </button>
            </div>
          </form>
        </section>

        <section className="soft-panel rounded-[1.8rem] p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Cola comercial</p>
              <h2 className="mt-2 font-serif text-3xl text-stone-900">WhatsApp y email listos para seguimiento</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                href="/admin/crm"
              >
                Ver CRM
              </Link>
              <button
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                onClick={() => {
                  setPageNotice(null);
                  void loadReminders({
                    channel: channelFilter,
                    dateFrom: dateFromFilter,
                    dateTo: dateToFilter,
                    reminderType: typeFilter,
                    search: searchValue,
                    status: statusFilter,
                  });
                }}
                type="button"
              >
                Recargar
              </button>
            </div>
          </div>

          {isLoading ? (
            <EmptyState message="Cargando recordatorios CRM..." title="Cargando" />
          ) : reminders.length === 0 ? (
            <EmptyState message={getLoadMessage(errorReason, hasFilters)} title="Sin recordatorios por ahora" />
          ) : (
            <div className="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-left">
                  <thead className="bg-[#fff8f3] text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    <tr>
                      <th className="px-4 py-4">Contacto</th>
                      <th className="px-4 py-4">Canal</th>
                      <th className="px-4 py-4">Tipo</th>
                      <th className="px-4 py-4">Fecha programada</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                    {reminders.map((reminder) => (
                      <tr className="align-top" key={reminder.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-stone-900">
                            {buildCrmContactName(reminder.contact)}
                          </p>
                          <p className="mt-1 text-xs leading-6 text-stone-500">
                            {reminder.contact.whatsapp ?? reminder.contact.email ?? "Sin canal directo"}
                          </p>
                        </td>
                        <td className="px-4 py-4">{getCrmReminderChannelLabel(reminder.channel)}</td>
                        <td className="px-4 py-4">{getCrmReminderTypeLabel(reminder.reminderType)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-stone-600">
                          {formatDateTime(reminder.scheduledFor)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(reminder.status)}`}
                          >
                            {getCrmReminderStatusLabel(reminder.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                            onClick={() => {
                              openReminder(reminder.id);
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

      {selectedReminderId ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 bg-stone-950/25 backdrop-blur-sm"
          onClick={() => {
            setSelectedReminderId(null);
            setDetailError(null);
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
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Recordatorio CRM</p>
                  <h2 className="mt-2 font-serif text-3xl text-stone-900">
                    {selectedReminderSummary ? buildCrmContactName(selectedReminderSummary.contact) : "Cargando recordatorio"}
                  </h2>
                </div>
                <button
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                  onClick={() => {
                    setSelectedReminderId(null);
                    setDetailError(null);
                    setDrawerNotice(null);
                  }}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              {isDetailLoading && !detailCache[selectedReminderId] ? (
                <EmptyState message="Cargando detalle del recordatorio..." title="Cargando" />
              ) : detailError ? (
                <EmptyState
                  message="No pudimos cargar el detalle completo del recordatorio. Reintenta cuando la API local este disponible."
                  title="No disponible"
                />
              ) : selectedReminderSummary && draft ? (
                <div className="mt-6 space-y-6">
                  {drawerNotice ? <NoticeBanner notice={drawerNotice} /> : null}

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-stone-900">
                          {buildCrmContactName(selectedReminderSummary.contact)}
                        </p>
                        <p className="text-sm text-stone-600">
                          {selectedReminderDetail?.reminderReason ??
                            getCrmReminderTypeLabel(selectedReminderSummary.reminderType)}
                        </p>
                        <p className="text-sm text-stone-500">
                          {selectedReminderSummary.contact.whatsapp ?? "Sin WhatsApp"}{" "}
                          {selectedReminderSummary.contact.email ? `· ${selectedReminderSummary.contact.email}` : ""}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(selectedReminderSummary.status)}`}
                      >
                        {getCrmReminderStatusLabel(selectedReminderSummary.status)}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <MetaPill label="Canal" value={getCrmReminderChannelLabel(selectedReminderSummary.channel)} />
                      <MetaPill label="Tipo" value={getCrmReminderTypeLabel(selectedReminderSummary.reminderType)} />
                      <MetaPill label="Programado" value={formatDateTime(selectedReminderSummary.scheduledFor)} />
                      <MetaPill label="Plantilla" value={selectedReminderSummary.templateName ?? "Manual"} />
                    </div>
                  </section>

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Mensaje</p>
                        <h3 className="mt-2 font-serif text-2xl text-stone-900">Render editable</h3>
                      </div>
                        <button
                        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                          onClick={() => {
                            void loadReminderDetail(selectedReminderSummary.id, true);
                          }}
                        type="button"
                      >
                        Refrescar
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4">
                      <FilterSelect
                        label="Status"
                        onChange={(value) => {
                          setDraft((current) => (current ? { ...current, status: value as CRMReminderStatus } : current));
                        }}
                        options={CRM_REMINDER_STATUS_OPTIONS}
                        value={draft.status}
                      />

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Fecha programada
                        </span>
                        <input
                          className="w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                          onChange={(event) => {
                            setDraft((current) =>
                              current ? { ...current, scheduledFor: event.target.value } : current,
                            );
                          }}
                          type="datetime-local"
                          value={draft.scheduledFor}
                        />
                      </label>

                      {selectedReminderSummary.channel === "email" ? (
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                            Subject
                          </span>
                          <input
                            className="w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                            onChange={(event) => {
                              setDraft((current) =>
                                current ? { ...current, renderedSubject: event.target.value } : current,
                              );
                            }}
                            value={draft.renderedSubject}
                          />
                        </label>
                      ) : null}

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Mensaje renderizado
                        </span>
                        <textarea
                          className="min-h-40 w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition focus:border-stone-500"
                          maxLength={4000}
                          onChange={(event) => {
                            setDraft((current) => (current ? { ...current, renderedBody: event.target.value } : current));
                          }}
                          value={draft.renderedBody}
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        {selectedReminderSummary.channel === "whatsapp" && selectedReminderSummary.contact.whatsapp ? (
                          <a
                            className="rounded-full border border-[#cfe0df] bg-[#eef8f7] px-4 py-3 text-sm font-semibold text-[#2c6160] transition hover:border-[#98b8b6]"
                            href={buildCrmReminderWhatsAppHref(
                              selectedReminderSummary.contact.whatsapp,
                              draft.renderedBody,
                            )}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Abrir WhatsApp
                          </a>
                        ) : null}

                        {selectedReminderSummary.channel === "email" && selectedReminderSummary.contact.email ? (
                          <>
                            <button
                              className="rounded-full border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500"
                              onClick={() => {
                                void handleCopyEmail();
                              }}
                              type="button"
                            >
                              Copiar email
                            </button>
                            <a
                              className="rounded-full border border-[#cfe0df] bg-[#eef8f7] px-4 py-3 text-sm font-semibold text-[#2c6160] transition hover:border-[#98b8b6]"
                              href={buildCrmReminderMailtoHref(
                                selectedReminderSummary.contact.email,
                                draft.renderedSubject || null,
                                draft.renderedBody,
                              )}
                            >
                              Abrir mailto
                            </a>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Acciones</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSavingReminder}
                        onClick={() => {
                          void handleSaveReminder();
                        }}
                        type="button"
                      >
                        {isSavingReminder ? "Guardando..." : "Guardar cambios"}
                      </button>
                      <button
                        className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSavingReminder}
                        onClick={() => {
                          void handleSaveReminder();
                        }}
                        type="button"
                      >
                        Reprogramar
                      </button>
                      <button
                        className="rounded-full border border-[#d8e3cf] bg-[#f3faf0] px-5 py-3 text-sm font-semibold text-[#476638] transition hover:border-[#9fb98f] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSendingManual}
                        onClick={() => {
                          void handleMarkSentManual();
                        }}
                        type="button"
                      >
                        {isSendingManual ? "Actualizando..." : "Marcar como enviado"}
                      </button>
                      <button
                        className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSkippingReminder}
                        onClick={() => {
                          void handleSkipReminder();
                        }}
                        type="button"
                      >
                        {isSkippingReminder ? "Omitiendo..." : "Saltar"}
                      </button>
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
        className="w-full rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="soft-panel rounded-[1.6rem] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">{label}</p>
      <p className="mt-3 font-serif text-4xl text-stone-900">{value}</p>
    </article>
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

function EmptyState({ message, title }: { message: string; title: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center">
      <p className="font-serif text-2xl text-stone-900">{title}</p>
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
