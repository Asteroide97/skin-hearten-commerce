from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.schemas.catalog import BrandRead
from app.services.catalog_store import list_catalog_brands

router = APIRouter(prefix="/brands")


@router.get("", response_model=list[BrandRead])
def get_brands(db: Session = Depends(get_db)) -> list[BrandRead]:
    return [BrandRead.model_validate(brand) for brand in list_catalog_brands(db)]
