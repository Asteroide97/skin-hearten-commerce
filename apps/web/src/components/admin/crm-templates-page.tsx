"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  CRMMessageTemplate,
  CRMMessageTemplatePreviewResult,
  CRMMessageTemplateUpdateInput,
} from "@/lib/admin-crm";
import { getCrmReminderChannelLabel, getCrmReminderTypeLabel } from "@/lib/admin-crm";
import { formatDateTime } from "@/lib/format";

type TemplatesApiResponse =
  | { ok: true; data: CRMMessageTemplate[] }
  | { ok: false; reason: string };

type TemplateApiResponse =
  | { ok: true; data: CRMMessageTemplate }
  | { ok: false; reason: string };

type PreviewApiResponse =
  | { ok: true; data: CRMMessageTemplatePreviewResult }
  | { ok: false; reason: string };

type Notice = {
  kind: "error" | "success";
  message: string;
} | null;

type TemplateDraft = {
  body: string;
  isActive: boolean;
  subject: string;
};

const fallbackVariables = [
  "{{first_name}}",
  "{{main_goal}}",
  "{{skin_type}}",
  "{{order_number}}",
  "{{last_order_date}}",
  "{{store_name}}",
];

function getLoadMessage(reason: string | null) {
  if (!reason) {
    return "Aun no hay plantillas registradas. La API las creara automaticamente al primer lead o checkout.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para consultar plantillas CRM desde el panel admin.";
  }

  if (reason === "auth_failed") {
    return "No pudimos autenticar el panel admin contra la API local. Revisa credenciales y variables del entorno.";
  }

  return "No fue posible cargar plantillas por ahora. La vista mantiene un estado vacio amigable mientras la API local no este disponible.";
}

export function CrmTemplatesPage() {
  const [templates, setTemplates] = useState<CRMMessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, TemplateDraft>>({});
  const [previewByTemplate, setPreviewByTemplate] = useState<Record<number, CRMMessageTemplatePreviewResult>>({});
  const [isSavingTemplateId, setIsSavingTemplateId] = useState<number | null>(null);
  const [isPreviewingTemplateId, setIsPreviewingTemplateId] = useState<number | null>(null);

  const selectedTemplate = selectedTemplateId
    ? templates.find((template) => template.id === selectedTemplateId) ?? null
    : null;
  const selectedDraft = selectedTemplateId ? drafts[selectedTemplateId] ?? null : null;
  const selectedPreview = selectedTemplateId ? previewByTemplate[selectedTemplateId] ?? null : null;

  const templateCountLabel = useMemo(() => {
    return templates.length === 1 ? "1 plantilla" : `${templates.length} plantillas`;
  }, [templates.length]);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/crm/message-templates", { cache: "no-store" });
      const payload = (await response.json()) as TemplatesApiResponse;

      if (!response.ok || !payload.ok) {
        setTemplates([]);
        setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
        return;
      }

      setTemplates(payload.data);
      setDrafts(
        Object.fromEntries(
          payload.data.map((template) => [
            template.id,
            {
              body: template.body,
              isActive: template.isActive,
              subject: template.subject ?? "",
            },
          ]),
        ),
      );
      setSelectedTemplateId((current) => current ?? payload.data[0]?.id ?? null);
      setErrorReason(null);
    } catch {
      setTemplates([]);
      setErrorReason("fetch_failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPreview = useCallback(async (templateId: number) => {
    const template = templates.find((entry) => entry.id === templateId);
    const draft = drafts[templateId];
    if (!template || !draft) {
      return;
    }

    setIsPreviewingTemplateId(templateId);

    try {
      const response = await fetch(`/api/admin/crm/message-templates/${templateId}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: draft.body,
          subject: draft.subject || null,
        }),
      });
      const payload = (await response.json()) as PreviewApiResponse;

      if (!response.ok || !payload.ok) {
        setNotice({
          kind: "error",
          message: `No pudimos generar preview para "${template.name}".`,
        });
        return;
      }

      setPreviewByTemplate((current) => ({
        ...current,
        [templateId]: payload.data,
      }));
    } catch {
      setNotice({
        kind: "error",
        message: `No pudimos generar preview para "${template.name}".`,
      });
    } finally {
      setIsPreviewingTemplateId(null);
    }
  }, [drafts, templates]);

  async function handleSaveTemplate(template: CRMMessageTemplate) {
    const draft = drafts[template.id];
    if (!draft) {
      return;
    }

    if (draft.body.trim().length < 2) {
      setNotice({
        kind: "error",
        message: "El body necesita al menos 2 caracteres.",
      });
      return;
    }

    const payload: CRMMessageTemplateUpdateInput = {};
    if ((draft.subject || "") !== (template.subject || "")) {
      payload.subject = draft.subject || null;
    }
    if (draft.body !== template.body) {
      payload.body = draft.body;
    }
    if (draft.isActive !== template.isActive) {
      payload.isActive = draft.isActive;
    }

    if (Object.keys(payload).length === 0) {
      setNotice({
        kind: "success",
        message: `La plantilla "${template.name}" no tenia cambios pendientes.`,
      });
      return;
    }

    setIsSavingTemplateId(template.id);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/crm/message-templates/${template.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const payloadResponse = (await response.json()) as TemplateApiResponse;

      if (!response.ok || !payloadResponse.ok) {
        setNotice({
          kind: "error",
          message: `No pudimos guardar la plantilla "${template.name}".`,
        });
        return;
      }

      setTemplates((current) =>
        current.map((entry) => (entry.id === template.id ? payloadResponse.data : entry)),
      );
      setDrafts((current) => ({
        ...current,
        [template.id]: {
          body: payloadResponse.data.body,
          isActive: payloadResponse.data.isActive,
          subject: payloadResponse.data.subject ?? "",
        },
      }));
      setNotice({
        kind: "success",
        message: `Plantilla "${template.name}" actualizada correctamente.`,
      });
      await loadPreview(template.id);
    } catch {
      setNotice({
        kind: "error",
        message: `No pudimos guardar la plantilla "${template.name}".`,
      });
    } finally {
      setIsSavingTemplateId(null);
    }
  }

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!selectedTemplateId) {
      return;
    }
    if (previewByTemplate[selectedTemplateId]) {
      return;
    }
    void loadPreview(selectedTemplateId);
  }, [loadPreview, previewByTemplate, selectedTemplateId]);

  return (
    <div className="space-y-6">
      <section className="soft-panel rounded-[1.8rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">CRM Templates Base</p>
            <h1 className="mt-2 font-serif text-4xl text-stone-900">Plantillas de WhatsApp y email</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
              Edita los mensajes base de recompra, seguimiento y post compra. Cada plantilla incluye preview renderizado
              y variables compatibles antes de usarla manualmente.
            </p>
          </div>
          <div className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
            {isLoading ? "Cargando plantillas..." : templateCountLabel}
          </div>
        </div>

        {notice ? <NoticeBanner className="mt-5" notice={notice} /> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <section className="soft-panel rounded-[1.8rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Catalogo</p>
              <h2 className="mt-2 font-serif text-3xl text-stone-900">Plantillas disponibles</h2>
            </div>
            <button
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
              onClick={() => {
                setNotice(null);
                void loadTemplates();
              }}
              type="button"
            >
              Recargar
            </button>
          </div>

          {isLoading ? (
            <EmptyState message="Cargando plantillas CRM..." title="Cargando" />
          ) : templates.length === 0 ? (
            <EmptyState message={getLoadMessage(errorReason)} title="Sin plantillas por ahora" />
          ) : (
            <div className="mt-5 space-y-3">
              {templates.map((template) => {
                const isActive = selectedTemplateId === template.id;
                return (
                  <button
                    className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-stone-900 bg-stone-950 text-white"
                        : "border-stone-200 bg-white text-stone-900 hover:border-stone-400"
                    }`}
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                    }}
                    type="button"
                  >
                    <p className="text-sm font-semibold">{template.name}</p>
                    <p className={`mt-2 text-xs leading-6 ${isActive ? "text-stone-300" : "text-stone-500"}`}>
                      {getCrmReminderChannelLabel(template.channel)} · {getCrmReminderTypeLabel(template.reminderType)}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                          template.isActive
                            ? isActive
                              ? "border-white/30 bg-white/10 text-white"
                              : "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]"
                            : isActive
                              ? "border-white/20 bg-white/5 text-stone-300"
                              : "border-stone-200 bg-stone-100 text-stone-600"
                        }`}
                      >
                        {template.isActive ? "Activa" : "Pausada"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="soft-panel rounded-[1.8rem] p-6">
          {!selectedTemplate || !selectedDraft ? (
            <EmptyState message="Selecciona una plantilla para editar subject, body y preview." title="Sin seleccion" />
          ) : (
            <div className="space-y-6">
              <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Editor</p>
                    <h2 className="mt-2 font-serif text-3xl text-stone-900">{selectedTemplate.name}</h2>
                    <p className="mt-2 text-sm leading-7 text-stone-600">
                      {getCrmReminderChannelLabel(selectedTemplate.channel)} ·{" "}
                      {getCrmReminderTypeLabel(selectedTemplate.reminderType)}
                    </p>
                  </div>
                  <p className="text-xs text-stone-500">Actualizada {formatDateTime(selectedTemplate.updatedAt)}</p>
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="flex items-center gap-3 rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-4 text-sm text-stone-700">
                    <input
                      checked={selectedDraft.isActive}
                      className="h-4 w-4 accent-stone-900"
                      onChange={(event) => {
                        setDrafts((current) => ({
                          ...current,
                          [selectedTemplate.id]: {
                            ...current[selectedTemplate.id],
                            isActive: event.target.checked,
                          },
                        }));
                      }}
                      type="checkbox"
                    />
                    Plantilla activa
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Subject</span>
                    <input
                      className="w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                      onChange={(event) => {
                        setDrafts((current) => ({
                          ...current,
                          [selectedTemplate.id]: {
                            ...current[selectedTemplate.id],
                            subject: event.target.value,
                          },
                        }));
                      }}
                      placeholder="Subject opcional"
                      value={selectedDraft.subject}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Body</span>
                    <textarea
                      className="min-h-44 w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition focus:border-stone-500"
                      maxLength={4000}
                      onChange={(event) => {
                        setDrafts((current) => ({
                          ...current,
                          [selectedTemplate.id]: {
                            ...current[selectedTemplate.id],
                            body: event.target.value,
                          },
                        }));
                      }}
                      value={selectedDraft.body}
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSavingTemplateId === selectedTemplate.id}
                      onClick={() => {
                        void handleSaveTemplate(selectedTemplate);
                      }}
                      type="button"
                    >
                      {isSavingTemplateId === selectedTemplate.id ? "Guardando..." : "Guardar plantilla"}
                    </button>
                    <button
                      className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPreviewingTemplateId === selectedTemplate.id}
                      onClick={() => {
                        void loadPreview(selectedTemplate.id);
                      }}
                      type="button"
                    >
                      {isPreviewingTemplateId === selectedTemplate.id ? "Renderizando..." : "Actualizar preview"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Preview</p>
                  <h3 className="mt-2 font-serif text-2xl text-stone-900">Mensaje renderizado</h3>

                  <div className="mt-5 rounded-[1.4rem] bg-[#fff8f3] p-4">
                    {selectedPreview?.renderedSubject ? (
                      <p className="text-sm font-semibold text-stone-900">
                        Subject: {selectedPreview.renderedSubject}
                      </p>
                    ) : null}
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">
                      {selectedPreview?.renderedBody ?? selectedDraft.body}
                    </p>
                  </div>
                </article>

                <article className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Variables</p>
                  <h3 className="mt-2 font-serif text-2xl text-stone-900">Campos disponibles</h3>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {(selectedPreview?.variables ?? fallbackVariables).map((variable) => (
                      <span
                        className="rounded-full border border-stone-200 bg-[#fff8f3] px-3 py-2 text-xs font-semibold text-stone-700"
                        key={variable}
                      >
                        {variable}
                      </span>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          )}
        </section>
      </div>
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
