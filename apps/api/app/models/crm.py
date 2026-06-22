from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import (
    CRMAutomationRunStatus,
    CRMAutomationTriggerType,
    CRMLifecycleStatus,
    CRMTaskStatus,
    CRMTaskType,
)
from app.models.mixins import TimestampMixin


class CRMContact(TimestampMixin, Base):
    __tablename__ = "crm_contacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(120))
    last_name: Mapped[str | None] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    whatsapp: Mapped[str | None] = mapped_column(String(40), index=True)
    source: Mapped[str] = mapped_column(String(80))
    lifecycle_status: Mapped[CRMLifecycleStatus] = mapped_column(
        Enum(CRMLifecycleStatus),
        default=CRMLifecycleStatus.LEAD,
        server_default=CRMLifecycleStatus.LEAD.value,
    )
    skin_type: Mapped[str | None] = mapped_column(String(80))
    main_goal: Mapped[str | None] = mapped_column(String(80))
    age_range: Mapped[str | None] = mapped_column(String(80))
    accepted_marketing: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CRMEvent(Base):
    __tablename__ = "crm_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    contact_id: Mapped[int | None] = mapped_column(ForeignKey("crm_contacts.id"), nullable=True)
    anonymous_id: Mapped[str | None] = mapped_column(String(120))
    event_type: Mapped[str] = mapped_column(String(80))
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict)
    source: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CRMNote(Base):
    __tablename__ = "crm_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    contact_id: Mapped[int] = mapped_column(ForeignKey("crm_contacts.id"))
    note: Mapped[str] = mapped_column(Text())
    created_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CRMTask(Base):
    __tablename__ = "crm_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    contact_id: Mapped[int] = mapped_column(ForeignKey("crm_contacts.id"))
    title: Mapped[str] = mapped_column(String(255))
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[CRMTaskStatus] = mapped_column(
        Enum(CRMTaskStatus),
        default=CRMTaskStatus.PENDING,
        server_default=CRMTaskStatus.PENDING.value,
    )
    task_type: Mapped[CRMTaskType] = mapped_column(
        Enum(CRMTaskType),
        default=CRMTaskType.MANUAL,
        server_default=CRMTaskType.MANUAL.value,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CRMAutomationRule(TimestampMixin, Base):
    __tablename__ = "crm_automation_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    trigger_type: Mapped[CRMAutomationTriggerType] = mapped_column(Enum(CRMAutomationTriggerType))
    delay_hours: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    task_type: Mapped[CRMTaskType] = mapped_column(
        Enum(CRMTaskType),
        default=CRMTaskType.FOLLOW_UP,
        server_default=CRMTaskType.FOLLOW_UP.value,
    )
    task_title_template: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")


class CRMAutomationRun(Base):
    __tablename__ = "crm_automation_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    rule_id: Mapped[int] = mapped_column(ForeignKey("crm_automation_rules.id"))
    contact_id: Mapped[int] = mapped_column(ForeignKey("crm_contacts.id"))
    source_event_id: Mapped[int | None] = mapped_column(ForeignKey("crm_events.id"), nullable=True)
    status: Mapped[CRMAutomationRunStatus] = mapped_column(
        Enum(CRMAutomationRunStatus),
        default=CRMAutomationRunStatus.PENDING,
        server_default=CRMAutomationRunStatus.PENDING.value,
    )
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
