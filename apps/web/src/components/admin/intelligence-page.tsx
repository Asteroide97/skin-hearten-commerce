"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  getIntelligencePriorityLabel,
  getIntelligenceScoreBandLabel,
  type IntelligenceAskResponse,
  type IntelligenceCustomerScore,
  type IntelligenceDashboard,
  type IntelligenceKPI,
  type IntelligenceProductScore,
  type IntelligenceRecommendation,
} from "@/lib/admin-intelligence";
import { formatCurrency, formatDateTime } from "@/lib/format";

type DashboardApiResponse =
  | { ok: true; data: IntelligenceDashboard }
  | { ok: false; reason: string; message?: string };

type AskApiResponse =
  | { ok: true; data: IntelligenceAskResponse }
  | { ok: false; reason: string; message?: string };

const SOURCE_LINKS: Record<string, { href: string; label: string }> = {
  clientes: { href: "/admin/crm", label: "Abrir CRM" },
  crm: { href: "/admin/crm", label: "Abrir CRM" },
  cupones: { href: "/admin/cupones", label: "Ver cupones" },
  inventario: { href: "/admin/productos", label: "Ver productos" },
  resenas: { href: "/admin/reviews", label: "Ver resenas" },
  skin_quiz: { href: "/admin/skin-quiz-leads", label: "Ver leads" },
};

function getLoadMessage(reason: string | null) {
  if (!reason) {
    return "Todavia no hay suficiente actividad para construir insights accionables. Cuando entren ventas, leads, CRM o inventario real, este centro empezara a priorizar decisiones.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para conectar el Centro de Inteligencia con FastAPI.";
  }

  if (reason === "auth_failed") {
    return "Tu sesion de SuperAdmin no es valida o expiro. Vuelve a iniciar sesion.";
  }

  return "No fue posible cargar los insights ahora mismo. El modulo queda aislado y no afecta el resto del panel.";
}

function getToneClasses(tone: IntelligenceKPI["tone"]) {
  switch (tone) {
    case "positive":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "warning":
      return "border-[#ead9c8] bg-[#fff8f3] text-stone-800";
    case "critical":
      return "border-[#ead0c7] bg-[#fff6f2] text-[#8a4d3b]";
    case "neutral":
    default:
      return "border-stone-200 bg-white text-stone-700";
  }
}

function getPriorityClasses(priority: IntelligenceRecommendation["priority"]) {
  switch (priority) {
    case "critical":
      return "border-[#ead0c7] bg-[#fff6f2] text-[#8a4d3b]";
    case "high":
      return "border-[#ead9c8] bg-[#fff8f3] text-stone-800";
    case "medium":
      return "border-[#cfe0df] bg-[#eef8f7] text-[#2c6160]";
    case "low":
    default:
      return "border-stone-200 bg-white text-stone-600";
  }
}

function getScoreClasses(score: number) {
  if (score >= 80) {
    return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
  }
  if (score >= 60) {
    return "border-[#ead9c8] bg-[#fff8f3] text-stone-800";
  }
  return "border-[#ead0c7] bg-[#fff6f2] text-[#8a4d3b]";
}

function getSourceLink(source: string) {
  return SOURCE_LINKS[source] ?? { href: "/admin", label: "Abrir admin" };
}

export function IntelligencePage() {
  const [dashboard, setDashboard] = useState<IntelligenceDashboard | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<IntelligenceAskResponse | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/admin/intelligence", {
          cache: "no-store",
        });
        const payload = (await response.json()) as DashboardApiResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setDashboard(null);
          setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
          return;
        }

        setDashboard(payload.data);
        setErrorReason(null);
      } catch {
        if (!cancelled) {
          setDashboard(null);
          setErrorReason("fetch_failed");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const topCustomer = useMemo(() => dashboard?.customerScores[0] ?? null, [dashboard]);
  const topProduct = useMemo(() => dashboard?.productScores[0] ?? null, [dashboard]);

  async function submitQuestion(nextQuestion?: string) {
    const value = (nextQuestion ?? question).trim();
    if (!value) {
      setAskError("Escribe una pregunta concreta para consultar el motor.");
      return;
    }

    setIsAsking(true);
    setAskError(null);

    try {
      const response = await fetch("/api/admin/intelligence/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: value }),
      });
      const payload = (await response.json()) as AskApiResponse;

      if (!response.ok || !payload.ok) {
        setAskError(payload.ok ? "No pudimos responder esa consulta por ahora." : payload.message ?? "No pudimos responder esa consulta por ahora.");
        return;
      }

      setQuestion(value);
      setAnswer(payload.data);
    } catch {
      setAskError("No pudimos responder esa consulta por ahora.");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="soft-panel rounded-[1.8rem] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Centro de Inteligencia</p>
            <h1 className="mt-2 font-serif text-4xl text-stone-900">Skin Hearten Intelligence</h1>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Capa ejecutiva aislada del storefront y del checkout. Prioriza decisiones comerciales usando ventas, CRM, Skin Quiz, cupones, inventario y rentabilidad sin depender de graficas.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <MetricPill
              label="Actualizado"
              value={dashboard ? formatDateTime(dashboard.generatedAt) : isLoading ? "Cargando..." : "Sin datos"}
            />
            <MetricPill label="Motor" value={dashboard?.aiModule.provider === "rules" ? "Reglas" : "IA"} />
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="soft-panel rounded-[1.8rem] p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-5 w-56 rounded-full bg-stone-200" />
            <div className="h-24 rounded-[1.4rem] bg-white" />
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="h-28 rounded-[1.4rem] bg-white" key={index} />
              ))}
            </div>
          </div>
        </section>
      ) : dashboard ? (
        <>
          <section className="soft-panel rounded-[1.8rem] p-6">
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
              <article className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Resumen ejecutivo</p>
                <h2 className="mt-2 font-serif text-3xl text-stone-900">{dashboard.executiveSummary.headline}</h2>
                <p className="mt-4 text-sm leading-8 text-stone-700">{dashboard.executiveSummary.summary}</p>
                <div className="mt-5 grid gap-3">
                  {dashboard.executiveSummary.bullets.map((bullet) => (
                    <div
                      className="rounded-[1.2rem] border border-stone-200 bg-[#fff8f3] px-4 py-4 text-sm leading-7 text-stone-700"
                      key={bullet}
                    >
                      {bullet}
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Pulso inmediato</p>
                <div className="mt-4 space-y-4">
                  {dashboard.kpis.slice(0, 3).map((kpi) => (
                    <div className={`rounded-[1.2rem] border px-4 py-4 ${getToneClasses(kpi.tone)}`} key={kpi.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">{kpi.label}</p>
                          <p className="mt-2 text-2xl font-semibold">{kpi.displayValue}</p>
                        </div>
                        <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                          {kpi.tone}
                        </span>
                      </div>
                      {kpi.helper ? <p className="mt-3 text-sm leading-7 opacity-80">{kpi.helper}</p> : null}
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dashboard.kpis.slice(3).map((kpi) => (
                <KpiCard key={kpi.id} kpi={kpi} />
              ))}
            </div>
          </section>

          <section className="soft-panel rounded-[1.8rem] p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Recomendaciones automaticas</p>
                <h2 className="mt-2 font-serif text-3xl text-stone-900">Prioridades accionables</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  Motor rule-based orientado a decidir que hacer hoy: recompra, reviews, inventario, leads y promociones.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <MetricPill label="Recomendaciones" value={String(dashboard.recommendations.length)} />
                <MetricPill label="Cliente top" value={topCustomer ? topCustomer.name : "Sin dato"} />
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {dashboard.recommendations.map((recommendation) => (
                <article
                  className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft"
                  key={recommendation.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        {recommendation.impactLabel}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-stone-900">{recommendation.title}</h3>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClasses(recommendation.priority)}`}
                    >
                      {getIntelligencePriorityLabel(recommendation.priority)}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-stone-700">{recommendation.description}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr]">
                    <MetaPill label="Impacto" value={recommendation.impactValue} />
                    <MetaPill label="Siguiente paso" value={recommendation.suggestedAction} />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.18em] text-stone-500">
                      Fuente: {recommendation.source.replaceAll("_", " ")}
                    </span>
                    <Link
                      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500"
                      href={getSourceLink(recommendation.source).href}
                    >
                      {getSourceLink(recommendation.source).label}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="soft-panel rounded-[1.8rem] p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Motor de insights</p>
              <h2 className="mt-2 font-serif text-3xl text-stone-900">Lecturas por fuente</h2>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              {dashboard.snapshots.map((snapshot) => (
                <article className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft" key={snapshot.id}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{snapshot.title}</p>
                  <p className="mt-3 text-base font-semibold leading-7 text-stone-900">{snapshot.headline}</p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-stone-600">
                    {snapshot.details.map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
            <section className="soft-panel rounded-[1.8rem] p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Score de clienta</p>
                  <h2 className="mt-2 font-serif text-3xl text-stone-900">Probabilidad de recompra</h2>
                </div>
                <Link
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500"
                  href="/admin/crm"
                >
                  Ir al CRM
                </Link>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-stone-200 text-left">
                    <thead className="bg-[#fff8f3] text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                      <tr>
                        <th className="px-4 py-4">Cliente</th>
                        <th className="px-4 py-4">Score</th>
                        <th className="px-4 py-4">Ultima compra</th>
                        <th className="px-4 py-4">Pedidos</th>
                        <th className="px-4 py-4">Ticket</th>
                        <th className="px-4 py-4">Objetivo</th>
                        <th className="px-4 py-4">Accion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                      {dashboard.customerScores.map((customer) => (
                        <tr className="align-top" key={`${customer.contactId ?? "contact"}-${customer.customerId ?? "customer"}-${customer.name}`}>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-stone-900">{customer.name}</p>
                            <p className="mt-1 text-xs text-stone-500">
                              {customer.email ?? customer.whatsapp ?? "Sin canal"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <ScoreBadge score={customer.repurchaseScore} />
                            <p className="mt-2 text-xs text-stone-500">
                              {getIntelligenceScoreBandLabel(customer.scoreBand)}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm text-stone-600">
                            {customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : "Sin compra"}
                          </td>
                          <td className="px-4 py-4">{customer.orderCount}</td>
                          <td className="px-4 py-4 font-medium text-stone-900">
                            {formatCurrency(customer.averageTicket)}
                          </td>
                          <td className="px-4 py-4 text-sm text-stone-600">
                            {customer.mainGoal ? customer.mainGoal.replaceAll("_", " ") : "Sin definir"}
                          </td>
                          <td className="px-4 py-4">
                            <p className="max-w-xs text-sm leading-7 text-stone-700">{customer.suggestedAction}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="soft-panel rounded-[1.8rem] p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Score de producto</p>
                  <h2 className="mt-2 font-serif text-3xl text-stone-900">Salud comercial del catalogo</h2>
                </div>
                <Link
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500"
                  href="/admin/productos"
                >
                  Ver catalogo
                </Link>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-stone-200 text-left">
                    <thead className="bg-[#fff8f3] text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                      <tr>
                        <th className="px-4 py-4">Producto</th>
                        <th className="px-4 py-4">Score</th>
                        <th className="px-4 py-4">Ventas</th>
                        <th className="px-4 py-4">Resenas</th>
                        <th className="px-4 py-4">Stock</th>
                        <th className="px-4 py-4">Margen</th>
                        <th className="px-4 py-4">Accion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                      {dashboard.productScores.map((product) => (
                        <tr className="align-top" key={product.productId}>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-stone-900">{product.name}</p>
                            <p className="mt-1 text-xs text-stone-500">
                              {product.brand} / {product.category}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <ScoreBadge score={product.intelligenceScore} />
                            <p className="mt-2 text-xs text-stone-500">
                              {getIntelligenceScoreBandLabel(product.scoreBand)}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-stone-900">{formatCurrency(product.revenue)}</p>
                            <p className="mt-1 text-xs text-stone-500">{product.unitsSold} unidad(es)</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-stone-900">
                              {product.averageRating > 0 ? `${product.averageRating.toFixed(1)} / 5` : "Sin rating"}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">{product.reviewCount} review(s)</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getScoreClasses(product.inventoryScore)}`}>
                              {product.stock} piezas
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-stone-900">{product.marginPercent.toFixed(0)}%</p>
                            <p className="mt-1 text-xs text-stone-500">
                              {product.marginSource === "real" ? "Costo real" : "Estimado"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="max-w-xs text-sm leading-7 text-stone-700">{product.recommendedAction}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          <section className="soft-panel rounded-[1.8rem] p-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
              <article className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                  {dashboard.aiModule.title}
                </p>
                <h2 className="mt-2 font-serif text-3xl text-stone-900">Consulta ejecutiva</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">{dashboard.aiModule.description}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {dashboard.aiModule.suggestedQuestions.map((suggestedQuestion) => (
                    <button
                      className="rounded-full border border-stone-200 bg-[#fff8f3] px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-400"
                      disabled={isAsking}
                      key={suggestedQuestion}
                      onClick={() => {
                        void submitQuestion(suggestedQuestion);
                      }}
                      type="button"
                    >
                      {suggestedQuestion}
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid gap-3">
                  <textarea
                    className="min-h-32 w-full rounded-[1.4rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm leading-7 text-stone-900 outline-none transition focus:border-stone-500"
                    onChange={(event) => {
                      setQuestion(event.target.value);
                    }}
                    placeholder="Ejemplo: que deberia atacar primero hoy, recompra o inventario?"
                    value={question}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-stone-500">
                      Arquitectura lista para OpenAI despues. Hoy responde con contexto real y reglas.
                    </p>
                    <button
                      className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isAsking}
                      onClick={() => {
                        void submitQuestion();
                      }}
                      type="button"
                    >
                      {isAsking ? "Analizando..." : "Preguntar"}
                    </button>
                  </div>
                  {askError ? <NoticeBanner kind="error" message={askError} /> : null}
                </div>
              </article>

              <article className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Respuesta</p>
                {answer ? (
                  <div className="mt-3 space-y-4">
                    <p className="text-sm leading-8 text-stone-800">{answer.answer}</p>

                    <div className="grid gap-3">
                      <div className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Hechos de soporte</p>
                        <div className="mt-3 space-y-2 text-sm leading-7 text-stone-700">
                          {answer.supportingFacts.map((fact) => (
                            <p key={fact}>{fact}</p>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[1.2rem] bg-[#f6faf5] px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Siguientes pasos</p>
                        <div className="mt-3 space-y-2 text-sm leading-7 text-stone-700">
                          {answer.suggestedActions.map((action) => (
                            <p key={action}>{action}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyBlock message="Escribe una pregunta o usa uno de los prompts sugeridos para obtener una recomendacion ejecutiva." />
                )}
              </article>
            </div>
          </section>

          <section className="soft-panel rounded-[1.8rem] p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <MetaPill
                label="Mejor clienta a contactar"
                value={topCustomer ? `${topCustomer.name} / score ${topCustomer.repurchaseScore}` : "Sin dato"}
              />
              <MetaPill
                label="Producto mas fuerte hoy"
                value={topProduct ? `${topProduct.name} / score ${topProduct.intelligenceScore}` : "Sin dato"}
              />
            </div>
          </section>
        </>
      ) : (
        <section className="soft-panel rounded-[1.8rem] p-6">
          <EmptyBlock message={getLoadMessage(errorReason)} />
        </section>
      )}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: IntelligenceKPI }) {
  return (
    <article className={`rounded-[1.4rem] border px-4 py-4 ${getToneClasses(kpi.tone)}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">{kpi.label}</p>
      <p className="mt-2 text-2xl font-semibold">{kpi.displayValue}</p>
      {kpi.helper ? <p className="mt-3 text-sm leading-7 opacity-80">{kpi.helper}</p> : null}
    </article>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getScoreClasses(score)}`}>
      {score}/100
    </span>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
      <span className="font-semibold text-stone-900">{value}</span> {label}
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-white px-4 py-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-stone-900">{value}</p>
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-stone-300 bg-white px-5 py-6 text-sm leading-7 text-stone-500">
      {message}
    </div>
  );
}

function NoticeBanner({
  kind,
  message,
}: {
  kind: "error" | "success";
  message: string;
}) {
  return (
    <div
      className={`rounded-[1.4rem] border px-4 py-4 text-sm leading-7 ${
        kind === "success"
          ? "border-[#d8e3cf] bg-[#f5faf1] text-[#476638]"
          : "border-[#ead0c7] bg-[#fff6f2] text-[#8a4d3b]"
      }`}
    >
      {message}
    </div>
  );
}
