export type CRMContactLifecycleStatus = "lead" | "customer" | "repeat_customer" | "inactive";
export type CRMTaskStatus = "pending" | "done" | "cancelled";
export type CRMTaskType = "follow_up" | "abandoned_cart" | "repurchase" | "post_purchase" | "manual";
export type CRMReminderStatus = "pending" | "ready" | "sent_manual" | "skipped" | "cancelled";
export type CRMReminderChannel = "whatsapp" | "email";
export type CRMReminderType =
  | "skin_quiz_follow_up"
  | "abandoned_cart"
  | "post_purchase"
  | "repurchase_30_days"
  | "customer_inactive"
  | "manual";
export type CRMAutomationTriggerType =
  | "skin_quiz_completed"
  | "checkout_completed"
  | "abandoned_cart"
  | "post_purchase"
  | "repurchase_due"
  | "customer_inactive";
export type CRMAutomationRunStatus = "pending" | "executed" | "skipped" | "failed";

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

export type CRMReminderContact = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  whatsapp: string | null;
  mainGoal: string | null;
  skinType: string | null;
  acceptedMarketing: boolean;
};

export type CRMReminderSummary = {
  id: number;
  channel: CRMReminderChannel;
  reminderType: CRMReminderType;
  status: CRMReminderStatus;
  scheduledFor: string;
  renderedSubject: string | null;
  renderedBody: string;
  templateId: number | null;
  templateName: string | null;
  relatedOrderId: number | null;
  relatedEventId: number | null;
  sentManuallyAt: string | null;
  skippedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact: CRMReminderContact;
};

export type CRMReminderDetail = CRMReminderSummary & {
  reminderReason: string;
};

export type CRMMessageTemplate = {
  id: number;
  name: string;
  channel: CRMReminderChannel;
  reminderType: CRMReminderType;
  subject: string | null;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  reminders: CRMReminderSummary[];
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

export type CRMReminderFilters = {
  channel?: CRMReminderChannel;
  date_from?: string;
  date_to?: string;
  reminder_type?: CRMReminderType;
  search?: string;
  status?: CRMReminderStatus;
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

export type CRMReminderCreateInput = {
  channel: CRMReminderChannel;
  scheduledFor: string;
  renderedSubject?: string | null;
  renderedBody: string;
};

export type CRMReminderUpdateInput = {
  status?: CRMReminderStatus;
  scheduledFor?: string | null;
  renderedSubject?: string | null;
  renderedBody?: string | null;
};

export type CRMMessageTemplateUpdateInput = {
  subject?: string | null;
  body?: string | null;
  isActive?: boolean;
};

export type CRMMessageTemplatePreviewInput = {
  contactId?: number | null;
  subject?: string | null;
  body?: string | null;
  context?: Record<string, string>;
};

export type CRMMessageTemplatePreviewResult = {
  renderedSubject: string | null;
  renderedBody: string;
  variables: string[];
};

export type CRMAutomationRule = {
  id: number;
  name: string;
  triggerType: CRMAutomationTriggerType;
  delayHours: number;
  taskType: CRMTaskType;
  taskTitleTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CRMAutomationRuleUpdateInput = {
  delayHours?: number;
  taskTitleTemplate?: string;
  isActive?: boolean;
};

export type CRMAutomationRun = {
  id: number;
  ruleId: number;
  ruleName: string;
  contactId: number;
  contactName: string;
  sourceEventId: number | null;
  triggerType: CRMAutomationTriggerType;
  taskType: CRMTaskType;
  dueAt: string;
  status: CRMAutomationRunStatus;
  executedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
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

export const CRM_REMINDER_STATUS_OPTIONS: Array<{
  label: string;
  value: CRMReminderStatus;
}> = [
  { value: "pending", label: "Pendiente" },
  { value: "ready", label: "Lista" },
  { value: "sent_manual", label: "Enviada manualmente" },
  { value: "skipped", label: "Omitida" },
  { value: "cancelled", label: "Cancelada" },
];

export const CRM_REMINDER_CHANNEL_OPTIONS: Array<{
  label: string;
  value: CRMReminderChannel;
}> = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

export const CRM_REMINDER_TYPE_OPTIONS: Array<{
  label: string;
  value: CRMReminderType;
}> = [
  { value: "skin_quiz_follow_up", label: "Skin Quiz" },
  { value: "post_purchase", label: "Post compra" },
  { value: "repurchase_30_days", label: "Recompra 30 dias" },
  { value: "customer_inactive", label: "Cliente inactivo" },
  { value: "abandoned_cart", label: "Checkout abandonado" },
  { value: "manual", label: "Manual" },
];

export function buildCrmContactName(contact: Pick<CRMContactSummary, "firstName" | "lastName">) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
}

export function buildCrmWhatsAppHref(whatsapp: string, name: string) {
  const normalizedPhone = whatsapp.replace(/\D/g, "");
  const message = `Hola ${name}, vi tu actividad en Skin Hearten. Quieres que te ayude a completar tu rutina?`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function buildCrmReminderWhatsAppHref(whatsapp: string, message: string) {
  const normalizedPhone = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function buildCrmReminderMailtoHref(email: string, subject: string | null, body: string) {
  const params = new URLSearchParams();
  if (subject) {
    params.set("subject", subject);
  }
  params.set("body", body);
  return `mailto:${email}?${params.toString()}`;
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

export function getCrmReminderStatusLabel(status: CRMReminderStatus) {
  return CRM_REMINDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function getCrmReminderChannelLabel(channel: CRMReminderChannel) {
  return CRM_REMINDER_CHANNEL_OPTIONS.find((option) => option.value === channel)?.label ?? channel;
}

export function getCrmReminderTypeLabel(type: CRMReminderType) {
  return CRM_REMINDER_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function getCrmAutomationTriggerLabel(trigger: CRMAutomationTriggerType) {
  switch (trigger) {
    case "skin_quiz_completed":
      return "Skin Quiz completado";
    case "checkout_completed":
      return "Checkout completado";
    case "abandoned_cart":
      return "Carrito abandonado";
    case "post_purchase":
      return "Post compra";
    case "repurchase_due":
      return "Recompra pendiente";
    case "customer_inactive":
      return "Cliente inactivo";
    default:
      return trigger;
  }
}

export function getCrmAutomationRunStatusLabel(status: CRMAutomationRunStatus) {
  switch (status) {
    case "executed":
      return "Ejecutada";
    case "skipped":
      return "Omitida";
    case "failed":
      return "Fallida";
    case "pending":
    default:
      return "Pendiente";
  }
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
