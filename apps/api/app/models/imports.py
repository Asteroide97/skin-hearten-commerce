from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(80), index=True)
    import_type: Mapped[str] = mapped_column(String(80), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(40), default="processing", server_default="processing")
    total_rows: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    processed_rows: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    success_rows: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    failed_rows: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    error_report_json: Mapped[list[dict] | None] = mapped_column(JSON)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
