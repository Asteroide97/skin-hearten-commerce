export type InsightTone = "neutral" | "positive" | "warning" | "critical";
export type InsightPriority = "low" | "medium" | "high" | "critical";

export type IntelligenceExecutiveSummary = {
  headline: string;
  summary: string;
  bullets: string[];
};

export type IntelligenceKPI = {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  helper: string | null;
  tone: InsightTone;
};

export type IntelligenceSourceSnapshot = {
  id: string;
  title: string;
  headline: string;
  details: string[];
};

export type IntelligenceRecommendation = {
  id: string;
  title: string;
  description: string;
  priority: InsightPriority;
  source: string;
  impactLabel: string;
  impactValue: string;
  suggestedAction: string;
};

export type IntelligenceCustomerScore = {
  contactId: number | null;
  customerId: number | null;
  name: string;
  email: string | null;
  whatsapp: string | null;
  lifecycleStatus: string;
  repurchaseScore: number;
  scoreBand: string;
  mainGoal: string | null;
  skinType: string | null;
  lastOrderAt: string | null;
  orderCount: number;
  averageTicket: number;
  totalSpent: number;
  suggestedAction: string;
  reasons: string[];
};

export type IntelligenceProductScore = {
  productId: number;
  name: string;
  slug: string;
  brand: string;
  category: string;
  intelligenceScore: number;
  scoreBand: string;
  rotationScore: number;
  conversionScore: number;
  reviewScore: number;
  inventoryScore: number;
  marginScore: number;
  unitsSold: number;
  revenue: number;
  stock: number;
  averageRating: number;
  reviewCount: number;
  marginPercent: number;
  marginSource: string;
  recommendedAction: string;
};

export type IntelligenceAiModule = {
  title: string;
  description: string;
  suggestedQuestions: string[];
  provider: string;
  openAiReady: boolean;
};

export type IntelligenceDashboard = {
  generatedAt: string;
  executiveSummary: IntelligenceExecutiveSummary;
  kpis: IntelligenceKPI[];
  snapshots: IntelligenceSourceSnapshot[];
  recommendations: IntelligenceRecommendation[];
  customerScores: IntelligenceCustomerScore[];
  productScores: IntelligenceProductScore[];
  aiModule: IntelligenceAiModule;
};

export type IntelligenceAskResponse = {
  provider: string;
  openAiReady: boolean;
  answer: string;
  supportingFacts: string[];
  suggestedActions: string[];
  suggestedQuestions: string[];
};

export function getIntelligencePriorityLabel(priority: InsightPriority) {
  switch (priority) {
    case "critical":
      return "Critica";
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
    default:
      return "Baja";
  }
}

export function getIntelligenceScoreBandLabel(band: string) {
  switch (band) {
    case "alto":
      return "Alto";
    case "medio":
      return "Medio";
    case "bajo":
    default:
      return "Bajo";
  }
}
