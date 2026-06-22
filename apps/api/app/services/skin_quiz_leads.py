from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import Base, SkinQuizLead
from app.schemas.skin_quiz import SkinQuizLeadCreate
from app.services.mock_store import create_skin_quiz_lead as create_mock_skin_quiz_lead

_skin_quiz_table_initialized = False


def _ensure_skin_quiz_table() -> None:
    global _skin_quiz_table_initialized

    if _skin_quiz_table_initialized:
        return

    Base.metadata.create_all(bind=engine, tables=[SkinQuizLead.__table__])
    _skin_quiz_table_initialized = True


def create_skin_quiz_lead(
    db: Session,
    payload: SkinQuizLeadCreate,
    user_agent: str | None = None,
) -> Mapping[str, Any]:
    try:
        _ensure_skin_quiz_table()
        lead = SkinQuizLead(
            name=payload.name,
            whatsapp=payload.whatsapp,
            email=payload.email,
            accepted_marketing=payload.accepted_marketing,
            answers_json=payload.answers,
            result_json=payload.quiz_result,
            source=payload.source,
            user_agent=user_agent,
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
        return {
            "id": lead.id,
            "created_at": lead.created_at,
        }
    except SQLAlchemyError:
        db.rollback()
        return create_mock_skin_quiz_lead(
            {
                "name": payload.name,
                "whatsapp": payload.whatsapp,
                "email": payload.email,
                "accepted_marketing": payload.accepted_marketing,
                "answers_json": payload.answers,
                "result_json": payload.quiz_result,
                "source": payload.source,
                "user_agent": user_agent,
            }
        )
