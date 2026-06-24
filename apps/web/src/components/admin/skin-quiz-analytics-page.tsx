"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { SkinQuizAnalyticsResponse } from "@/lib/admin-skin-quiz-analytics";
import {
  buildAdminLeadWhatsAppHref,
  getSkinQuizLeadSourceLabel,
  getSkinQuizLeadStatusLabel,
  type AdminSkinQuizLeadStatus,
} from "@/lib/admin-skin-quiz-leads";
import { formatDateTime } from "@/lib/format";

type AnalyticsApiResponse =
  | { ok: true; data: SkinQuizAnalyticsResponse }
  | { ok: false; reason: string };

function getLoadMessage(reason: string | null) {
  if (!reason) {
    return "Aun no hay leads suficientes para mostrar tendencias del Skin Quiz.";
  }

  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para consultar las metricas del Skin Quiz desde el panel admin.";
  }

  if (reason === "auth_failed") {
    return "Tu sesion de SuperAdmin no es valida o expiro. Vuelve a iniciar sesion.";
  }

  return "No fue posible cargar el reporte por ahora. Si la API local no esta disponible, el panel muestra este estado vacio sin romper la vista.";
}

function getStatusBadgeClasses(status: AdminSkinQuizLeadStatus) {
  switch (status) {
    case "contacted":
      return "border-[#d9c4b2] bg-[#fff3ea] text-[#8a5a2b]";
    case "interested":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "purchased":
      return "border-[#cfe0df] bg-[#eef8f7] text-[#2c6160]";
    case "not_interested":
      return "border-stone-200 bg-stone-100 text-stone-600";
    case "new":
    default:
      return "border-[#e7d3c1] bg-[#fff8f3] text-stone-800";
  }
}

export function SkinQuizAnalyticsPage() {
  const [analytics, setAnalytics] = useState<SkinQuizAnalyticsResponse | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/admin/skin-quiz-analytics", {
          cache: "no-store",
        });
        const payload = (await response.json()) as AnalyticsApiResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setAnalytics(null);
          setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
          setIsLoading(false);
          return;
        }

        setAnalytics(payload.data);
        setErrorReason(null);
      } catch {
        if (!isMounted) {
          return;
        }

        setAnalytics(null);
        setErrorReason("fetch_failed");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="soft-panel rounded-[1.8rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Skin Quiz Analytics</p>
            <h1 className="mt-2 font-serif text-4xl text-stone-900">Metricas del advisor comercial</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
              Sigue volumen de leads, objetivos principales, perfil de piel y avance comercial sin salir del panel admin.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
              {isLoading
                ? "Cargando..."
                : analytics?.completionRateEstimate != null
                  ? `Completion estimada ${analytics.completionRateEstimate}%`
                  : "Completion estimada no disponible"}
            </div>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              href="/admin/skin-quiz-leads"
            >
              Ver leads
            </Link>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="soft-panel rounded-[1.8rem] p-6">
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-12 text-center text-sm text-stone-500">
            Cargando metricas del Skin Quiz...
          </div>
        </section>
      ) : !analytics ? (
        <section className="soft-panel rounded-[1.8rem] p-6">
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
            <p className="font-serif text-2xl text-stone-900">Sin reporte disponible por ahora</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">{getLoadMessage(errorReason)}</p>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Leads totales" value={analytics.totalLeads} />
            <KpiCard label="Leads hoy" value={analytics.leadsToday} />
            <KpiCard label="Leads semana" value={analytics.leadsThisWeek} />
            <KpiCard label="Leads mes" value={analytics.leadsThisMonth} />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <BarChartCard
              items={analytics.topGoals.map((item) => ({ label: item.goal, value: item.count }))}
              title="Objetivos principales"
            />
            <BarChartCard
              items={analytics.topSkinTypes.map((item) => ({ label: item.skinType, value: item.count }))}
              title="Tipos de piel"
            />
            <BarChartCard
              items={analytics.topAgeRanges.map((item) => ({ label: item.ageRange, value: item.count }))}
              title="Rangos de edad"
            />
            <BarChartCard
              items={analytics.statusBreakdown.map((item) => ({
                label: getSkinQuizLeadStatusLabel(item.status),
                value: item.count,
              }))}
              title="Status comercial"
            />
            <div className="xl:col-span-2">
              <BarChartCard
                items={analytics.sourceBreakdown.map((item) => ({
                  label: getSkinQuizLeadSourceLabel(item.source),
                  value: item.count,
                }))}
                title="Origen"
              />
            </div>
          </section>

          <section className="soft-panel rounded-[1.8rem] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Recent leads</p>
                <h2 className="mt-2 font-serif text-3xl text-stone-900">Ultimos registros capturados</h2>
              </div>
              <Link className="text-sm font-medium text-stone-700 underline-offset-4 hover:underline" href="/admin/skin-quiz-leads">
                Ir a seguimiento comercial
              </Link>
            </div>

            {analytics.recentLeads.length === 0 ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-stone-300 bg-white px-5 py-10 text-center text-sm text-stone-600">
                Todavia no hay leads recientes para mostrar.
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-stone-200 text-left">
                    <thead className="bg-[#fff8f3] text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      <tr>
                        <th className="px-4 py-4">Nombre</th>
                        <th className="px-4 py-4">WhatsApp</th>
                        <th className="px-4 py-4">Objetivo</th>
                        <th className="px-4 py-4">Tipo de piel</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                      {analytics.recentLeads.map((lead) => (
                        <tr key={lead.id}>
                          <td className="px-4 py-4 font-semibold text-stone-900">{lead.name}</td>
                          <td className="px-4 py-4">
                            <a
                              className="font-medium text-[#1a6f4e] transition hover:text-[#14553c]"
                              href={buildAdminLeadWhatsAppHref(lead.whatsapp, lead.name)}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {lead.whatsapp}
                            </a>
                          </td>
                          <td className="px-4 py-4">{lead.goal}</td>
                          <td className="px-4 py-4">{lead.skinType}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(lead.status)}`}
                            >
                              {getSkinQuizLeadStatusLabel(lead.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-stone-600">{formatDateTime(lead.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="soft-panel rounded-[1.8rem] p-6">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function BarChartCard({
  items,
  title,
}: {
  items: Array<{ label: string; value: number }>;
  title: string;
}) {
  const maxValue = items.reduce((max, item) => Math.max(max, item.value), 0);

  return (
    <div className="soft-panel rounded-[1.8rem] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">{title}</p>
      {items.length === 0 ? (
        <div className="mt-5 rounded-[1.4rem] border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-sm text-stone-500">
          Sin datos suficientes para este bloque.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <div key={`${title}-${item.label}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-800">{item.label}</p>
                <p className="text-sm text-stone-500">{item.value}</p>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-stone-950 via-stone-700 to-stone-400"
                  style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
