from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db.session import get_db
from app.schemas.skin_quiz import (
    SkinQuizLeadAdminDetail,
    SkinQuizLeadAdminSummary,
    SkinQuizLeadStatus,
    SkinQuizLeadUpdate,
)
from app.services.skin_quiz_leads import (
    get_skin_quiz_lead_detail,
    list_skin_quiz_lead_summaries,
    update_skin_quiz_lead,
)

router = APIRouter(prefix="/admin/skin-quiz/leads")


@router.get("", response_model=list[SkinQuizLeadAdminSummary])
def list_admin_skin_quiz_leads(
    search: str | None = Query(default=None),
    source: str | None = Query(default=None),
    lead_status: SkinQuizLeadStatus | None = Query(default=None, alias="status"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[SkinQuizLeadAdminSummary]:
    leads = list_skin_quiz_lead_summaries(
        db,
        date_from=date_from,
        date_to=date_to,
        search=search,
        status=lead_status,
        source=source,
    )
    return [SkinQuizLeadAdminSummary.model_validate(lead) for lead in leads]


@router.get("/{lead_id}", response_model=SkinQuizLeadAdminDetail)
def get_admin_skin_quiz_lead(
    lead_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> SkinQuizLeadAdminDetail:
    lead = get_skin_quiz_lead_detail(db, lead_id)
    if not lead:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Skin quiz lead not found")
    return SkinQuizLeadAdminDetail.model_validate(lead)


@router.patch("/{lead_id}", response_model=SkinQuizLeadAdminDetail)
def update_admin_skin_quiz_lead(
    lead_id: int,
    payload: SkinQuizLeadUpdate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> SkinQuizLeadAdminDetail:
    lead = update_skin_quiz_lead(db, lead_id, payload)
    if not lead:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Skin quiz lead not found")
    return SkinQuizLeadAdminDetail.model_validate(lead)
