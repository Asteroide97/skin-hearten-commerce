from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db.session import get_db
from app.schemas.skin_quiz import SkinQuizAnalyticsResponse
from app.services.skin_quiz_leads import get_skin_quiz_analytics

router = APIRouter(prefix="/admin/skin-quiz/analytics")


@router.get("", response_model=SkinQuizAnalyticsResponse)
def get_admin_skin_quiz_analytics(
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> SkinQuizAnalyticsResponse:
    analytics = get_skin_quiz_analytics(db)
    return SkinQuizAnalyticsResponse.model_validate(analytics)
