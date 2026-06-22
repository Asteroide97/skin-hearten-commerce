"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getCrmAutomationRunStatusLabel,
  getCrmAutomationTriggerLabel,
  getCrmTaskTypeLabel,
  type CRMAutomationRule,
  type CRMAutomationRuleUpdateInput,
  type CRMAutomationRun,
} from "@/lib/admin-crm";
import { formatDateTime } from "@/lib/format";

type RulesApiResponse =
  | { ok: true; data: CRMAutomationRule[] }
  | { ok: false; reason: string };

type RuleApiResponse =
  | { ok: true; data: CRMAutomationRule }
  | { ok: false; reason: string };

type RunsApiResponse =
  | { ok: true; data: CRMAutomationRun[] }
  | { ok: false; reason: string };

type Notice = {
  kind: "error" | "success";
  message: string;
} | null;

type RuleDraft = {
  delayHours: string;
  isActive: boolean;
  taskTitleTemplate: string;
};

function getLoadMessage(reason: string | null) {
  if (!reason) {
    return "Aun no hay runs de automatizacion para mostrar. Crea un Skin Quiz lead o completa un checkout para generar actividad.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para consultar automatizaciones CRM desde el panel admin.";
  }

  if (reason === "auth_failed") {
    return "No pudimos autenticar el acceso admin contra la API local. Revisa credenciales y variables del entorno.";
  }

  return "No fue posible cargar automatizaciones por ahora. La vista se mantiene estable mientras la API local no este disponible.";
}

function getRunStatusBadgeClasses(status: CRMAutomationRun["status"]) {
  switch (status) {
    case "executed":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "failed":
      return "border-[#ead0c7] bg-[#fff6f2] text-[#8a4d3b]";
    case "skipped":
      return "border-stone-200 bg-stone-100 text-stone-600";
    case "pending":
    default:
      return "border-[#e7d3c1] bg-[#fff8f3] text-stone-800";
  }
}

export function CrmAutomationsPage() {
  const [rules, setRules] = useState<CRMAutomationRule[]>([]);
  const [runs, setRuns] = useState<CRMAutomationRun[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [drafts, setDrafts] = useState<Record<number, RuleDraft>>({});
  const [savingRuleId, setSavingRuleId] = useState<number | null>(null);

  const runCountLabel = useMemo(() => {
    return runs.length === 1 ? "1 run reciente" : `${runs.length} runs recientes`;
  }, [runs.length]);

  const loadRules = useCallback(async () => {
    setIsLoadingRules(true);
    try {
      const response = await fetch("/api/admin/crm/automations/rules", { cache: "no-store" });
      const payload = (await response.json()) as RulesApiResponse;

      if (!response.ok || !payload.ok) {
        setRules([]);
        setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
        return;
      }

      setRules(payload.data);
      setDrafts(
        Object.fromEntries(
          payload.data.map((rule) => [
            rule.id,
            {
              delayHours: String(rule.delayHours),
              isActive: rule.isActive,
              taskTitleTemplate: rule.taskTitleTemplate,
            },
          ]),
        ),
      );
      setErrorReason(null);
    } catch {
      setRules([]);
      setErrorReason("fetch_failed");
    } finally {
      setIsLoadingRules(false);
    }
  }, []);

  const loadRuns = useCallback(async () => {
    setIsLoadingRuns(true);
    try {
      const response = await fetch("/api/admin/crm/automations/runs?limit=50", { cache: "no-store" });
      const payload = (await response.json()) as RunsApiResponse;

      if (!response.ok || !payload.ok) {
        setRuns([]);
        setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
        return;
      }

      setRuns(payload.data);
      setErrorReason(null);
    } catch {
      setRuns([]);
      setErrorReason("fetch_failed");
    } finally {
      setIsLoadingRuns(false);
    }
  }, []);

  async function handleSaveRule(rule: CRMAutomationRule) {
    const draft = drafts[rule.id];
    if (!draft) {
      return;
    }

    const parsedDelayHours = Number(draft.delayHours);
    if (!Number.isFinite(parsedDelayHours) || parsedDelayHours < 0) {
      setNotice({
        kind: "error",
        message: "Delay hours debe ser un numero valido mayor o igual a 0.",
      });
      return;
    }

    const payload: CRMAutomationRuleUpdateInput = {};
    if (parsedDelayHours !== rule.delayHours) {
      payload.delayHours = parsedDelayHours;
    }
    if (draft.taskTitleTemplate.trim() !== rule.taskTitleTemplate) {
      payload.taskTitleTemplate = draft.taskTitleTemplate.trim();
    }
    if (draft.isActive !== rule.isActive) {
      payload.isActive = draft.isActive;
    }

    if (Object.keys(payload).length === 0) {
      setNotice({
        kind: "success",
        message: `La regla "${rule.name}" no tenia cambios pendientes.`,
      });
      return;
    }

    setSavingRuleId(rule.id);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/crm/automations/rules/${rule.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as RuleApiResponse;

      if (!response.ok || !result.ok) {
        setNotice({
          kind: "error",
          message: `No pudimos guardar la regla "${rule.name}" por ahora.`,
        });
        return;
      }

      setRules((current) => current.map((entry) => (entry.id === rule.id ? result.data : entry)));
      setDrafts((current) => ({
        ...current,
        [rule.id]: {
          delayHours: String(result.data.delayHours),
          isActive: result.data.isActive,
          taskTitleTemplate: result.data.taskTitleTemplate,
        },
      }));
      setNotice({
        kind: "success",
        message: `Regla "${rule.name}" actualizada correctamente.`,
      });
      void loadRuns();
    } catch {
      setNotice({
        kind: "error",
        message: `No pudimos guardar la regla "${rule.name}" por ahora.`,
      });
    } finally {
      setSavingRuleId(null);
    }
  }

  useEffect(() => {
    void loadRules();
    void loadRuns();
  }, [loadRules, loadRuns]);

  return (
    <div className="space-y-6">
      <section className="soft-panel rounded-[1.8rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">CRM Automations Base</p>
            <h1 className="mt-2 font-serif text-4xl text-stone-900">Reglas y recordatorios automaticos</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
              Base tipo Shopify o Klaviyo para crear tareas y recordatorios comerciales desde eventos del cliente, sin enviar mensajes todavia.
            </p>
          </div>
          <div className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
            {isLoadingRuns ? "Cargando runs..." : runCountLabel}
          </div>
        </div>

        {notice ? <NoticeBanner className="mt-5" notice={notice} /> : null}
      </section>

      <section className="soft-panel rounded-[1.8rem] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Reglas</p>
            <h2 className="mt-2 font-serif text-3xl text-stone-900">Automatizaciones activas</h2>
          </div>
          <button
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
            onClick={() => {
              setNotice(null);
              void loadRules();
              void loadRuns();
            }}
            type="button"
          >
            Recargar
          </button>
        </div>

        {isLoadingRules ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center text-sm text-stone-500">
            Cargando reglas de automatizacion...
          </div>
        ) : rules.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center">
            <p className="font-serif text-2xl text-stone-900">Sin reglas disponibles</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">{getLoadMessage(errorReason)}</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {rules.map((rule) => {
              const draft = drafts[rule.id];

              return (
                <article className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft" key={rule.id}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        {getCrmAutomationTriggerLabel(rule.triggerType)}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-stone-950">{rule.name}</h3>
                      <p className="mt-2 text-sm leading-7 text-stone-600">
                        Tipo de tarea: {getCrmTaskTypeLabel(rule.taskType)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        draft?.isActive
                          ? "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]"
                          : "border-stone-200 bg-stone-100 text-stone-600"
                      }`}
                    >
                      {draft?.isActive ? "Activa" : "Pausada"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Delay Hours</span>
                      <input
                        className="w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                        inputMode="numeric"
                        onChange={(event) => {
                          setDrafts((current) => ({
                            ...current,
                            [rule.id]: {
                              ...current[rule.id],
                              delayHours: event.target.value,
                            },
                          }));
                        }}
                        value={draft?.delayHours ?? String(rule.delayHours)}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Task Title Template
                      </span>
                      <textarea
                        className="min-h-28 w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition focus:border-stone-500"
                        maxLength={255}
                        onChange={(event) => {
                          setDrafts((current) => ({
                            ...current,
                            [rule.id]: {
                              ...current[rule.id],
                              taskTitleTemplate: event.target.value,
                            },
                          }));
                        }}
                        value={draft?.taskTitleTemplate ?? rule.taskTitleTemplate}
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-4 text-sm text-stone-700">
                      <input
                        checked={draft?.isActive ?? rule.isActive}
                        className="h-4 w-4 accent-stone-900"
                        onChange={(event) => {
                          setDrafts((current) => ({
                            ...current,
                            [rule.id]: {
                              ...current[rule.id],
                              isActive: event.target.checked,
                            },
                          }));
                        }}
                        type="checkbox"
                      />
                      Regla activa
                    </label>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-stone-500">
                        Actualizada {formatDateTime(rule.updatedAt)}
                      </p>
                      <button
                        className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={savingRuleId === rule.id}
                        onClick={() => {
                          void handleSaveRule(rule);
                        }}
                        type="button"
                      >
                        {savingRuleId === rule.id ? "Guardando..." : "Guardar regla"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="soft-panel rounded-[1.8rem] p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Runs recientes</p>
          <h2 className="mt-2 font-serif text-3xl text-stone-900">Ejecuciones y recordatorios pendientes</h2>
        </div>

        {isLoadingRuns ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center text-sm text-stone-500">
            Cargando runs de automatizacion...
          </div>
        ) : runs.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center">
            <p className="font-serif text-2xl text-stone-900">Sin runs por ahora</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">{getLoadMessage(errorReason)}</p>
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200 text-left">
                <thead className="bg-[#fff8f3] text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  <tr>
                    <th className="px-4 py-4">Regla</th>
                    <th className="px-4 py-4">Contacto</th>
                    <th className="px-4 py-4">Trigger</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Due At</th>
                    <th className="px-4 py-4">Creado</th>
                    <th className="px-4 py-4">Ejecutado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                  {runs.map((run) => (
                    <tr className="align-top" key={run.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-stone-900">{run.ruleName}</p>
                        <p className="mt-1 text-xs leading-6 text-stone-500">{getCrmTaskTypeLabel(run.taskType)}</p>
                      </td>
                      <td className="px-4 py-4">{run.contactName}</td>
                      <td className="px-4 py-4">{getCrmAutomationTriggerLabel(run.triggerType)}</td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRunStatusBadgeClasses(run.status)}`}
                          >
                            {getCrmAutomationRunStatusLabel(run.status)}
                          </span>
                          {run.errorMessage ? (
                            <p className="max-w-xs text-xs leading-5 text-[#8a4d3b]">{run.errorMessage}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-stone-600">{formatDateTime(run.dueAt)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-stone-600">{formatDateTime(run.createdAt)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-stone-600">
                        {run.executedAt ? formatDateTime(run.executedAt) : "Pendiente"}
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
