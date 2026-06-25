from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

InsightTone = Literal["neutral", "positive", "warning", "critical"]
InsightPriority = Literal["low", "medium", "high", "critical"]


class IntelligenceExecutiveSummaryRead(BaseModel):
    headline: str
    summary: str
    bullets: list[str]

    model_config = ConfigDict(populate_by_name=True)


class IntelligenceKPIRead(BaseModel):
    id: str
    label: str
    value: float
    display_value: str = Field(serialization_alias="displayValue")
    helper: str | None = None
    tone: InsightTone = "neutral"

    model_config = ConfigDict(populate_by_name=True)


class IntelligenceSourceSnapshotRead(BaseModel):
    id: str
    title: str
    headline: str
    details: list[str]

    model_config = ConfigDict(populate_by_name=True)


class IntelligenceRecommendationRead(BaseModel):
    id: str
    title: str
    description: str
    priority: InsightPriority
    source: str
    impact_label: str = Field(serialization_alias="impactLabel")
    impact_value: str = Field(serialization_alias="impactValue")
    suggested_action: str = Field(serialization_alias="suggestedAction")

    model_config = ConfigDict(populate_by_name=True)


class IntelligenceCustomerScoreRead(BaseModel):
    contact_id: int | None = Field(default=None, serialization_alias="contactId")
    customer_id: int | None = Field(default=None, serialization_alias="customerId")
    name: str
    email: str | None = None
    whatsapp: str | None = None
    lifecycle_status: str = Field(serialization_alias="lifecycleStatus")
    repurchase_score: int = Field(serialization_alias="repurchaseScore")
    score_band: str = Field(serialization_alias="scoreBand")
    main_goal: str | None = Field(default=None, serialization_alias="mainGoal")
    skin_type: str | None = Field(default=None, serialization_alias="skinType")
    last_order_at: datetime | None = Field(default=None, serialization_alias="lastOrderAt")
    order_count: int = Field(serialization_alias="orderCount")
    average_ticket: float = Field(serialization_alias="averageTicket")
    total_spent: float = Field(serialization_alias="totalSpent")
    suggested_action: str = Field(serialization_alias="suggestedAction")
    reasons: list[str]

    model_config = ConfigDict(populate_by_name=True)


class IntelligenceProductScoreRead(BaseModel):
    product_id: int = Field(serialization_alias="productId")
    name: str
    slug: str
    brand: str
    category: str
    intelligence_score: int = Field(serialization_alias="intelligenceScore")
    score_band: str = Field(serialization_alias="scoreBand")
    rotation_score: int = Field(serialization_alias="rotationScore")
    conversion_score: int = Field(serialization_alias="conversionScore")
    review_score: int = Field(serialization_alias="reviewScore")
    inventory_score: int = Field(serialization_alias="inventoryScore")
    margin_score: int = Field(serialization_alias="marginScore")
    units_sold: int = Field(serialization_alias="unitsSold")
    revenue: float
    stock: int
    average_rating: float = Field(serialization_alias="averageRating")
    review_count: int = Field(serialization_alias="reviewCount")
    margin_percent: float = Field(serialization_alias="marginPercent")
    margin_source: str = Field(serialization_alias="marginSource")
    recommended_action: str = Field(serialization_alias="recommendedAction")

    model_config = ConfigDict(populate_by_name=True)


class IntelligenceAiModuleRead(BaseModel):
    title: str
    description: str
    suggested_questions: list[str] = Field(serialization_alias="suggestedQuestions")
    provider: str
    open_ai_ready: bool = Field(serialization_alias="openAiReady")

    model_config = ConfigDict(populate_by_name=True)


class IntelligenceDashboardRead(BaseModel):
    generated_at: datetime = Field(serialization_alias="generatedAt")
    executive_summary: IntelligenceExecutiveSummaryRead = Field(serialization_alias="executiveSummary")
    kpis: list[IntelligenceKPIRead]
    snapshots: list[IntelligenceSourceSnapshotRead]
    recommendations: list[IntelligenceRecommendationRead]
    customer_scores: list[IntelligenceCustomerScoreRead] = Field(serialization_alias="customerScores")
    product_scores: list[IntelligenceProductScoreRead] = Field(serialization_alias="productScores")
    ai_module: IntelligenceAiModuleRead = Field(serialization_alias="aiModule")

    model_config = ConfigDict(populate_by_name=True)


class IntelligenceAskRequest(BaseModel):
    question: str = Field(min_length=4, max_length=400)

    model_config = ConfigDict(extra="forbid")


class IntelligenceAskResponse(BaseModel):
    provider: str
    open_ai_ready: bool = Field(serialization_alias="openAiReady")
    answer: str
    supporting_facts: list[str] = Field(serialization_alias="supportingFacts")
    suggested_actions: list[str] = Field(serialization_alias="suggestedActions")
    suggested_questions: list[str] = Field(serialization_alias="suggestedQuestions")

    model_config = ConfigDict(populate_by_name=True)
