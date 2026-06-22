from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.skin_quiz import SkinQuizLeadCreate, SkinQuizLeadCreateResponse
from app.services.skin_quiz_leads import create_skin_quiz_lead

router = APIRouter(prefix="/skin-quiz")


@router.post("/leads", response_model=SkinQuizLeadCreateResponse, status_code=status.HTTP_201_CREATED)
def create_skin_quiz_lead_endpoint(
    payload: SkinQuizLeadCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> SkinQuizLeadCreateResponse:
    lead = create_skin_quiz_lead(db=db, payload=payload, user_agent=request.headers.get("user-agent"))
    return SkinQuizLeadCreateResponse.model_validate(lead)
