"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowUpRightIcon, WhatsAppIcon } from "@/components/shared/icons";
import {
  buildAdminLeadWhatsAppHref,
  getSkinQuizLeadSourceLabel,
  type AdminSkinQuizLead,
  type AdminSkinQuizLeadDetail,
} from "@/lib/admin-skin-quiz-leads";
import { formatDateTime } from "@/lib/format";
import { skinQuizQuestions } from "@/lib/skin-quiz";

type LeadsApiResponse =
  | { ok: true; data: AdminSkinQuizLead[] }
  | { ok: false; reason: string };

type LeadDetailApiResponse =
  | { ok: true; data: AdminSkinQuizLeadDetail }
  | { ok: false; reason: string };

type QuestionId = (typeof skinQuizQuestions)[number]["id"];

const SOURCE_OPTIONS = [
  { value: "all", label: "Todos los origenes" },
  { value: "auto_home", label: "Auto Home" },
  { value: "header", label: "Header" },
  { value: "home", label: "Home" },
] as const;

const questionMap = new Map<QuestionId, (typeof skinQuizQuestions)[number]>(
  skinQuizQuestions.map((question) => [question.id, question]),
);

function getLoadMessage(reason: string | null, hasFilters: boolean) {
  if (!reason) {
    return hasFilters
      ? "No encontramos leads con esos filtros. Prueba otra busqueda o cambia el origen."
      : "Aun no hay leads capturados desde el Skin Quiz.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para consultar los leads del Skin Quiz desde el panel admin.";
  }

  if (reason === "auth_failed") {
    return "No pudimos autenticar el acceso admin contra la API local. Revisa las credenciales mock o las variables del entorno.";
  }

  return "No fue posible cargar los leads por ahora. Si la API local no esta disponible, el panel muestra este estado vacio sin romper la vista.";
}

function getAnswerLabel(questionId: QuestionId, answerValue: string | undefined) {
  if (!answerValue) {
    return "Sin respuesta";
  }

  const question = questionMap.get(questionId);
  const option = question?.options.find((entry) => entry.value === answerValue);
  return option?.label ?? answerValue.replaceAll("_", " ");
}

export function SkinQuizLeadsPage() {
  const [leads, setLeads] = useState<AdminSkinQuizLead[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [sourceValue, setSourceValue] = useState<(typeof SOURCE_OPTIONS)[number]["value"]>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, AdminSkinQuizLeadDetail>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const activeLead = selectedLeadId ? detailCache[selectedLeadId] : null;
  const hasFilters = searchValue.trim().length > 0 || sourceValue !== "all";
  const leadCountLabel = useMemo(() => {
    return leads.length === 1 ? "1 lead" : `${leads.length} leads`;
  }, [leads.length]);

  const loadLeads = useCallback(async (filters: {
    search: string;
    source: (typeof SOURCE_OPTIONS)[number]["value"];
  }) => {
    setIsLoading(true);

    const params = new URLSearchParams();
    if (filters.search.trim().length > 0) {
      params.set("search", filters.search.trim());
    }
    if (filters.source !== "all") {
      params.set("source", filters.source);
    }

    try {
      const requestUrl = params.size > 0 ? `/api/admin/skin-quiz-leads?${params.toString()}` : "/api/admin/skin-quiz-leads";
      const response = await fetch(requestUrl, {
        cache: "no-store",
      });
      const payload = (await response.json()) as LeadsApiResponse;

      if (!response.ok || !payload.ok) {
        setLeads([]);
        setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
        return;
      }

      setLeads(payload.data);
      setErrorReason(null);
    } catch {
      setLeads([]);
      setErrorReason("fetch_failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function handleLeadOpen(leadId: number) {
    setSelectedLeadId(leadId);
    setDetailError(null);

    if (detailCache[leadId]) {
      return;
    }

    setIsDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/skin-quiz-leads/${leadId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as LeadDetailApiResponse;

      if (!response.ok || !payload.ok) {
        setDetailError(payload.ok ? "fetch_failed" : payload.reason);
        return;
      }

      setDetailCache((current) => ({
        ...current,
        [leadId]: payload.data,
      }));
    } catch {
      setDetailError("fetch_failed");
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadLeads({ search: "", source: "all" });
  }, [loadLeads]);

  return (
    <>
      <div className="space-y-6">
        <section className="soft-panel rounded-[1.8rem] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Skin Quiz Leads</p>
              <h1 className="mt-2 font-serif text-4xl text-stone-900">Oportunidades capturadas desde el advisor</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                Consulta contacto, objetivo principal y la rutina que el quiz recomendo antes de hacer seguimiento por WhatsApp.
              </p>
            </div>
            <div className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
              {isLoading ? "Cargando leads..." : leadCountLabel}
            </div>
          </div>

          <form
            className="mt-6 grid gap-3 md:grid-cols-[1.4fr_0.8fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void loadLeads({ search: searchValue, source: sourceValue });
            }}
          >
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Buscar</span>
              <input
                className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                onChange={(event) => {
                  setSearchValue(event.target.value);
                }}
                placeholder="Nombre, WhatsApp o email"
                value={searchValue}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Origen</span>
              <select
                className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                onChange={(event) => {
                  const nextSource = event.target.value as (typeof SOURCE_OPTIONS)[number]["value"];
                  setSourceValue(nextSource);
                  void loadLeads({ search: searchValue, source: nextSource });
                }}
                value={sourceValue}
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
          {isLoading ? (
            <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center text-sm text-stone-500">
              Cargando leads del Skin Quiz...
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center">
              <p className="font-serif text-2xl text-stone-900">Sin resultados por ahora</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">{getLoadMessage(errorReason, hasFilters)}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-left">
                  <thead className="bg-[#fff8f3] text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    <tr>
                      <th className="px-4 py-4">Nombre</th>
                      <th className="px-4 py-4">WhatsApp</th>
                      <th className="px-4 py-4">Email</th>
                      <th className="px-4 py-4">Objetivo</th>
                      <th className="px-4 py-4">Tipo de piel</th>
                      <th className="px-4 py-4">Fecha</th>
                      <th className="px-4 py-4">Source</th>
                      <th className="px-4 py-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                    {leads.map((lead) => (
                      <tr className="align-top" key={lead.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-stone-900">{lead.name}</p>
                          <p className="mt-1 max-w-xs text-xs leading-6 text-stone-500">{lead.resultSummary}</p>
                        </td>
                        <td className="px-4 py-4">
                          <a
                            className="inline-flex items-center gap-2 font-medium text-[#1a6f4e] transition hover:text-[#14553c]"
                            href={buildAdminLeadWhatsAppHref(lead.whatsapp, lead.name)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <WhatsAppIcon className="h-4 w-4" />
                            {lead.whatsapp}
                          </a>
                        </td>
                        <td className="px-4 py-4 text-stone-600">{lead.email ?? "Sin email"}</td>
                        <td className="px-4 py-4">{lead.primaryGoal}</td>
                        <td className="px-4 py-4">{lead.skinType}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-stone-600">{formatDateTime(lead.createdAt)}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600">
                            {getSkinQuizLeadSourceLabel(lead.source)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                            onClick={() => {
                              void handleLeadOpen(lead.id);
                            }}
                            type="button"
                          >
                            Ver detalle
                            <ArrowUpRightIcon />
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

      {selectedLeadId ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 bg-stone-950/25 backdrop-blur-sm"
          onClick={() => {
            setSelectedLeadId(null);
            setDetailError(null);
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
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Lead detail</p>
                  <h2 className="mt-2 font-serif text-3xl text-stone-900">
                    {activeLead?.name ?? "Cargando lead"}
                  </h2>
                </div>
                <button
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                  onClick={() => {
                    setSelectedLeadId(null);
                    setDetailError(null);
                  }}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              {isDetailLoading && !activeLead ? (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center text-sm text-stone-500">
                  Cargando detalle del lead...
                </div>
              ) : detailError ? (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center text-sm text-stone-600">
                  No pudimos cargar el detalle completo. Reintenta con el mismo lead cuando la API local este disponible.
                </div>
              ) : activeLead ? (
                <div className="mt-6 space-y-6">
                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-stone-900">{activeLead.name}</p>
                        <p className="text-sm text-stone-600">{activeLead.whatsapp}</p>
                        <p className="text-sm text-stone-600">{activeLead.email ?? "Sin email"}</p>
                      </div>
                      <a
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d9c4b2] bg-[#fff8f3] px-5 py-3 text-sm font-semibold text-stone-900 transition hover:border-stone-400"
                        href={buildAdminLeadWhatsAppHref(activeLead.whatsapp, activeLead.name)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <WhatsAppIcon className="text-[#1a6f4e]" />
                        Abrir WhatsApp
                      </a>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <MetaPill label="Objetivo" value={activeLead.primaryGoal} />
                      <MetaPill label="Tipo de piel" value={activeLead.skinType} />
                      <MetaPill label="Source" value={getSkinQuizLeadSourceLabel(activeLead.source)} />
                      <MetaPill label="Capturado" value={formatDateTime(activeLead.createdAt)} />
                    </div>

                    <p className="mt-5 text-sm leading-7 text-stone-600">{activeLead.resultSummary}</p>
                  </section>

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Respuestas del quiz</p>
                    <div className="mt-4 grid gap-3">
                      {skinQuizQuestions.map((question) => (
                        <div className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4" key={question.id}>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                            {question.title}
                          </p>
                          <p className="mt-2 text-sm font-medium text-stone-900">
                            {getAnswerLabel(
                              question.id,
                              activeLead.answersJson[question.id] as string | undefined,
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Rutina recomendada</p>
                    <h3 className="mt-2 font-serif text-2xl text-stone-900">AM y PM</h3>
                    <p className="mt-3 text-sm leading-7 text-stone-600">{activeLead.resultJson.summary}</p>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <RoutinePreviewCard period="AM" steps={activeLead.resultJson.amRoutine} />
                      <RoutinePreviewCard period="PM" steps={activeLead.resultJson.pmRoutine} />
                    </div>
                  </section>

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                          Productos recomendados
                        </p>
                        <h3 className="mt-2 font-serif text-2xl text-stone-900">Seleccion sugerida</h3>
                      </div>
                      <span className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600">
                        {activeLead.resultJson.recommendedProducts.length} productos
                      </span>
                    </div>
                    <div className="mt-5 grid gap-3">
                      {activeLead.resultJson.recommendedProducts.map((product) => (
                        <article
                          className="rounded-[1.4rem] border border-stone-200 bg-[#fffaf7] px-4 py-4"
                          key={product.id}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                {product.brand}
                              </p>
                              <h4 className="mt-2 text-base font-semibold text-stone-950">{product.name}</h4>
                              <p className="mt-2 text-sm leading-6 text-stone-600">{product.highlight}</p>
                            </div>
                            <span className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600">
                              {product.category}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  {activeLead.userAgent ? (
                    <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">User Agent</p>
                      <p className="mt-3 break-words text-sm leading-7 text-stone-600">{activeLead.userAgent}</p>
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

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-stone-900">{value}</p>
    </div>
  );
}

function RoutinePreviewCard({
  period,
  steps,
}: {
  period: "AM" | "PM";
  steps: AdminSkinQuizLeadDetail["resultJson"]["amRoutine"];
}) {
  return (
    <div className="rounded-[1.4rem] bg-[#fff8f3] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Rutina {period}</p>
      <div className="mt-4 space-y-3">
        {steps.map((step) => (
          <div className="rounded-[1.2rem] bg-white px-4 py-4" key={`${period}-${step.slot}-${step.product.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{step.slot}</p>
                <p className="mt-2 text-sm font-semibold text-stone-900">{step.product.name}</p>
              </div>
              <span className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600">
                {step.product.category}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-600">{step.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
