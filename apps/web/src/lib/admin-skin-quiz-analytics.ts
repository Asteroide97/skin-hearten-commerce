import type { AdminSkinQuizLeadStatus } from "@/lib/admin-skin-quiz-leads";

export type SkinQuizAnalyticsGoalCount = {
  goal: string;
  count: number;
};

export type SkinQuizAnalyticsSkinTypeCount = {
  skinType: string;
  count: number;
};

export type SkinQuizAnalyticsAgeRangeCount = {
  ageRange: string;
  count: number;
};

export type SkinQuizAnalyticsStatusCount = {
  status: AdminSkinQuizLeadStatus;
  count: number;
};

export type SkinQuizAnalyticsSourceCount = {
  source: string;
  count: number;
};

export type SkinQuizAnalyticsRecentLead = {
  id: number;
  name: string;
  whatsapp: string;
  goal: string;
  skinType: string;
  status: AdminSkinQuizLeadStatus;
  createdAt: string;
};

export type SkinQuizAnalyticsResponse = {
  totalLeads: number;
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  completionRateEstimate: number | null;
  topGoals: SkinQuizAnalyticsGoalCount[];
  topSkinTypes: SkinQuizAnalyticsSkinTypeCount[];
  topAgeRanges: SkinQuizAnalyticsAgeRangeCount[];
  statusBreakdown: SkinQuizAnalyticsStatusCount[];
  sourceBreakdown: SkinQuizAnalyticsSourceCount[];
  recentLeads: SkinQuizAnalyticsRecentLead[];
};
