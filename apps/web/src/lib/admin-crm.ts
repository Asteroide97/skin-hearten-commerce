export type CRMContactLifecycleStatus = "lead" | "customer" | "repeat_customer" | "inactive";
export type CRMTaskStatus = "pending" | "done" | "cancelled";
export type CRMTaskType = "follow_up" | "abandoned_cart" | "repurchase" | "post_purchase" | "manual";

export type CRMContactSummary = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  whatsapp: string | null;
  source: string;
  lifecycleStatus: CRMContactLifecycleStatus;
  skinType: string | null;
  mainGoal: string | null;
  ageRange: string | null;
  acceptedMarketing: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CRMEvent = {
  id: number;
  contactId: number | null;
  anonymousId: string | null;
  eventType: string;
  payloadJson: Record<string, unknown>;
  source: string;
  createdAt: string;
};

export type CRMNote = {
  id: number;
  contactId: number;
  note: string;
  createdByUserId: number | null;
  createdAt: string;
};

export type CRMTask = {
  id: number;
  contactId: number;
  title: string;
  dueAt: string | null;
  status: CRMTaskStatus;
  taskType: CRMTaskType;
  createdAt: string;
  completedAt: string | null;
};

export type CRMPurchaseSummary = {
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  lastOrderNumber: string | null;
};

export type CRMContactDetail = CRMContactSummary & {
  events: CRMEvent[];
  notes: CRMNote[];
  tasks: CRMTask[];
  purchaseSummary: CRMPurchaseSummary;
};

export type CRMContactFilters = {
  accepted_marketing?: "true" | "false";
  lifecycle_status?: CRMContactLifecycleStatus;
  main_goal?: string;
  search?: string;
  skin_type?: string;
};

export type CRMContactUpdateInput = {
  lifecycleStatus?: CRMContactLifecycleStatus;
  skinType?: string | null;
  mainGoal?: string | null;
  acceptedMarketing?: boolean;
};

export type CRMNoteCreateInput = {
  note: string;
};

export type CRMTaskCreateInput = {
  title: string;
  dueAt?: string | null;
  taskType?: CRMTaskType;
};

export type CRMTaskUpdateInput = {
  status: CRMTaskStatus;
};

export const CRM_LIFECYCLE_STATUS_OPTIONS: Array<{
  label: string;
  value: CRMContactLifecycleStatus;
}> = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Cliente" },
  { value: "repeat_customer", label: "Cliente recurrente" },
  { value: "inactive", label: "Inactivo" },
];

export const CRM_TASK_TYPE_OPTIONS: Array<{
  label: string;
  value: CRMTaskType;
}> = [
  { value: "manual", label: "Manual" },
  { value: "follow_up", label: "Seguimiento" },
  { value: "abandoned_cart", label: "Carrito abandonado" },
  { value: "repurchase", label: "Recompra" },
  { value: "post_purchase", label: "Post compra" },
];

export function buildCrmContactName(contact: Pick<CRMContactSummary, "firstName" | "lastName">) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
}

export function buildCrmWhatsAppHref(whatsapp: string, name: string) {
  const normalizedPhone = whatsapp.replace(/\D/g, "");
  const message = `Hola ${name}, vi tu actividad en Skin Hearten. Quieres que te ayude a completar tu rutina?`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function getCrmLifecycleStatusLabel(status: CRMContactLifecycleStatus) {
  return CRM_LIFECYCLE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function getCrmTaskStatusLabel(status: CRMTaskStatus) {
  switch (status) {
    case "done":
      return "Hecha";
    case "cancelled":
      return "Cancelada";
    case "pending":
    default:
      return "Pendiente";
  }
}

export function getCrmTaskTypeLabel(type: CRMTaskType) {
  return CRM_TASK_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function getCrmSkinTypeLabel(value: string | null) {
  switch (value) {
    case "seca":
      return "Seca";
    case "mixta":
      return "Mixta";
    case "grasa":
      return "Grasa";
    case "sensible":
      return "Sensible";
    case "no_segura":
      return "No estoy segura";
    default:
      return value ? value.replaceAll("_", " ") : "Sin definir";
  }
}

export function getCrmMainGoalLabel(value: string | null) {
  switch (value) {
    case "manchas":
      return "Manchas";
    case "acne":
      return "Acne";
    case "lineas_expresion":
      return "Lineas de expresion";
    case "hidratacion":
      return "Hidratacion";
    case "luminosidad":
      return "Luminosidad";
    case "proteccion_solar":
      return "Proteccion solar";
    default:
      return value ? value.replaceAll("_", " ") : "Sin definir";
  }
}

export function getCrmSourceLabel(source: string) {
  switch (source) {
    case "skin_quiz":
      return "Skin Quiz";
    case "checkout":
      return "Checkout";
    default:
      return source;
  }
}

export function getCrmEventLabel(eventType: string) {
  switch (eventType) {
    case "skin_quiz_completed":
      return "Skin Quiz completado";
    case "checkout_completed":
      return "Checkout completado";
    case "order_created":
      return "Orden creada";
    default:
      return eventType.replaceAll("_", " ");
  }
}

export function getCrmAgeRangeLabel(value: string | null) {
  switch (value) {
    case "18_24":
      return "18 a 24";
    case "25_34":
      return "25 a 34";
    case "35_44":
      return "35 a 44";
    case "45_plus":
      return "45+";
    default:
      return value ? value.replaceAll("_", " ") : "Sin definir";
  }
}
