import type { SkinQuizAnswers, SkinQuizResult } from "@/lib/skin-quiz";

export type AdminSkinQuizLead = {
  id: number;
  name: string;
  whatsapp: string;
  email: string | null;
  acceptedMarketing: boolean;
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
  source?: string;
};

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
