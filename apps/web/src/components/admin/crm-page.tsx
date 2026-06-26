"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { ArrowUpRightIcon, SearchIcon, WhatsAppIcon } from "@/components/shared/icons";
import {
  buildCrmContactName,
  buildCrmReminderMailtoHref,
  buildCrmReminderWhatsAppHref,
  buildCrmWhatsAppHref,
  CRM_LIFECYCLE_STATUS_OPTIONS,
  CRM_REMINDER_CHANNEL_OPTIONS,
  CRM_TASK_TYPE_OPTIONS,
  getCrmAgeRangeLabel,
  getCrmEventLabel,
  getCrmLifecycleStatusLabel,
  getCrmMainGoalLabel,
  getCrmReminderChannelLabel,
  getCrmReminderStatusLabel,
  getCrmReminderTypeLabel,
  getCrmSkinTypeLabel,
  getCrmSourceLabel,
  getCrmTaskStatusLabel,
  getCrmTaskTypeLabel,
  type CRMContactDetail,
  type CRMContactLifecycleStatus,
  type CRMContactTableSummary,
  type CRMContactUpdateInput,
  type CRMNote,
  type CRMReminderChannel,
  type CRMReminderDetail,
  type CRMTask,
  type CRMTaskStatus,
  type CRMTaskType,
  type PaginatedCRMContactsResponse,
} from "@/lib/admin-crm";
import { formatCurrency, formatDateTime } from "@/lib/format";

type ContactsApiResponse =
  | { ok: true; data: PaginatedCRMContactsResponse }
  | { ok: false; reason: string; message?: string };

type ContactDetailApiResponse =
  | { ok: true; data: CRMContactDetail }
  | { ok: false; reason: string; message?: string };

type NoteApiResponse =
  | { ok: true; data: CRMNote }
  | { ok: false; reason: string; message?: string };

type TaskApiResponse =
  | { ok: true; data: CRMTask }
  | { ok: false; reason: string; message?: string };

type ReminderApiResponse =
  | { ok: true; data: CRMReminderDetail }
  | { ok: false; reason: string; message?: string };

type Notice = {
  kind: "error" | "success";
  message: string;
} | null;

type DrawerTab = "summary" | "events" | "notes" | "tasks" | "reminders";
type LifecycleFilter = "all" | CRMContactLifecycleStatus;
type BooleanFilter = "all" | "true" | "false";
type SkinTypeFilter = "all" | "seca" | "mixta" | "grasa" | "sensible" | "no_segura";
type MainGoalFilter =
  | "all"
  | "manchas"
  | "acne"
  | "lineas_expresion"
  | "hidratacion"
  | "luminosidad"
  | "proteccion_solar";

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const SORT_OPTIONS = [
  { label: "Ultima actividad", value: "lastSeenAt" },
  { label: "Nombre", value: "contact" },
  { label: "Lifecycle", value: "lifecycleStatus" },
  { label: "Alta CRM", value: "createdAt" },
];

const skinTypeOptions: Array<{ label: string; value: SkinTypeFilter }> = [
  { value: "all", label: "Toda piel" },
  { value: "seca", label: "Seca" },
  { value: "mixta", label: "Mixta" },
  { value: "grasa", label: "Grasa" },
  { value: "sensible", label: "Sensible" },
  { value: "no_segura", label: "No estoy segura" },
];

const mainGoalOptions: Array<{ label: string; value: MainGoalFilter }> = [
  { value: "all", label: "Todo objetivo" },
  { value: "manchas", label: "Manchas" },
  { value: "acne", label: "Acne" },
  { value: "lineas_expresion", label: "Lineas de expresion" },
  { value: "hidratacion", label: "Hidratacion" },
  { value: "luminosidad", label: "Luminosidad" },
  { value: "proteccion_solar", label: "Proteccion solar" },
];

function getLoadMessage(reason: string | null, hasFilters: boolean) {
  if (!reason) {
    return hasFilters
      ? "No encontramos contactos con esos filtros. Ajusta la busqueda o limpia algunos criterios."
      : "Todavia no hay contactos CRM sincronizados desde Skin Quiz, checkout o importaciones.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para consultar el CRM real desde FastAPI.";
  }

  if (reason === "auth_failed") {
    return "Tu sesion de SuperAdmin no es valida o expiro. Vuelve a iniciar sesion.";
  }

  return "No fue posible cargar la base CRM por ahora. El panel mantiene un estado vacio amigable mientras la API no este disponible.";
}

function getLifecycleBadgeClasses(status: CRMContactLifecycleStatus) {
  switch (status) {
    case "customer":
      return "border-[#cfe0df] bg-[#eef8f7] text-[#2c6160]";
    case "repeat_customer":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "inactive":
      return "border-stone-200 bg-stone-100 text-stone-600";
    case "lead":
    default:
      return "border-[#ead9c8] bg-[#fff8f3] text-stone-800";
  }
}

function getMarketingBadgeClasses(value: boolean) {
  return value
    ? "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]"
    : "border-stone-200 bg-stone-100 text-stone-600";
}

function getTaskBadgeClasses(status: CRMTaskStatus) {
  switch (status) {
    case "done":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "cancelled":
      return "border-stone-200 bg-stone-100 text-stone-600";
    case "pending":
    default:
      return "border-[#ead9c8] bg-[#fff8f3] text-stone-800";
  }
}

function getReminderBadgeClasses(status: CRMReminderDetail["status"]) {
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
      return "border-[#ead9c8] bg-[#fff8f3] text-stone-800";
  }
}

function getChannelBadgeClasses(channel: CRMContactTableSummary["preferredChannel"]) {
  if (channel === "whatsapp") {
    return "border-[#cfe0df] bg-[#eef8f7] text-[#2c6160]";
  }
  if (channel === "email") {
    return "border-[#ead9c8] bg-[#fff8f3] text-stone-800";
  }
  return "border-stone-200 bg-white text-stone-500";
}

function getContactDisplayName(contact: Pick<CRMContactTableSummary, "email" | "firstName" | "lastName">) {
  return buildCrmContactName(contact) || contact.email || "Contacto sin nombre";
}

function getNextTask(tasks: CRMTask[]) {
  const pendingTasks = tasks
    .filter((task) => task.status === "pending")
    .slice()
    .sort((first, second) => {
      const firstTime = Date.parse(first.dueAt ?? first.createdAt);
      const secondTime = Date.parse(second.dueAt ?? second.createdAt);
      return firstTime - secondTime;
    });

  if (pendingTasks.length === 0) {
    return null;
  }

  const task = pendingTasks[0];
  return {
    dueAt: task.dueAt,
    id: task.id,
    status: task.status,
    taskType: task.taskType,
    title: task.title,
  };
}

function buildTableSummaryFromDetail(
  detail: CRMContactDetail,
  current: CRMContactTableSummary | null,
): CRMContactTableSummary {
  return {
    acceptedMarketing: detail.acceptedMarketing,
    ageRange: detail.ageRange,
    createdAt: detail.createdAt,
    email: detail.email,
    firstName: detail.firstName,
    firstSeenAt: detail.firstSeenAt,
    hasOrders: detail.purchaseSummary.orderCount > 0,
    id: detail.id,
    lastName: detail.lastName,
    lastSeenAt: detail.lastSeenAt,
    lifecycleStatus: detail.lifecycleStatus,
    mainGoal: detail.mainGoal,
    nextTask: getNextTask(detail.tasks),
    preferredChannel: detail.whatsapp ? "whatsapp" : detail.email ? "email" : current?.preferredChannel ?? null,
    skinType: detail.skinType,
    source: detail.source,
    updatedAt: detail.updatedAt,
    whatsapp: detail.whatsapp,
  };
}

export function CrmPage() {
  const [contacts, setContacts] = useState<CRMContactTableSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");
  const [skinTypeFilter, setSkinTypeFilter] = useState<SkinTypeFilter>("all");
  const [mainGoalFilter, setMainGoalFilter] = useState<MainGoalFilter>("all");
  const [marketingFilter, setMarketingFilter] = useState<BooleanFilter>("all");
  const [hasOrdersFilter, setHasOrdersFilter] = useState<BooleanFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState("lastSeenAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, CRMContactDetail>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [drawerNotice, setDrawerNotice] = useState<Notice>(null);
  const [activeTab, setActiveTab] = useState<DrawerTab>("summary");

  const [draftLifecycleStatus, setDraftLifecycleStatus] = useState<CRMContactLifecycleStatus>("lead");
  const [draftAcceptedMarketing, setDraftAcceptedMarketing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [noteDraft, setNoteDraft] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const [taskTitleDraft, setTaskTitleDraft] = useState("");
  const [taskDueAtDraft, setTaskDueAtDraft] = useState("");
  const [taskTypeDraft, setTaskTypeDraft] = useState<CRMTaskType>("manual");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskActionId, setTaskActionId] = useState<number | null>(null);

  const [reminderChannelDraft, setReminderChannelDraft] = useState<CRMReminderChannel>("whatsapp");
  const [reminderScheduledForDraft, setReminderScheduledForDraft] = useState("");
  const [reminderSubjectDraft, setReminderSubjectDraft] = useState("");
  const [reminderBodyDraft, setReminderBodyDraft] = useState("");
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

  const activeContact = selectedContactId ? detailCache[selectedContactId] ?? null : null;
  const hasFilters =
    deferredSearch.trim().length > 0 ||
    lifecycleFilter !== "all" ||
    skinTypeFilter !== "all" ||
    mainGoalFilter !== "all" ||
    marketingFilter !== "all" ||
    hasOrdersFilter !== "all";
  const hasProfileChanges = activeContact
    ? draftLifecycleStatus !== activeContact.lifecycleStatus ||
      draftAcceptedMarketing !== activeContact.acceptedMarketing
    : false;

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, hasOrdersFilter, lifecycleFilter, mainGoalFilter, marketingFilter, pageSize, skinTypeFilter, sortBy, sortDir]);

  useEffect(() => {
    let cancelled = false;

    async function loadContacts() {
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
        if (skinTypeFilter !== "all") {
          params.set("skin_type", skinTypeFilter);
        }
        if (mainGoalFilter !== "all") {
          params.set("main_goal", mainGoalFilter);
        }
        if (marketingFilter !== "all") {
          params.set("accepted_marketing", marketingFilter);
        }
        if (hasOrdersFilter !== "all") {
          params.set("has_orders", hasOrdersFilter);
        }

        const response = await fetch(`/api/admin/crm/contacts?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ContactsApiResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setContacts([]);
          setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
          setTotal(0);
          setTotalPages(1);
          return;
        }

        setContacts(payload.data.items);
        setErrorReason(null);
        setPage(payload.data.page);
        setTotal(payload.data.total);
        setTotalPages(Math.max(1, payload.data.totalPages));
      } catch {
        if (!cancelled) {
          setContacts([]);
          setErrorReason("fetch_failed");
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadContacts();
    return () => {
      cancelled = true;
    };
  }, [deferredSearch, hasOrdersFilter, lifecycleFilter, mainGoalFilter, marketingFilter, page, pageSize, skinTypeFilter, sortBy, sortDir]);

  useEffect(() => {
    if (!activeContact) {
      return;
    }

    setDraftLifecycleStatus(activeContact.lifecycleStatus);
    setDraftAcceptedMarketing(activeContact.acceptedMarketing);
  }, [activeContact]);

  useEffect(() => {
    setActiveTab("summary");
    setDrawerNotice(null);
    setDetailError(null);
    setNoteDraft("");
    setTaskTitleDraft("");
    setTaskDueAtDraft("");
    setTaskTypeDraft("manual");
    setReminderChannelDraft("whatsapp");
    setReminderScheduledForDraft("");
    setReminderSubjectDraft("");
    setReminderBodyDraft("");
  }, [selectedContactId]);

  function mergeSummary(detail: CRMContactDetail) {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === detail.id ? buildTableSummaryFromDetail(detail, contact) : contact,
      ),
    );
  }

  async function loadContactDetail(contactId: number, force = false) {
    if (!force && detailCache[contactId]) {
      return detailCache[contactId];
    }

    setIsDetailLoading(true);
    setDetailError(null);

    try {
      const response = await fetch(`/api/admin/crm/contacts/${contactId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ContactDetailApiResponse;

      if (!response.ok || !payload.ok) {
        setDetailError(payload.ok ? "fetch_failed" : payload.reason);
        return null;
      }

      setDetailCache((current) => ({
        ...current,
        [contactId]: payload.data,
      }));
      mergeSummary(payload.data);
      return payload.data;
    } catch {
      setDetailError("fetch_failed");
      return null;
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleOpenDetail(contactId: number) {
    setSelectedContactId(contactId);
    await loadContactDetail(contactId);
  }

  async function handleSaveProfile() {
    if (!activeContact) {
      return;
    }

    if (!hasProfileChanges) {
      setDrawerNotice({
        kind: "success",
        message: "No hay cambios pendientes en el perfil CRM.",
      });
      return;
    }

    const payload: CRMContactUpdateInput = {};
    if (draftLifecycleStatus !== activeContact.lifecycleStatus) {
      payload.lifecycleStatus = draftLifecycleStatus;
    }
    if (draftAcceptedMarketing !== activeContact.acceptedMarketing) {
      payload.acceptedMarketing = draftAcceptedMarketing;
    }

    setIsSavingProfile(true);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/crm/contacts/${activeContact.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ContactDetailApiResponse;

      if (!response.ok || !result.ok) {
        setDrawerNotice({
          kind: "error",
          message: result.ok ? "No pudimos guardar el perfil CRM." : result.message ?? "No pudimos guardar el perfil CRM.",
        });
        return;
      }

      setDetailCache((current) => ({
        ...current,
        [activeContact.id]: result.data,
      }));
      mergeSummary(result.data);
      setDrawerNotice({
        kind: "success",
        message: "Perfil CRM actualizado correctamente.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos guardar el perfil CRM por ahora.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function refreshSelectedContact(contactId: number) {
    const refreshed = await loadContactDetail(contactId, true);
    if (refreshed) {
      setDetailCache((current) => ({
        ...current,
        [contactId]: refreshed,
      }));
      mergeSummary(refreshed);
    }
  }

  async function handleCreateNote() {
    if (!activeContact) {
      return;
    }

    if (noteDraft.trim().length < 2) {
      setDrawerNotice({
        kind: "error",
        message: "Escribe una nota con al menos 2 caracteres.",
      });
      return;
    }

    setIsSubmittingNote(true);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/crm/contacts/${activeContact.id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note: noteDraft.trim() }),
      });
      const payload = (await response.json()) as NoteApiResponse;

      if (!response.ok || !payload.ok) {
        setDrawerNotice({
          kind: "error",
          message: "No pudimos guardar la nota interna.",
        });
        return;
      }

      setNoteDraft("");
      await refreshSelectedContact(activeContact.id);
      setDrawerNotice({
        kind: "success",
        message: "Nota interna creada.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos guardar la nota interna.",
      });
    } finally {
      setIsSubmittingNote(false);
    }
  }

  async function handleCreateTask() {
    if (!activeContact) {
      return;
    }

    if (taskTitleDraft.trim().length < 2) {
      setDrawerNotice({
        kind: "error",
        message: "Escribe un titulo de tarea con al menos 2 caracteres.",
      });
      return;
    }

    setIsSubmittingTask(true);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/crm/contacts/${activeContact.id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dueAt: taskDueAtDraft ? new Date(taskDueAtDraft).toISOString() : null,
          taskType: taskTypeDraft,
          title: taskTitleDraft.trim(),
        }),
      });
      const payload = (await response.json()) as TaskApiResponse;

      if (!response.ok || !payload.ok) {
        setDrawerNotice({
          kind: "error",
          message: "No pudimos crear la tarea por ahora.",
        });
        return;
      }

      setTaskTitleDraft("");
      setTaskDueAtDraft("");
      setTaskTypeDraft("manual");
      await refreshSelectedContact(activeContact.id);
      setDrawerNotice({
        kind: "success",
        message: "Tarea creada correctamente.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos crear la tarea por ahora.",
      });
    } finally {
      setIsSubmittingTask(false);
    }
  }

  async function handleTaskStatusChange(taskId: number, status: CRMTaskStatus) {
    if (!activeContact) {
      return;
    }

    setTaskActionId(taskId);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/crm/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as TaskApiResponse;

      if (!response.ok || !payload.ok) {
        setDrawerNotice({
          kind: "error",
          message: "No pudimos actualizar la tarea.",
        });
        return;
      }

      await refreshSelectedContact(activeContact.id);
      setDrawerNotice({
        kind: "success",
        message: "Tarea actualizada.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos actualizar la tarea.",
      });
    } finally {
      setTaskActionId(null);
    }
  }

  async function handleCreateReminder() {
    if (!activeContact) {
      return;
    }

    if (reminderBodyDraft.trim().length < 2) {
      setDrawerNotice({
        kind: "error",
        message: "Escribe un mensaje de recordatorio con al menos 2 caracteres.",
      });
      return;
    }

    const scheduledDate = reminderScheduledForDraft ? new Date(reminderScheduledForDraft) : null;
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
      setDrawerNotice({
        kind: "error",
        message: "Selecciona una fecha valida para programar el recordatorio.",
      });
      return;
    }

    setIsSubmittingReminder(true);
    setDrawerNotice(null);

    try {
      const response = await fetch(`/api/admin/crm/contacts/${activeContact.id}/reminders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: reminderChannelDraft,
          renderedBody: reminderBodyDraft.trim(),
          renderedSubject: reminderChannelDraft === "email" ? reminderSubjectDraft.trim() || null : null,
          scheduledFor: scheduledDate.toISOString(),
        }),
      });
      const payload = (await response.json()) as ReminderApiResponse;

      if (!response.ok || !payload.ok) {
        setDrawerNotice({
          kind: "error",
          message: "No pudimos crear el recordatorio manual.",
        });
        return;
      }

      setReminderChannelDraft("whatsapp");
      setReminderScheduledForDraft("");
      setReminderSubjectDraft("");
      setReminderBodyDraft("");
      await refreshSelectedContact(activeContact.id);
      setDrawerNotice({
        kind: "success",
        message: "Recordatorio manual creado.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos crear el recordatorio manual.",
      });
    } finally {
      setIsSubmittingReminder(false);
    }
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, page * pageSize);

  return (
    <>
      <div className="space-y-5">
        <section className="soft-panel rounded-[1.5rem] p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">CRM</p>
              <h1 className="mt-2 font-serif text-3xl text-stone-900 sm:text-[2.4rem]">Operacion comercial escalable</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                Tabla compacta, filtros server-side y drawer por tabs para seguir 10,000+ contactos sin saturar la vista.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetricPill label="Total" value={String(total)} />
              <MetricPill label="Mostrando" value={`${rangeStart}-${rangeEnd}`} />
              <MetricPill label="Pagina" value={`${page}/${Math.max(1, totalPages)}`} />
            </div>
          </div>

          <div className="mt-5 grid gap-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(6,minmax(0,1fr))]">
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
              label="Lifecycle"
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
              label="Piel"
              onChange={(value) => {
                setSkinTypeFilter(value as SkinTypeFilter);
              }}
              options={skinTypeOptions}
              value={skinTypeFilter}
            />
            <FilterSelect
              label="Objetivo"
              onChange={(value) => {
                setMainGoalFilter(value as MainGoalFilter);
              }}
              options={mainGoalOptions}
              value={mainGoalFilter}
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
            <div className="grid gap-3 sm:grid-cols-3 xl:col-span-2">
              <FilterSelect
                label="Orden"
                onChange={(value) => {
                  setSortBy(value);
                }}
                options={SORT_OPTIONS}
                value={sortBy}
              />
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
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Canal</th>
                    <th className="px-4 py-3">Lifecycle</th>
                    <th className="px-4 py-3">Piel</th>
                    <th className="px-4 py-3">Objetivo</th>
                    <th className="px-4 py-3">Marketing</th>
                    <th className="px-4 py-3">Ultima actividad</th>
                    <th className="px-4 py-3">Proxima tarea</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, index) => <SkeletonRow key={index} />)
                  ) : contacts.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10" colSpan={9}>
                        <EmptyBlock message={getLoadMessage(errorReason, hasFilters)} />
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr className="align-top transition hover:bg-[#fffdfb]" key={contact.id}>
                        <td className="px-4 py-3">
                          <button
                            className="text-left"
                            onClick={() => {
                              void handleOpenDetail(contact.id);
                            }}
                            type="button"
                          >
                            <p className="font-semibold text-stone-900">{getContactDisplayName(contact)}</p>
                            <p className="mt-1 text-xs text-stone-500">
                              {contact.email ?? "Sin email"}
                              {contact.whatsapp ? ` / ${contact.whatsapp}` : ""}
                            </p>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getChannelBadgeClasses(contact.preferredChannel)}`}>
                            {contact.preferredChannel ? getCrmReminderChannelLabel(contact.preferredChannel) : "Sin canal"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getLifecycleBadgeClasses(contact.lifecycleStatus)}`}>
                            {getCrmLifecycleStatusLabel(contact.lifecycleStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">{getCrmSkinTypeLabel(contact.skinType)}</td>
                        <td className="px-4 py-3 text-sm text-stone-600">{getCrmMainGoalLabel(contact.mainGoal)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getMarketingBadgeClasses(contact.acceptedMarketing)}`}>
                            {contact.acceptedMarketing ? "Aceptado" : "No"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">{formatDateTime(contact.lastSeenAt)}</td>
                        <td className="px-4 py-3">
                          {contact.nextTask ? (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-stone-900">{contact.nextTask.title}</p>
                              <p className="text-xs text-stone-500">
                                {getCrmTaskTypeLabel(contact.nextTask.taskType)}
                                {contact.nextTask.dueAt ? ` / ${formatDateTime(contact.nextTask.dueAt)}` : ""}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-500">Sin tarea pendiente</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500"
                            onClick={() => {
                              void handleOpenDetail(contact.id);
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
            disabled={isLoading || contacts.length === 0}
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

      {selectedContactId ? (
        <div className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-[2px]">
          <div className="absolute inset-y-0 right-0 flex w-full justify-end">
            <button
              aria-label="Cerrar detalle"
              className="hidden flex-1 cursor-default lg:block"
              onClick={() => {
                setSelectedContactId(null);
                setDrawerNotice(null);
              }}
              type="button"
            />
            <aside className="flex h-full w-full max-w-[1120px] flex-col overflow-y-auto border-l border-stone-200 bg-[#fcfaf8] px-4 py-4 shadow-2xl sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Detalle CRM</p>
                  <h2 className="mt-2 font-serif text-2xl text-stone-900 sm:text-[2rem]">
                    {activeContact ? getContactDisplayName(activeContact) : `Contacto #${selectedContactId}`}
                  </h2>
                  {activeContact ? (
                    <p className="mt-2 text-sm text-stone-600">
                      {activeContact.email ?? "Sin email"}
                      {activeContact.whatsapp ? ` / ${activeContact.whatsapp}` : ""}
                    </p>
                  ) : null}
                </div>
                <button
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-500"
                  onClick={() => {
                    setSelectedContactId(null);
                    setDrawerNotice(null);
                  }}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              {drawerNotice ? <NoticeBanner className="mt-5" notice={drawerNotice} /> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <DrawerTabButton
                  active={activeTab === "summary"}
                  count={null}
                  label="Resumen"
                  onClick={() => {
                    setActiveTab("summary");
                  }}
                />
                <DrawerTabButton
                  active={activeTab === "events"}
                  count={activeContact?.events.length ?? null}
                  label="Eventos"
                  onClick={() => {
                    setActiveTab("events");
                  }}
                />
                <DrawerTabButton
                  active={activeTab === "notes"}
                  count={activeContact?.notes.length ?? null}
                  label="Notas"
                  onClick={() => {
                    setActiveTab("notes");
                  }}
                />
                <DrawerTabButton
                  active={activeTab === "tasks"}
                  count={activeContact?.tasks.length ?? null}
                  label="Tareas"
                  onClick={() => {
                    setActiveTab("tasks");
                  }}
                />
                <DrawerTabButton
                  active={activeTab === "reminders"}
                  count={activeContact?.reminders.length ?? null}
                  label="Recordatorios"
                  onClick={() => {
                    setActiveTab("reminders");
                  }}
                />
              </div>

              {isDetailLoading && !activeContact ? (
                <EmptyBlock className="mt-6" message="Cargando detalle del contacto..." />
              ) : detailError && !activeContact ? (
                <EmptyBlock className="mt-6" message="No pudimos cargar el detalle del contacto." />
              ) : activeContact ? (
                <div className="mt-5 space-y-4 pb-8">
                  {activeTab === "summary" ? (
                    <>
                      <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <MetaPill label="Lifecycle" value={getCrmLifecycleStatusLabel(activeContact.lifecycleStatus)} />
                          <MetaPill label="Origen" value={getCrmSourceLabel(activeContact.source)} />
                          <MetaPill label="Edad" value={getCrmAgeRangeLabel(activeContact.ageRange)} />
                          <MetaPill label="Marketing" value={activeContact.acceptedMarketing ? "Aceptado" : "No aceptado"} />
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          {activeContact.whatsapp ? (
                            <a
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cfe0df] bg-[#eef8f7] px-5 py-3 text-sm font-semibold text-[#2c6160] transition hover:border-[#98b8b6]"
                              href={buildCrmWhatsAppHref(activeContact.whatsapp, activeContact.firstName)}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <WhatsAppIcon className="h-4 w-4" />
                              WhatsApp
                            </a>
                          ) : null}
                          {activeContact.email ? (
                            <a
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500"
                              href={`mailto:${activeContact.email}`}
                            >
                              <ArrowUpRightIcon className="h-4 w-4" />
                              Email
                            </a>
                          ) : null}
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <MetaPill label="Tipo de piel" value={getCrmSkinTypeLabel(activeContact.skinType)} />
                          <MetaPill label="Objetivo" value={getCrmMainGoalLabel(activeContact.mainGoal)} />
                          <MetaPill label="Primera actividad" value={formatDateTime(activeContact.firstSeenAt)} />
                          <MetaPill label="Ultima actividad" value={formatDateTime(activeContact.lastSeenAt)} />
                        </div>
                      </section>

                      <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Perfil editable</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="space-y-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Lifecycle</span>
                                <select
                                  className="w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                                  onChange={(event) => {
                                    setDraftLifecycleStatus(event.target.value as CRMContactLifecycleStatus);
                                  }}
                                  value={draftLifecycleStatus}
                                >
                                  {CRM_LIFECYCLE_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex items-center gap-3 rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-800">
                                <input
                                  checked={draftAcceptedMarketing}
                                  className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-300"
                                  onChange={(event) => {
                                    setDraftAcceptedMarketing(event.target.checked);
                                  }}
                                  type="checkbox"
                                />
                                Acepta marketing
                              </label>
                            </div>
                          </div>
                          <button
                            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSavingProfile}
                            onClick={() => {
                              void handleSaveProfile();
                            }}
                            type="button"
                          >
                            {isSavingProfile ? "Guardando..." : hasProfileChanges ? "Guardar cambios" : "Sin cambios"}
                          </button>
                        </div>
                      </section>

                      <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Resumen comercial</p>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <MetaPill label="Pedidos" value={String(activeContact.purchaseSummary.orderCount)} />
                          <MetaPill label="Total gastado" value={formatCurrency(activeContact.purchaseSummary.totalSpent)} />
                          <MetaPill
                            label="Ultima compra"
                            value={
                              activeContact.purchaseSummary.lastOrderAt
                                ? formatDateTime(activeContact.purchaseSummary.lastOrderAt)
                                : "Sin compra"
                            }
                          />
                          <MetaPill
                            label="Ultima orden"
                            value={activeContact.purchaseSummary.lastOrderNumber ?? "Sin orden"}
                          />
                        </div>
                      </section>
                    </>
                  ) : null}

                  {activeTab === "events" ? (
                    <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Eventos</p>
                          <h3 className="mt-2 font-serif text-[1.6rem] text-stone-900">Linea de tiempo reciente</h3>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {activeContact.events.length === 0 ? (
                          <EmptyBlock message="Todavia no hay eventos CRM registrados para este contacto." />
                        ) : (
                          activeContact.events.map((event) => (
                            <article className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4" key={event.id}>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-stone-900">{getCrmEventLabel(event.eventType)}</p>
                                  <p className="mt-1 text-xs leading-6 text-stone-500">{getCrmSourceLabel(event.source)}</p>
                                </div>
                                <span className="text-xs text-stone-500">{formatDateTime(event.createdAt)}</span>
                              </div>
                              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-[1rem] bg-white px-3 py-3 text-xs leading-6 text-stone-600">
                                {JSON.stringify(event.payloadJson, null, 2)}
                              </pre>
                            </article>
                          ))
                        )}
                      </div>
                    </section>
                  ) : null}

                  {activeTab === "notes" ? (
                    <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Notas</p>
                        <h3 className="mt-2 font-serif text-[1.6rem] text-stone-900">Seguimiento interno</h3>
                      </div>

                      <div className="mt-5 space-y-3">
                        {activeContact.notes.length === 0 ? (
                          <EmptyBlock message="Todavia no hay notas internas para este contacto." />
                        ) : (
                          activeContact.notes.map((note) => (
                            <article className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4" key={note.id}>
                              <p className="text-sm leading-7 text-stone-800">{note.note}</p>
                              <p className="mt-2 text-xs text-stone-500">{formatDateTime(note.createdAt)}</p>
                            </article>
                          ))
                        )}
                      </div>

                      <div className="mt-5 grid gap-3">
                        <textarea
                          className="min-h-32 w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition focus:border-stone-500"
                          maxLength={4000}
                          onChange={(event) => {
                            setNoteDraft(event.target.value);
                          }}
                          placeholder="Ejemplo: pidio seguimiento por WhatsApp en horario vespertino."
                          value={noteDraft}
                        />
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-stone-500">{noteDraft.length}/4000 caracteres</p>
                          <button
                            className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSubmittingNote}
                            onClick={() => {
                              void handleCreateNote();
                            }}
                            type="button"
                          >
                            {isSubmittingNote ? "Guardando..." : "Crear nota"}
                          </button>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {activeTab === "tasks" ? (
                    <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Tareas</p>
                        <h3 className="mt-2 font-serif text-[1.6rem] text-stone-900">Pendientes comerciales</h3>
                      </div>

                      <div className="mt-5 space-y-3">
                        {activeContact.tasks.length === 0 ? (
                          <EmptyBlock message="Todavia no hay tareas para este contacto." />
                        ) : (
                          activeContact.tasks.map((task) => (
                            <article className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4" key={task.id}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-stone-900">{task.title}</p>
                                  <p className="mt-1 text-xs leading-6 text-stone-500">
                                    {getCrmTaskTypeLabel(task.taskType)}
                                    {task.dueAt ? ` / vence ${formatDateTime(task.dueAt)}` : ""}
                                  </p>
                                </div>
                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getTaskBadgeClasses(task.status)}`}>
                                  {getCrmTaskStatusLabel(task.status)}
                                </span>
                              </div>

                              {task.status === "pending" ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    className="rounded-full border border-[#d8e3cf] bg-[#f3faf0] px-4 py-2 text-xs font-semibold text-[#476638] transition hover:border-[#9fb98f] disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={taskActionId === task.id}
                                    onClick={() => {
                                      void handleTaskStatusChange(task.id, "done");
                                    }}
                                    type="button"
                                  >
                                    {taskActionId === task.id ? "Actualizando..." : "Marcar hecha"}
                                  </button>
                                  <button
                                    className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={taskActionId === task.id}
                                    onClick={() => {
                                      void handleTaskStatusChange(task.id, "cancelled");
                                    }}
                                    type="button"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <p className="mt-3 text-xs text-stone-500">
                                  {task.completedAt ? `Actualizada ${formatDateTime(task.completedAt)}` : "Sin fecha de cierre"}
                                </p>
                              )}
                            </article>
                          ))
                        )}
                      </div>

                      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
                        <input
                          className="rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                          onChange={(event) => {
                            setTaskTitleDraft(event.target.value);
                          }}
                          placeholder="Titulo de la tarea"
                          value={taskTitleDraft}
                        />
                        <input
                          className="rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                          onChange={(event) => {
                            setTaskDueAtDraft(event.target.value);
                          }}
                          type="datetime-local"
                          value={taskDueAtDraft}
                        />
                        <select
                          className="rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                          onChange={(event) => {
                            setTaskTypeDraft(event.target.value as CRMTaskType);
                          }}
                          value={taskTypeDraft}
                        >
                          {CRM_TASK_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isSubmittingTask}
                          onClick={() => {
                            void handleCreateTask();
                          }}
                          type="button"
                        >
                          {isSubmittingTask ? "Creando..." : "Crear tarea"}
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {activeTab === "reminders" ? (
                    <section className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-soft">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Recordatorios</p>
                        <h3 className="mt-2 font-serif text-[1.6rem] text-stone-900">Seguimiento multicanal</h3>
                      </div>

                      <div className="mt-5 space-y-3">
                        {activeContact.reminders.length === 0 ? (
                          <EmptyBlock message="Todavia no hay recordatorios programados para este contacto." />
                        ) : (
                          activeContact.reminders.map((reminder) => (
                            <article className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4" key={reminder.id}>
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-stone-900">
                                    {getCrmReminderTypeLabel(reminder.reminderType)}
                                  </p>
                                  <p className="mt-1 text-xs leading-6 text-stone-500">
                                    {getCrmReminderChannelLabel(reminder.channel)}
                                    {` / ${formatDateTime(reminder.scheduledFor)}`}
                                  </p>
                                </div>
                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getReminderBadgeClasses(reminder.status)}`}>
                                  {getCrmReminderStatusLabel(reminder.status)}
                                </span>
                              </div>

                              {reminder.renderedSubject ? (
                                <p className="mt-3 text-sm font-semibold text-stone-900">{reminder.renderedSubject}</p>
                              ) : null}
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-700">{reminder.renderedBody}</p>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {reminder.channel === "whatsapp" && activeContact.whatsapp ? (
                                  <a
                                    className="rounded-full border border-[#cfe0df] bg-[#eef8f7] px-4 py-2 text-xs font-semibold text-[#2c6160] transition hover:border-[#98b8b6]"
                                    href={buildCrmReminderWhatsAppHref(activeContact.whatsapp, reminder.renderedBody)}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    Abrir WhatsApp
                                  </a>
                                ) : null}
                                {reminder.channel === "email" && activeContact.email ? (
                                  <a
                                    className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-500"
                                    href={buildCrmReminderMailtoHref(activeContact.email, reminder.renderedSubject, reminder.renderedBody)}
                                  >
                                    Abrir email
                                  </a>
                                ) : null}
                              </div>
                            </article>
                          ))
                        )}
                      </div>

                      <div className="mt-5 grid gap-3">
                        <div className="grid gap-3 lg:grid-cols-[220px_220px_1fr]">
                          <select
                            className="rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                            onChange={(event) => {
                              setReminderChannelDraft(event.target.value as CRMReminderChannel);
                            }}
                            value={reminderChannelDraft}
                          >
                            {CRM_REMINDER_CHANNEL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            className="rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                            onChange={(event) => {
                              setReminderScheduledForDraft(event.target.value);
                            }}
                            type="datetime-local"
                            value={reminderScheduledForDraft}
                          />
                          <input
                            className="rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                            onChange={(event) => {
                              setReminderSubjectDraft(event.target.value);
                            }}
                            placeholder="Subject opcional para email"
                            value={reminderSubjectDraft}
                          />
                        </div>
                        <textarea
                          className="min-h-28 w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition focus:border-stone-500"
                          maxLength={4000}
                          onChange={(event) => {
                            setReminderBodyDraft(event.target.value);
                          }}
                          placeholder="Mensaje manual de seguimiento."
                          value={reminderBodyDraft}
                        />
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-stone-500">{reminderBodyDraft.length}/4000 caracteres</p>
                          <button
                            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSubmittingReminder}
                            onClick={() => {
                              void handleCreateReminder();
                            }}
                            type="button"
                          >
                            {isSubmittingReminder ? "Creando..." : "Crear recordatorio"}
                          </button>
                        </div>
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DrawerTabButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number | null;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
        active
          ? "border-stone-900 bg-stone-900 text-white"
          : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
      }`}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      {count !== null ? (
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-white/15 text-white" : "bg-stone-100 text-stone-600"}`}>
          {count}
        </span>
      ) : null}
    </button>
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
      <p>{total} contactos encontrados</p>
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
    <div className={`${className} rounded-[1.2rem] border border-dashed border-stone-300 bg-white px-4 py-5 text-sm leading-6 text-stone-500`}>
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
