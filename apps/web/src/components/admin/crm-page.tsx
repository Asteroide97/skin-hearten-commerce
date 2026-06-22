"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ArrowUpRightIcon,
  SearchIcon,
  WhatsAppIcon,
} from "@/components/shared/icons";
import {
  getCrmAgeRangeLabel,
  buildCrmReminderMailtoHref,
  buildCrmReminderWhatsAppHref,
  buildCrmContactName,
  buildCrmWhatsAppHref,
  CRM_LIFECYCLE_STATUS_OPTIONS,
  CRM_REMINDER_CHANNEL_OPTIONS,
  CRM_TASK_TYPE_OPTIONS,
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
  type CRMReminderChannel,
  type CRMReminderDetail,
  type CRMContactLifecycleStatus,
  type CRMContactSummary,
  type CRMContactUpdateInput,
  type CRMNote,
  type CRMTask,
  type CRMTaskStatus,
  type CRMTaskType,
} from "@/lib/admin-crm";
import { formatCurrency, formatDateTime } from "@/lib/format";

type ContactsApiResponse =
  | { ok: true; data: CRMContactSummary[] }
  | { ok: false; reason: string };

type ContactDetailApiResponse =
  | { ok: true; data: CRMContactDetail }
  | { ok: false; reason: string };

type NoteApiResponse =
  | { ok: true; data: CRMNote }
  | { ok: false; reason: string };

type TaskApiResponse =
  | { ok: true; data: CRMTask }
  | { ok: false; reason: string };

type ReminderApiResponse =
  | { ok: true; data: CRMReminderDetail }
  | { ok: false; reason: string };

type Notice = {
  kind: "error" | "success";
  message: string;
} | null;

type LifecycleFilter = "all" | CRMContactLifecycleStatus;
type MarketingFilter = "all" | "true" | "false";
type SkinTypeFilter = "all" | "seca" | "mixta" | "grasa" | "sensible" | "no_segura";
type MainGoalFilter =
  | "all"
  | "manchas"
  | "acne"
  | "lineas_expresion"
  | "hidratacion"
  | "luminosidad"
  | "proteccion_solar";

type FiltersState = {
  lifecycleStatus: LifecycleFilter;
  mainGoal: MainGoalFilter;
  marketingAccepted: MarketingFilter;
  search: string;
  skinType: SkinTypeFilter;
};

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

const marketingOptions: Array<{ label: string; value: MarketingFilter }> = [
  { value: "all", label: "Marketing: todos" },
  { value: "true", label: "Acepto marketing" },
  { value: "false", label: "Sin consentimiento" },
];

function getLoadMessage(reason: string | null, hasFilters: boolean) {
  if (!reason) {
    return hasFilters
      ? "No encontramos contactos con esos filtros. Prueba otra busqueda o limpia algunos criterios."
      : "Aun no hay contactos CRM sincronizados desde Skin Quiz o checkout.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para consultar la base CRM desde el panel admin.";
  }

  if (reason === "auth_failed") {
    return "No pudimos autenticar el panel admin contra la API local. Revisa las credenciales mock o las variables del entorno.";
  }

  return "No fue posible cargar el CRM por ahora. El panel mantiene un estado vacio amigable mientras la API local no este disponible.";
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
      return "border-[#e7d3c1] bg-[#fff8f3] text-stone-800";
  }
}

function getTaskBadgeClasses(status: CRMTaskStatus) {
  switch (status) {
    case "done":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "cancelled":
      return "border-stone-200 bg-stone-100 text-stone-600";
    case "pending":
    default:
      return "border-[#e7d3c1] bg-[#fff8f3] text-stone-800";
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
      return "border-[#e7d3c1] bg-[#fff8f3] text-stone-800";
  }
}

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function buildSummaryFromDetail(detail: CRMContactDetail): CRMContactSummary {
  return {
    acceptedMarketing: detail.acceptedMarketing,
    ageRange: detail.ageRange,
    createdAt: detail.createdAt,
    email: detail.email,
    firstName: detail.firstName,
    firstSeenAt: detail.firstSeenAt,
    id: detail.id,
    lastName: detail.lastName,
    lastSeenAt: detail.lastSeenAt,
    lifecycleStatus: detail.lifecycleStatus,
    mainGoal: detail.mainGoal,
    skinType: detail.skinType,
    source: detail.source,
    updatedAt: detail.updatedAt,
    whatsapp: detail.whatsapp,
  };
}

export function CrmPage() {
  const [contacts, setContacts] = useState<CRMContactSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<Notice>(null);

  const [searchValue, setSearchValue] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");
  const [skinTypeFilter, setSkinTypeFilter] = useState<SkinTypeFilter>("all");
  const [mainGoalFilter, setMainGoalFilter] = useState<MainGoalFilter>("all");
  const [marketingFilter, setMarketingFilter] = useState<MarketingFilter>("all");

  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, CRMContactDetail>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [drawerNotice, setDrawerNotice] = useState<Notice>(null);

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

  const activeContact = selectedContactId ? detailCache[selectedContactId] : null;
  const hasFilters =
    searchValue.trim().length > 0 ||
    lifecycleFilter !== "all" ||
    skinTypeFilter !== "all" ||
    mainGoalFilter !== "all" ||
    marketingFilter !== "all";
  const contactCountLabel = contacts.length === 1 ? "1 contacto" : `${contacts.length} contactos`;
  const hasProfileChanges = activeContact
    ? draftLifecycleStatus !== activeContact.lifecycleStatus ||
      draftAcceptedMarketing !== activeContact.acceptedMarketing
    : false;

  const loadContacts = useCallback(async (filters: FiltersState) => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filters.search.trim().length > 0) {
      params.set("search", filters.search.trim());
    }
    if (filters.lifecycleStatus !== "all") {
      params.set("lifecycle_status", filters.lifecycleStatus);
    }
    if (filters.skinType !== "all") {
      params.set("skin_type", filters.skinType);
    }
    if (filters.mainGoal !== "all") {
      params.set("main_goal", filters.mainGoal);
    }
    if (filters.marketingAccepted !== "all") {
      params.set("accepted_marketing", filters.marketingAccepted);
    }

    try {
      const requestUrl = params.size > 0 ? `/api/admin/crm/contacts?${params.toString()}` : "/api/admin/crm/contacts";
      const response = await fetch(requestUrl, { cache: "no-store" });
      const payload = (await response.json()) as ContactsApiResponse;

      if (!response.ok || !payload.ok) {
        setContacts([]);
        setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
        return;
      }

      setContacts(payload.data);
      setErrorReason(null);
    } catch {
      setContacts([]);
      setErrorReason("fetch_failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function loadContactDetail(contactId: number, force = false) {
    if (!force && detailCache[contactId]) {
      return;
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
        return;
      }

      setDetailCache((current) => ({
        ...current,
        [contactId]: payload.data,
      }));
    } catch {
      setDetailError("fetch_failed");
    } finally {
      setIsDetailLoading(false);
    }
  }

  function mergeUpdatedContact(updatedContact: CRMContactDetail) {
    setDetailCache((current) => ({
      ...current,
      [updatedContact.id]: updatedContact,
    }));
    setContacts((current) =>
      current.map((contact) => (contact.id === updatedContact.id ? buildSummaryFromDetail(updatedContact) : contact)),
    );
  }

  async function handleOpenDetail(contactId: number) {
    setSelectedContactId(contactId);
    setDrawerNotice(null);
    await loadContactDetail(contactId);
  }

  async function handleSaveProfile() {
    if (!activeContact) {
      return;
    }

    if (!hasProfileChanges) {
      setDrawerNotice({
        kind: "success",
        message: "No habia cambios por guardar en el perfil del contacto.",
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
          message: "No pudimos guardar el perfil. El drawer sigue abierto para que no pierdas contexto.",
        });
        return;
      }

      mergeUpdatedContact(result.data);
      setDrawerNotice({
        kind: "success",
        message: "Perfil CRM actualizado correctamente.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos guardar el perfil. Reintenta cuando la API local este disponible.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleCreateNote() {
    if (!activeContact) {
      return;
    }

    if (noteDraft.trim().length < 2) {
      setDrawerNotice({
        kind: "error",
        message: "Escribe una nota interna con al menos 2 caracteres.",
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
          message: "No pudimos guardar la nota por ahora.",
        });
        return;
      }

      setDetailCache((current) => {
        const currentContact = current[activeContact.id];
        if (!currentContact) {
          return current;
        }

        return {
          ...current,
          [activeContact.id]: {
            ...currentContact,
            notes: [payload.data, ...currentContact.notes],
          },
        };
      });
      setNoteDraft("");
      setDrawerNotice({
        kind: "success",
        message: "Nota interna creada.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos guardar la nota por ahora.",
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
          title: taskTitleDraft.trim(),
          dueAt: taskDueAtDraft ? new Date(taskDueAtDraft).toISOString() : null,
          taskType: taskTypeDraft,
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

      setDetailCache((current) => {
        const currentContact = current[activeContact.id];
        if (!currentContact) {
          return current;
        }

        return {
          ...current,
          [activeContact.id]: {
            ...currentContact,
            tasks: [payload.data, ...currentContact.tasks],
          },
        };
      });
      setTaskTitleDraft("");
      setTaskDueAtDraft("");
      setTaskTypeDraft("manual");
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
          message: "No pudimos crear el recordatorio manual por ahora.",
        });
        return;
      }

      setDetailCache((current) => {
        const currentContact = current[activeContact.id];
        if (!currentContact) {
          return current;
        }

        return {
          ...current,
          [activeContact.id]: {
            ...currentContact,
            reminders: [payload.data, ...currentContact.reminders],
          },
        };
      });
      setReminderChannelDraft("whatsapp");
      setReminderScheduledForDraft("");
      setReminderSubjectDraft("");
      setReminderBodyDraft("");
      setDrawerNotice({
        kind: "success",
        message: "Recordatorio manual creado correctamente.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos crear el recordatorio manual por ahora.",
      });
    } finally {
      setIsSubmittingReminder(false);
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
          message: "No pudimos actualizar la tarea por ahora.",
        });
        return;
      }

      setDetailCache((current) => {
        const currentContact = current[activeContact.id];
        if (!currentContact) {
          return current;
        }

        return {
          ...current,
          [activeContact.id]: {
            ...currentContact,
            tasks: currentContact.tasks.map((task) => (task.id === taskId ? payload.data : task)),
          },
        };
      });
      setDrawerNotice({
        kind: "success",
        message: "Tarea actualizada.",
      });
    } catch {
      setDrawerNotice({
        kind: "error",
        message: "No pudimos actualizar la tarea por ahora.",
      });
    } finally {
      setTaskActionId(null);
    }
  }

  useEffect(() => {
    void loadContacts({
      lifecycleStatus: "all",
      mainGoal: "all",
      marketingAccepted: "all",
      search: "",
      skinType: "all",
    });
  }, [loadContacts]);

  useEffect(() => {
    if (!activeContact) {
      return;
    }

    setDraftLifecycleStatus(activeContact.lifecycleStatus);
    setDraftAcceptedMarketing(activeContact.acceptedMarketing);
    const defaultReminderDate = new Date();
    defaultReminderDate.setHours(defaultReminderDate.getHours() + 1);
    setReminderScheduledForDraft(toDatetimeLocalValue(defaultReminderDate.toISOString()));
    setReminderChannelDraft("whatsapp");
    setReminderSubjectDraft("");
    setReminderBodyDraft("");
  }, [activeContact]);

  return (
    <>
      <div className="space-y-6">
        <section className="soft-panel rounded-[1.8rem] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">CRM Base</p>
              <h1 className="mt-2 font-serif text-4xl text-stone-900">Contactos, eventos y seguimiento comercial</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                Centraliza leads y clientes desde Skin Quiz y checkout, con trazabilidad comercial antes de automatizar email o WhatsApp.
              </p>
            </div>
            <div className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
              {isLoading ? "Cargando CRM..." : contactCountLabel}
            </div>
          </div>

          <form
            className="mt-6 grid gap-3 xl:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr_0.9fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setPageNotice(null);
              void loadContacts({
                lifecycleStatus: lifecycleFilter,
                mainGoal: mainGoalFilter,
                marketingAccepted: marketingFilter,
                search: searchValue,
                skinType: skinTypeFilter,
              });
            }}
          >
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Buscar</span>
              <div className="flex items-center gap-3 rounded-full border border-stone-200 bg-white px-4 py-3">
                <SearchIcon className="text-stone-400" />
                <input
                  className="w-full bg-transparent text-sm text-stone-900 outline-none"
                  onChange={(event) => {
                    setSearchValue(event.target.value);
                  }}
                  placeholder="Nombre, email o WhatsApp"
                  value={searchValue}
                />
              </div>
            </label>

            <FilterSelect
              label="Status"
              onChange={(value) => {
                setLifecycleFilter(value as LifecycleFilter);
              }}
              options={[{ label: "Todos los status", value: "all" }, ...CRM_LIFECYCLE_STATUS_OPTIONS]}
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
                setMarketingFilter(value as MarketingFilter);
              }}
              options={marketingOptions}
              value={marketingFilter}
            />

            <div className="flex items-end">
              <button
                className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 md:w-auto"
                type="submit"
              >
                Aplicar filtros
              </button>
            </div>
          </form>

          {pageNotice ? <NoticeBanner className="mt-5" notice={pageNotice} /> : null}
        </section>

        <section className="soft-panel rounded-[1.8rem] p-4 sm:p-6">
          {isLoading ? (
            <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center text-sm text-stone-500">
              Cargando contactos CRM...
            </div>
          ) : contacts.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center">
              <p className="font-serif text-2xl text-stone-900">Sin contactos por ahora</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">{getLoadMessage(errorReason, hasFilters)}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-left">
                  <thead className="bg-[#fff8f3] text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    <tr>
                      <th className="px-4 py-4">Contacto</th>
                      <th className="px-4 py-4">WhatsApp</th>
                      <th className="px-4 py-4">Email</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Piel</th>
                      <th className="px-4 py-4">Objetivo</th>
                      <th className="px-4 py-4">Marketing</th>
                      <th className="px-4 py-4">Ultima actividad</th>
                      <th className="px-4 py-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                    {contacts.map((contact) => {
                      const name = buildCrmContactName(contact);

                      return (
                        <tr className="align-top" key={contact.id}>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-stone-900">{name}</p>
                            <p className="mt-1 text-xs leading-6 text-stone-500">
                              {getCrmSourceLabel(contact.source)}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            {contact.whatsapp ? (
                              <a
                                className="inline-flex items-center gap-2 font-medium text-[#1a6f4e] transition hover:text-[#14553c]"
                                href={buildCrmWhatsAppHref(contact.whatsapp, name)}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <WhatsAppIcon className="h-4 w-4" />
                                {contact.whatsapp}
                              </a>
                            ) : (
                              <span className="text-stone-400">Sin WhatsApp</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {contact.email ? (
                              <a className="text-stone-700 underline-offset-4 hover:underline" href={`mailto:${contact.email}`}>
                                {contact.email}
                              </a>
                            ) : (
                              <span className="text-stone-400">Sin email</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getLifecycleBadgeClasses(contact.lifecycleStatus)}`}
                            >
                              {getCrmLifecycleStatusLabel(contact.lifecycleStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-4">{getCrmSkinTypeLabel(contact.skinType)}</td>
                          <td className="px-4 py-4">{getCrmMainGoalLabel(contact.mainGoal)}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs ${
                                contact.acceptedMarketing
                                  ? "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]"
                                  : "border-stone-200 bg-stone-100 text-stone-600"
                              }`}
                            >
                              {contact.acceptedMarketing ? "Aceptado" : "No"}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-stone-600">
                            {formatDateTime(contact.lastSeenAt)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                              onClick={() => {
                                void handleOpenDetail(contact.id);
                              }}
                              type="button"
                            >
                              Ver detalle
                              <ArrowUpRightIcon />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedContactId ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 bg-stone-950/25 backdrop-blur-sm"
          onClick={() => {
            setSelectedContactId(null);
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
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">CRM detail</p>
                  <h2 className="mt-2 font-serif text-3xl text-stone-900">
                    {activeContact ? buildCrmContactName(activeContact) : "Cargando contacto"}
                  </h2>
                </div>
                <button
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                  onClick={() => {
                    setSelectedContactId(null);
                    setDetailError(null);
                    setDrawerNotice(null);
                  }}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              {isDetailLoading && !activeContact ? (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center text-sm text-stone-500">
                  Cargando detalle del contacto...
                </div>
              ) : detailError ? (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center text-sm text-stone-600">
                  No pudimos cargar el detalle completo del contacto. Reintenta cuando la API local este disponible.
                </div>
              ) : activeContact ? (
                <div className="mt-6 space-y-6">
                  {drawerNotice ? <NoticeBanner notice={drawerNotice} /> : null}

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-stone-900">{buildCrmContactName(activeContact)}</p>
                        {activeContact.whatsapp ? (
                          <a
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#1a6f4e] transition hover:text-[#14553c]"
                            href={buildCrmWhatsAppHref(activeContact.whatsapp, buildCrmContactName(activeContact))}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <WhatsAppIcon className="h-4 w-4" />
                            {activeContact.whatsapp}
                          </a>
                        ) : (
                          <p className="text-sm text-stone-500">Sin WhatsApp registrado</p>
                        )}
                        {activeContact.email ? (
                          <a className="text-sm text-stone-700 underline-offset-4 hover:underline" href={`mailto:${activeContact.email}`}>
                            {activeContact.email}
                          </a>
                        ) : (
                          <p className="text-sm text-stone-500">Sin email registrado</p>
                        )}
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getLifecycleBadgeClasses(activeContact.lifecycleStatus)}`}
                      >
                        {getCrmLifecycleStatusLabel(activeContact.lifecycleStatus)}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <MetaPill label="Piel" value={getCrmSkinTypeLabel(activeContact.skinType)} />
                      <MetaPill label="Objetivo" value={getCrmMainGoalLabel(activeContact.mainGoal)} />
                      <MetaPill label="Edad" value={getCrmAgeRangeLabel(activeContact.ageRange)} />
                      <MetaPill label="Source" value={getCrmSourceLabel(activeContact.source)} />
                      <MetaPill label="Primera visita" value={formatDateTime(activeContact.firstSeenAt)} />
                      <MetaPill label="Ultima actividad" value={formatDateTime(activeContact.lastSeenAt)} />
                    </div>
                  </section>

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Resumen de compras</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <MetaPill label="Ordenes" value={String(activeContact.purchaseSummary.orderCount)} />
                      <MetaPill label="Total" value={formatCurrency(activeContact.purchaseSummary.totalSpent)} />
                      <MetaPill
                        label="Ultima orden"
                        value={activeContact.purchaseSummary.lastOrderNumber ?? "Sin orden"}
                      />
                      <MetaPill
                        label="Fecha"
                        value={
                          activeContact.purchaseSummary.lastOrderAt
                            ? formatDateTime(activeContact.purchaseSummary.lastOrderAt)
                            : "Sin compra"
                        }
                      />
                    </div>
                  </section>

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                          Perfil comercial
                        </p>
                        <h3 className="mt-2 font-serif text-2xl text-stone-900">Status y consentimiento</h3>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getLifecycleBadgeClasses(draftLifecycleStatus)}`}
                      >
                        {getCrmLifecycleStatusLabel(draftLifecycleStatus)}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Status</span>
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

                      <label className="flex items-center gap-3 rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-4 text-sm text-stone-700">
                        <input
                          checked={draftAcceptedMarketing}
                          className="h-4 w-4 accent-stone-900"
                          onChange={(event) => {
                            setDraftAcceptedMarketing(event.target.checked);
                          }}
                          type="checkbox"
                        />
                        Consentimiento de marketing activo
                      </label>

                      <div className="flex justify-end">
                        <button
                          className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isSavingProfile}
                          onClick={() => {
                            void handleSaveProfile();
                          }}
                          type="button"
                        >
                          {isSavingProfile ? "Guardando..." : hasProfileChanges ? "Guardar cambios" : "Sin cambios pendientes"}
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                        Recordatorios
                      </p>
                      <h3 className="mt-2 font-serif text-2xl text-stone-900">Proximos seguimientos</h3>
                    </div>

                    <div className="mt-5 space-y-3">
                      {activeContact.reminders.length === 0 ? (
                        <EmptyBlock message="Todavia no hay recordatorios CRM para este contacto." />
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
                                  {` · ${formatDateTime(reminder.scheduledFor)}`}
                                </p>
                              </div>
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getReminderBadgeClasses(reminder.status)}`}
                              >
                                {getCrmReminderStatusLabel(reminder.status)}
                              </span>
                            </div>

                            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">
                              {reminder.renderedBody}
                            </p>

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
                                  href={buildCrmReminderMailtoHref(
                                    activeContact.email,
                                    reminder.renderedSubject,
                                    reminder.renderedBody,
                                  )}
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
                          {isSubmittingReminder ? "Creando..." : "Crear recordatorio manual"}
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Eventos recientes</p>
                    <div className="mt-4 space-y-3">
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

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Notas internas</p>
                      <h3 className="mt-2 font-serif text-2xl text-stone-900">Seguimiento del equipo</h3>
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
                          className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
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

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Tareas</p>
                      <h3 className="mt-2 font-serif text-2xl text-stone-900">Pendientes comerciales</h3>
                    </div>

                    <div className="mt-5 space-y-3">
                      {activeContact.tasks.length === 0 ? (
                        <EmptyBlock message="Todavia no hay tareas abiertas para este contacto." />
                      ) : (
                        activeContact.tasks.map((task) => (
                          <article className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4" key={task.id}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-stone-900">{task.title}</p>
                                <p className="mt-1 text-xs leading-6 text-stone-500">
                                  {getCrmTaskTypeLabel(task.taskType)}
                                  {task.dueAt ? ` · vence ${formatDateTime(task.dueAt)}` : ""}
                                </p>
                              </div>
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getTaskBadgeClasses(task.status)}`}
                              >
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
    <div className="rounded-[1.2rem] border border-dashed border-stone-300 bg-white px-4 py-5 text-sm leading-7 text-stone-500">
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
