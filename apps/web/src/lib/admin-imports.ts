export type AdminImportJobStatus =
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed";

export type AdminImportType = "customers" | "orders" | "products";

export type AdminImportJobError = {
  rowNumber: number;
  message: string;
  rawRow: Record<string, string>;
};

export type AdminImportJobSummary = {
  id: number;
  source: string;
  importType: AdminImportType | string;
  filename: string;
  status: AdminImportJobStatus | string;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  createdByUserId: number | null;
  createdAt: string;
  completedAt: string | null;
};

export type AdminImportJobDetail = AdminImportJobSummary & {
  errorReportJson: AdminImportJobError[];
  notes: string | null;
};

export function getAdminImportTypeLabel(importType: string) {
  switch (importType) {
    case "customers":
      return "Clientes";
    case "orders":
      return "Pedidos";
    case "products":
      return "Productos";
    default:
      return importType;
  }
}

export function getAdminImportStatusLabel(status: string) {
  switch (status) {
    case "processing":
      return "Procesando";
    case "completed":
      return "Completado";
    case "completed_with_errors":
      return "Completado con errores";
    case "failed":
      return "Fallido";
    default:
      return status;
  }
}
