from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db.session import get_db
from app.schemas.intelligence import (
    IntelligenceAskRequest,
    IntelligenceAskResponse,
    IntelligenceDashboardRead,
)
from app.services.intelligence import ask_admin_intelligence_question, get_admin_intelligence_dashboard

router = APIRouter(prefix="/admin/intelligence")


@router.get("", response_model=IntelligenceDashboardRead)
def get_admin_intelligence(
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> IntelligenceDashboardRead:
    payload = get_admin_intelligence_dashboard(db)
    return IntelligenceDashboardRead.model_validate(payload)


@router.post("/ask", response_model=IntelligenceAskResponse)
def ask_admin_intelligence(
    payload: IntelligenceAskRequest,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> IntelligenceAskResponse:
    response = ask_admin_intelligence_question(db, payload.question)
    return IntelligenceAskResponse.model_validate(response)
