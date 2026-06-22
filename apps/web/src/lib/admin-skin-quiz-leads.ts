import type { SkinQuizAnswers, SkinQuizResult } from "@/lib/skin-quiz";

export type AdminSkinQuizLeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "purchased"
  | "not_interested";

export type AdminSkinQuizLead = {
  id: number;
  name: string;
  whatsapp: string;
  email: string | null;
  acceptedMarketing: boolean;
  status: AdminSkinQuizLeadStatus;
  internalNotes: string | null;
  lastContactedAt: string | null;
  source: string;
  createdAt: string;
  resultSummary: string;
  primaryGoal: string;
  skinType: string;
};

export type AdminSkinQuizLeadDetail = AdminSkinQuizLead & {
  answersJson: Partial<SkinQuizAnswers>;
  resultJson: SkinQuizResult;
  userAgent: string | null;
};

export type AdminSkinQuizLeadFilters = {
  date_from?: string;
  date_to?: string;
  search?: string;
  status?: AdminSkinQuizLeadStatus;
  source?: string;
};

export type AdminSkinQuizLeadUpdateInput = {
  status?: AdminSkinQuizLeadStatus;
  internalNotes?: string | null;
  lastContactedAt?: string | null;
};

export const SKIN_QUIZ_LEAD_STATUS_OPTIONS: Array<{
  label: string;
  value: AdminSkinQuizLeadStatus;
}> = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "interested", label: "Interesado" },
  { value: "purchased", label: "Compro" },
  { value: "not_interested", label: "Sin interes" },
];

export function buildAdminLeadWhatsAppHref(whatsapp: string, name: string) {
  const normalizedPhone = whatsapp.replace(/\D/g, "");
  const message = `Hola ${name}, vi que hiciste el Skin Quiz en Skin Hearten. Quieres que te ayude a completar tu rutina?`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function getSkinQuizLeadSourceLabel(source: string) {
  switch (source) {
    case "auto_home":
      return "Auto Home";
    case "header":
      return "Header";
    case "home":
      return "Home";
    default:
      return source;
  }
}

export function getSkinQuizLeadStatusLabel(status: AdminSkinQuizLeadStatus) {
  return SKIN_QUIZ_LEAD_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}
