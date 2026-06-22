from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

CRMLifecycleStatus = Literal["lead", "customer", "repeat_customer", "inactive"]
CRMTaskStatus = Literal["pending", "done", "cancelled"]
CRMTaskType = Literal["follow_up", "abandoned_cart", "repurchase", "post_purchase", "manual"]
CRMAutomationTriggerType = Literal[
    "skin_quiz_completed",
    "checkout_completed",
    "abandoned_cart",
    "post_purchase",
    "repurchase_due",
    "customer_inactive",
]
CRMAutomationRunStatus = Literal["pending", "executed", "skipped", "failed"]


class CRMEventRead(BaseModel):
    id: int
    contact_id: int | None = Field(default=None, serialization_alias="contactId")
    anonymous_id: str | None = Field(default=None, serialization_alias="anonymousId")
    event_type: str = Field(serialization_alias="eventType")
    payload_json: dict[str, Any] = Field(serialization_alias="payloadJson")
    source: str
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CRMNoteRead(BaseModel):
    id: int
    contact_id: int = Field(serialization_alias="contactId")
    note: str
    created_by_user_id: int | None = Field(default=None, serialization_alias="createdByUserId")
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CRMTaskRead(BaseModel):
    id: int
    contact_id: int = Field(serialization_alias="contactId")
    title: str
    due_at: datetime | None = Field(default=None, serialization_alias="dueAt")
    status: CRMTaskStatus
    task_type: CRMTaskType = Field(serialization_alias="taskType")
    created_at: datetime = Field(serialization_alias="createdAt")
    completed_at: datetime | None = Field(default=None, serialization_alias="completedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CRMPurchaseSummaryRead(BaseModel):
    order_count: int = Field(serialization_alias="orderCount")
    total_spent: float = Field(serialization_alias="totalSpent")
    last_order_at: datetime | None = Field(default=None, serialization_alias="lastOrderAt")
    last_order_number: str | None = Field(default=None, serialization_alias="lastOrderNumber")

    model_config = ConfigDict(populate_by_name=True)


class CRMContactSummaryRead(BaseModel):
    id: int
    first_name: str = Field(serialization_alias="firstName")
    last_name: str | None = Field(default=None, serialization_alias="lastName")
    email: EmailStr | None = None
    whatsapp: str | None = None
    source: str
    lifecycle_status: CRMLifecycleStatus = Field(serialization_alias="lifecycleStatus")
    skin_type: str | None = Field(default=None, serialization_alias="skinType")
    main_goal: str | None = Field(default=None, serialization_alias="mainGoal")
    age_range: str | None = Field(default=None, serialization_alias="ageRange")
    accepted_marketing: bool = Field(serialization_alias="acceptedMarketing")
    first_seen_at: datetime = Field(serialization_alias="firstSeenAt")
    last_seen_at: datetime = Field(serialization_alias="lastSeenAt")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CRMContactDetailRead(CRMContactSummaryRead):
    events: list[CRMEventRead]
    notes: list[CRMNoteRead]
    tasks: list[CRMTaskRead]
    purchase_summary: CRMPurchaseSummaryRead = Field(serialization_alias="purchaseSummary")


class CRMContactUpdate(BaseModel):
    lifecycle_status: CRMLifecycleStatus | None = Field(default=None, alias="lifecycleStatus")
    skin_type: str | None = Field(default=None, alias="skinType", max_length=80)
    main_goal: str | None = Field(default=None, alias="mainGoal", max_length=80)
    accepted_marketing: bool | None = Field(default=None, alias="acceptedMarketing")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    @model_validator(mode="after")
    def validate_non_empty_payload(self) -> "CRMContactUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one contact field must be provided")
        return self


class CRMNoteCreate(BaseModel):
    note: str = Field(min_length=2, max_length=4000)


class CRMTaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    due_at: datetime | None = Field(default=None, alias="dueAt")
    task_type: CRMTaskType = Field(default="manual", alias="taskType")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class CRMTaskUpdate(BaseModel):
    status: CRMTaskStatus

    model_config = ConfigDict(extra="forbid")


class CRMAutomationRuleRead(BaseModel):
    id: int
    name: str
    trigger_type: CRMAutomationTriggerType = Field(serialization_alias="triggerType")
    delay_hours: int = Field(serialization_alias="delayHours")
    task_type: CRMTaskType = Field(serialization_alias="taskType")
    task_title_template: str = Field(serialization_alias="taskTitleTemplate")
    is_active: bool = Field(serialization_alias="isActive")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CRMAutomationRuleUpdate(BaseModel):
    delay_hours: int | None = Field(default=None, alias="delayHours", ge=0, le=24 * 365)
    task_title_template: str | None = Field(default=None, alias="taskTitleTemplate", min_length=2, max_length=255)
    is_active: bool | None = Field(default=None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    @model_validator(mode="after")
    def validate_non_empty_payload(self) -> "CRMAutomationRuleUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one rule field must be provided")
        return self


class CRMAutomationRunRead(BaseModel):
    id: int
    rule_id: int = Field(serialization_alias="ruleId")
    rule_name: str = Field(serialization_alias="ruleName")
    contact_id: int = Field(serialization_alias="contactId")
    contact_name: str = Field(serialization_alias="contactName")
    source_event_id: int | None = Field(default=None, serialization_alias="sourceEventId")
    trigger_type: CRMAutomationTriggerType = Field(serialization_alias="triggerType")
    task_type: CRMTaskType = Field(serialization_alias="taskType")
    due_at: datetime = Field(serialization_alias="dueAt")
    status: CRMAutomationRunStatus
    executed_at: datetime | None = Field(default=None, serialization_alias="executedAt")
    error_message: str | None = Field(default=None, serialization_alias="errorMessage")
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)
