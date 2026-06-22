"use client";

import { useEffect, useMemo, useState } from "react";

import { ArrowUpRightIcon } from "@/components/shared/icons";
import {
  getAdminImportStatusLabel,
  getAdminImportTypeLabel,
  type AdminImportJobDetail,
  type AdminImportJobSummary,
  type AdminImportType,
} from "@/lib/admin-imports";
import { formatDateTime } from "@/lib/format";

type JobsApiResponse =
  | { ok: true; data: AdminImportJobSummary[] }
  | { ok: false; reason: string };

type JobDetailApiResponse =
  | { ok: true; data: AdminImportJobDetail }
  | { ok: false; reason: string };

type Notice = {
  kind: "error" | "success";
  message: string;
} | null;

type SelectedFiles = Partial<Record<AdminImportType, File | null>>;

function getPageMessage(reason: string | null) {
  if (!reason) {
    return "Todavia no hay importaciones ejecutadas desde Shopify.";
  }
  if (reason === "api_url_missing") {
    return "Configura NEXT_PUBLIC_API_URL para subir CSV reales a FastAPI desde este panel.";
  }
  if (reason === "auth_failed") {
    return "No pudimos autenticar el panel admin contra la API. Revisa las credenciales del entorno.";
  }
  return "No fue posible cargar el historial de importaciones por ahora.";
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "completed":
      return "border-[#d8e3cf] bg-[#f3faf0] text-[#476638]";
    case "completed_with_errors":
      return "border-[#ecd9b7] bg-[#fff8e8] text-[#8a632f]";
    case "failed":
      return "border-[#ead0c7] bg-[#fff6f2] text-[#8a4d3b]";
    case "processing":
    default:
      return "border-[#cfe0df] bg-[#eef8f7] text-[#2c6160]";
  }
}

export function ShopifyImportsPage() {
  const [jobs, setJobs] = useState<AdminImportJobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<Notice>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>({});
  const [uploadingType, setUploadingType] = useState<AdminImportType | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, AdminImportJobDetail>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const activeJob = selectedJobId ? detailCache[selectedJobId] : null;

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/admin/imports", { cache: "no-store" });
        const payload = (await response.json()) as JobsApiResponse;
        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          setJobs([]);
          setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
          return;
        }

        setJobs(payload.data);
        setErrorReason(null);
      } catch {
        if (!cancelled) {
          setJobs([]);
          setErrorReason("fetch_failed");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  const jobKpis = useMemo(() => {
    return {
      total: jobs.length,
      completed: jobs.filter((job) => job.status === "completed").length,
      withErrors: jobs.filter((job) => job.status === "completed_with_errors").length,
      failed: jobs.filter((job) => job.status === "failed").length,
    };
  }, [jobs]);

  async function refreshJobs() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/imports", { cache: "no-store" });
      const payload = (await response.json()) as JobsApiResponse;

      if (!response.ok || !payload.ok) {
        setJobs([]);
        setErrorReason(payload.ok ? "fetch_failed" : payload.reason);
        return;
      }

      setJobs(payload.data);
      setErrorReason(null);
    } catch {
      setJobs([]);
      setErrorReason("fetch_failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadJobDetail(jobId: number, force = false) {
    if (!force && detailCache[jobId]) {
      return;
    }

    setIsDetailLoading(true);
    setDetailError(null);

    try {
      const response = await fetch(`/api/admin/imports/${jobId}`, { cache: "no-store" });
      const payload = (await response.json()) as JobDetailApiResponse;
      if (!response.ok || !payload.ok) {
        setDetailError(payload.ok ? "fetch_failed" : payload.reason);
        return;
      }

      setDetailCache((current) => ({
        ...current,
        [jobId]: payload.data,
      }));
    } catch {
      setDetailError("fetch_failed");
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleUpload(importType: AdminImportType) {
    const file = selectedFiles[importType];
    if (!file) {
      setPageNotice({
        kind: "error",
        message: "Selecciona un archivo CSV antes de iniciar la importacion.",
      });
      return;
    }

    setUploadingType(importType);
    setPageNotice(null);

    try {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const response = await fetch(`/api/admin/imports/shopify/${importType}`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as JobDetailApiResponse;

      if (!response.ok || !payload.ok) {
        setPageNotice({
          kind: "error",
          message: "No pudimos procesar el CSV. Revisa que NEXT_PUBLIC_API_URL y la API local esten disponibles.",
        });
        return;
      }

      setDetailCache((current) => ({
        ...current,
        [payload.data.id]: payload.data,
      }));
      setSelectedJobId(payload.data.id);
      setSelectedFiles((current) => ({
        ...current,
        [importType]: null,
      }));
      setPageNotice({
        kind: payload.data.failedRows > 0 ? "error" : "success",
        message:
          payload.data.failedRows > 0
            ? `Importacion ${getAdminImportTypeLabel(importType).toLowerCase()} completada con ${payload.data.failedRows} filas con error.`
            : `Importacion ${getAdminImportTypeLabel(importType).toLowerCase()} completada correctamente.`,
      });
      await refreshJobs();
    } catch {
      setPageNotice({
        kind: "error",
        message: "No pudimos subir el archivo CSV por ahora.",
      });
    } finally {
      setUploadingType(null);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <section className="soft-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">Importaciones</p>
          <h1 className="mt-2 font-serif text-4xl text-stone-900">Importar Shopify</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            Sube CSV exportados desde Shopify para traer clientes, pedidos y productos sin tocar el storefront. Cada importacion es idempotente, continua aunque algunas filas fallen y deja un reporte por job.
          </p>

          {pageNotice ? <NoticeBanner className="mt-5" notice={pageNotice} /> : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <UploadCard
              description="Exporta Customers desde Shopify Admin y trae clientes, direcciones default y CRM base."
              file={selectedFiles.customers ?? null}
              importType="customers"
              isUploading={uploadingType === "customers"}
              onFileChange={(file) => {
                setSelectedFiles((current) => ({ ...current, customers: file }));
              }}
              onUpload={() => {
                void handleUpload("customers");
              }}
              title="CSV de clientes"
            />
            <UploadCard
              description="Exporta Orders y sincroniza customers, direcciones, ordenes, items y pagos historicos."
              file={selectedFiles.orders ?? null}
              importType="orders"
              isUploading={uploadingType === "orders"}
              onFileChange={(file) => {
                setSelectedFiles((current) => ({ ...current, orders: file }));
              }}
              onUpload={() => {
                void handleUpload("orders");
              }}
              title="CSV de pedidos"
            />
            <UploadCard
              description="Exporta Products para crear o actualizar catalogo, marcas, categorias e imagenes principales."
              file={selectedFiles.products ?? null}
              importType="products"
              isUploading={uploadingType === "products"}
              onFileChange={(file) => {
                setSelectedFiles((current) => ({ ...current, products: file }));
              }}
              onUpload={() => {
                void handleUpload("products");
              }}
              title="CSV de productos"
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Jobs totales" value={String(jobKpis.total)} />
          <KpiCard label="Completados" value={String(jobKpis.completed)} />
          <KpiCard label="Con errores" value={String(jobKpis.withErrors)} />
          <KpiCard label="Fallidos" value={String(jobKpis.failed)} />
        </section>

        <section className="soft-panel rounded-[2rem] p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Guia rapida</p>
              <h2 className="mt-2 font-serif text-3xl text-stone-900">Como exportar desde Shopify</h2>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-500"
              onClick={() => {
                void refreshJobs();
              }}
              type="button"
            >
              Recargar jobs
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <GuideCard
              steps={[
                "Shopify Admin > Customers > Export",
                "Usa el CSV completo para traer email, telefono y direccion default",
                "La importacion hace upsert por email o telefono normalizado",
              ]}
              title="Clientes"
            />
            <GuideCard
              steps={[
                "Shopify Admin > Orders > Export",
                "Se agrupan filas repetidas por Name para reconstruir el pedido",
                "La importacion crea ordenes, order_items y pagos historicos",
              ]}
              title="Pedidos"
            />
            <GuideCard
              steps={[
                "Shopify Admin > Products > Export",
                "Se agrupan variantes por Handle para evitar duplicados",
                "La importacion usa Vendor como marca y Type como categoria",
              ]}
              title="Productos"
            />
          </div>
        </section>

        <section className="soft-panel rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Historial</p>
              <h2 className="mt-2 font-serif text-3xl text-stone-900">Import jobs recientes</h2>
            </div>
            <p className="text-sm text-stone-500">
              {isLoading ? "Cargando..." : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`}
            </p>
          </div>

          {isLoading ? (
            <EmptyBlock className="mt-6" message="Cargando historial de importaciones..." />
          ) : jobs.length === 0 ? (
            <EmptyBlock className="mt-6" message={getPageMessage(errorReason)} />
          ) : (
            <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200">
                  <thead className="bg-[#fffaf7]">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      <th className="px-5 py-4">Archivo</th>
                      <th className="px-5 py-4">Tipo</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Procesadas</th>
                      <th className="px-5 py-4">Exitosas</th>
                      <th className="px-5 py-4">Errores</th>
                      <th className="px-5 py-4">Fecha</th>
                      <th className="px-5 py-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {jobs.map((job) => (
                      <tr className="align-top text-sm text-stone-700" key={job.id}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-stone-900">{job.filename}</p>
                          <p className="mt-1 text-xs text-stone-500">#{job.id} · {job.source}</p>
                        </td>
                        <td className="px-5 py-4">{getAdminImportTypeLabel(job.importType)}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(job.status)}`}
                          >
                            {getAdminImportStatusLabel(job.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4">{job.processedRows}/{job.totalRows}</td>
                        <td className="px-5 py-4">{job.successRows}</td>
                        <td className="px-5 py-4">{job.failedRows}</td>
                        <td className="px-5 py-4">{formatDateTime(job.createdAt)}</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500"
                            onClick={() => {
                              setSelectedJobId(job.id);
                              void loadJobDetail(job.id);
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

      {selectedJobId ? (
        <div className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-[2px]">
          <div className="absolute inset-y-0 right-0 flex w-full justify-end">
            <button
              aria-label="Cerrar detalle"
              className="hidden flex-1 cursor-default lg:block"
              onClick={() => {
                setSelectedJobId(null);
              }}
              type="button"
            />
            <aside className="flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-stone-200 bg-[#fcfaf8] px-5 py-5 shadow-2xl sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Import job</p>
                  <h2 className="mt-2 font-serif text-3xl text-stone-900">
                    {activeJob?.filename ?? `Job #${selectedJobId}`}
                  </h2>
                </div>
                <button
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-500"
                  onClick={() => {
                    setSelectedJobId(null);
                  }}
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              {isDetailLoading && !activeJob ? (
                <EmptyBlock className="mt-6" message="Cargando detalle del job..." />
              ) : detailError && !activeJob ? (
                <EmptyBlock className="mt-6" message="No pudimos cargar el detalle del job por ahora." />
              ) : activeJob ? (
                <div className="mt-6 space-y-5 pb-10">
                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetaPill label="Tipo" value={getAdminImportTypeLabel(activeJob.importType)} />
                      <MetaPill label="Status" value={getAdminImportStatusLabel(activeJob.status)} />
                      <MetaPill label="Procesadas" value={`${activeJob.processedRows}/${activeJob.totalRows}`} />
                      <MetaPill label="Errores" value={String(activeJob.failedRows)} />
                    </div>
                    {activeJob.notes ? (
                      <div className="mt-4 rounded-[1.2rem] bg-[#fff8f3] px-4 py-4 text-sm leading-7 text-stone-700">
                        {activeJob.notes}
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Errores por fila</p>
                    <div className="mt-4 space-y-3">
                      {activeJob.errorReportJson.length === 0 ? (
                        <EmptyBlock message="Este job no reporto errores por fila." />
                      ) : (
                        activeJob.errorReportJson.map((errorEntry) => (
                          <article className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4" key={`${errorEntry.rowNumber}-${errorEntry.message}`}>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-stone-900">Fila {errorEntry.rowNumber}</p>
                                <p className="mt-1 text-sm leading-7 text-stone-700">{errorEntry.message}</p>
                              </div>
                              <button
                                className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-500"
                                onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(errorEntry.rawRow, null, 2)).catch(() => {});
                                }}
                                type="button"
                              >
                                <ArrowUpRightIcon className="h-4 w-4" />
                                Copiar fila
                              </button>
                            </div>
                            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-[1rem] bg-white px-3 py-3 text-xs leading-6 text-stone-600">
                              {JSON.stringify(errorEntry.rawRow, null, 2)}
                            </pre>
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

function UploadCard({
  description,
  file,
  importType,
  isUploading,
  onFileChange,
  onUpload,
  title,
}: {
  description: string;
  file: File | null;
  importType: AdminImportType;
  isUploading: boolean;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  title: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">{getAdminImportTypeLabel(importType)}</p>
      <h3 className="mt-2 font-serif text-2xl text-stone-900">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-stone-600">{description}</p>

      <div className="mt-5 space-y-3">
        <input
          accept=".csv,text/csv"
          className="block w-full rounded-[1.2rem] border border-stone-200 bg-[#fffaf7] px-4 py-3 text-sm text-stone-900 file:mr-4 file:rounded-full file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;
            onFileChange(nextFile);
          }}
          type="file"
        />
        <p className="text-xs text-stone-500">{file ? file.name : "Selecciona un CSV exportado desde Shopify."}</p>
        <button
          className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!file || isUploading}
          onClick={onUpload}
          type="button"
        >
          {isUploading ? "Importando..." : `Importar ${getAdminImportTypeLabel(importType).toLowerCase()}`}
        </button>
      </div>
    </div>
  );
}

function GuideCard({ steps, title }: { steps: string[]; title: string }) {
  return (
    <div className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-soft">
      <p className="font-serif text-2xl text-stone-900">{title}</p>
      <div className="mt-4 space-y-3">
        {steps.map((step) => (
          <div className="rounded-[1.2rem] bg-[#fff8f3] px-4 py-4 text-sm leading-7 text-stone-700" key={step}>
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-panel rounded-[1.8rem] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">{label}</p>
      <p className="mt-3 font-serif text-4xl text-stone-900">{value}</p>
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
