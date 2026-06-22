from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.schemas.catalog import CategoryRead
from app.services.catalog_store import list_catalog_categories

router = APIRouter(prefix="/categories")


@router.get("", response_model=list[CategoryRead])
def get_categories(db: Session = Depends(get_db)) -> list[CategoryRead]:
    return [CategoryRead.model_validate(category) for category in list_catalog_categories(db)]
