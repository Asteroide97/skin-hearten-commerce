from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, get_db
from app.schemas.catalog import CategoryRead, CategoryWrite
from app.schemas.common import MessageResponse
from app.services.catalog_store import create_category_entry, delete_category_entry, update_category_entry

router = APIRouter(prefix="/admin/categories")


@router.post("", response_model=CategoryRead)
def create_admin_category(
    payload: CategoryWrite,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CategoryRead:
    category = create_category_entry(db, payload)
    return CategoryRead.model_validate(category)


@router.put("/{category_id}", response_model=CategoryRead)
def update_admin_category(
    category_id: int,
    payload: CategoryWrite,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CategoryRead:
    category = update_category_entry(db, category_id, payload)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return CategoryRead.model_validate(category)


@router.delete("/{category_id}", response_model=MessageResponse)
def delete_admin_category(
    category_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    deleted = delete_category_entry(db, category_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return MessageResponse(message="Category deleted")
