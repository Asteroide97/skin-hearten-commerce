from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


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
