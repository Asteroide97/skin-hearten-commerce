from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, get_db
from app.schemas.catalog import BrandRead, BrandWrite
from app.schemas.common import MessageResponse
from app.services.catalog_store import create_brand_entry, delete_brand_entry, update_brand_entry

router = APIRouter(prefix="/admin/brands")


@router.post("", response_model=BrandRead)
def create_admin_brand(
    payload: BrandWrite,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> BrandRead:
    brand = create_brand_entry(db, payload)
    return BrandRead.model_validate(brand)


@router.put("/{brand_id}", response_model=BrandRead)
def update_admin_brand(
    brand_id: int,
    payload: BrandWrite,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> BrandRead:
    brand = update_brand_entry(db, brand_id, payload)
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    return BrandRead.model_validate(brand)


@router.delete("/{brand_id}", response_model=MessageResponse)
def delete_admin_brand(
    brand_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    deleted = delete_brand_entry(db, brand_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    return MessageResponse(message="Brand deleted")
