from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

SkinQuizLeadStatus = Literal["new", "contacted", "interested", "purchased", "not_interested"]


class SkinQuizLeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    whatsapp: str = Field(min_length=8, max_length=40)
    email: EmailStr | None = None
    accepted_marketing: bool = Field(alias="acceptedMarketing")
    answers: dict[str, Any]
    quiz_result: dict[str, Any] = Field(alias="quizResult")
    source: Literal["auto_home", "header", "home"]

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("accepted_marketing")
    @classmethod
    def validate_marketing_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError("acceptedMarketing must be true to save the lead")
        return value


class SkinQuizLeadCreateResponse(BaseModel):
    id: int
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SkinQuizLeadAdminSummary(BaseModel):
    id: int
    name: str
    whatsapp: str
    email: EmailStr | None = None
    accepted_marketing: bool = Field(serialization_alias="acceptedMarketing")
    status: SkinQuizLeadStatus
    internal_notes: str | None = Field(default=None, serialization_alias="internalNotes")
    last_contacted_at: datetime | None = Field(default=None, serialization_alias="lastContactedAt")
    source: str
    created_at: datetime = Field(serialization_alias="createdAt")
    result_summary: str = Field(serialization_alias="resultSummary")
    primary_goal: str = Field(serialization_alias="primaryGoal")
    skin_type: str = Field(serialization_alias="skinType")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SkinQuizLeadAdminDetail(SkinQuizLeadAdminSummary):
    answers_json: dict[str, Any] = Field(serialization_alias="answersJson")
    result_json: dict[str, Any] = Field(serialization_alias="resultJson")
    user_agent: str | None = Field(default=None, serialization_alias="userAgent")


class SkinQuizLeadUpdate(BaseModel):
    status: SkinQuizLeadStatus | None = None
    internal_notes: str | None = Field(default=None, alias="internalNotes", max_length=2000)
    last_contacted_at: datetime | None = Field(default=None, alias="lastContactedAt")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    @model_validator(mode="after")
    def validate_optional_status(self) -> "SkinQuizLeadUpdate":
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("status cannot be null")
        return self


class SkinQuizGoalCount(BaseModel):
    goal: str
    count: int


class SkinQuizSkinTypeCount(BaseModel):
    skin_type: str = Field(serialization_alias="skinType")
    count: int

    model_config = ConfigDict(populate_by_name=True)


class SkinQuizAgeRangeCount(BaseModel):
    age_range: str = Field(serialization_alias="ageRange")
    count: int

    model_config = ConfigDict(populate_by_name=True)


class SkinQuizStatusCount(BaseModel):
    status: SkinQuizLeadStatus
    count: int


class SkinQuizSourceCount(BaseModel):
    source: str
    count: int


class SkinQuizAnalyticsRecentLead(BaseModel):
    id: int
    name: str
    whatsapp: str
    goal: str
    skin_type: str = Field(serialization_alias="skinType")
    status: SkinQuizLeadStatus
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class SkinQuizAnalyticsResponse(BaseModel):
    total_leads: int = Field(serialization_alias="totalLeads")
    leads_today: int = Field(serialization_alias="leadsToday")
    leads_this_week: int = Field(serialization_alias="leadsThisWeek")
    leads_this_month: int = Field(serialization_alias="leadsThisMonth")
    completion_rate_estimate: float | None = Field(serialization_alias="completionRateEstimate")
    top_goals: list[SkinQuizGoalCount] = Field(serialization_alias="topGoals")
    top_skin_types: list[SkinQuizSkinTypeCount] = Field(serialization_alias="topSkinTypes")
    top_age_ranges: list[SkinQuizAgeRangeCount] = Field(serialization_alias="topAgeRanges")
    status_breakdown: list[SkinQuizStatusCount] = Field(serialization_alias="statusBreakdown")
    source_breakdown: list[SkinQuizSourceCount] = Field(serialization_alias="sourceBreakdown")
    recent_leads: list[SkinQuizAnalyticsRecentLead] = Field(serialization_alias="recentLeads")

    model_config = ConfigDict(populate_by_name=True)
