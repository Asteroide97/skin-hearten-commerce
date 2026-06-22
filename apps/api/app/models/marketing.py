from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SkinQuizLead(Base):
    __tablename__ = "skin_quiz_leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    whatsapp: Mapped[str] = mapped_column(String(40))
    email: Mapped[str | None] = mapped_column(String(255))
    accepted_marketing: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(30), default="new", server_default="new")
    internal_notes: Mapped[str | None] = mapped_column(Text())
    last_contacted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    answers_json: Mapped[dict] = mapped_column(JSON)
    result_json: Mapped[dict] = mapped_column(JSON)
    source: Mapped[str] = mapped_column(String(50))
    user_agent: Mapped[str | None] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
