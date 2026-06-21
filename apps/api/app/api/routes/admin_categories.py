from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_admin
from app.schemas.catalog import CategoryRead, CategoryWrite
from app.schemas.common import MessageResponse
from app.services.mock_store import CATEGORIES, create_entity, delete_entity, update_entity

router = APIRouter(prefix="/admin/categories")


@router.post("", response_model=CategoryRead)
def create_admin_category(payload: CategoryWrite, _: dict = Depends(get_current_admin)) -> CategoryRead:
    category = create_entity(CATEGORIES, payload.model_dump())
    return CategoryRead.model_validate(category)


@router.put("/{category_id}", response_model=CategoryRead)
def update_admin_category(
    category_id: int,
    payload: CategoryWrite,
    _: dict = Depends(get_current_admin),
) -> CategoryRead:
    category = update_entity(CATEGORIES, category_id, payload.model_dump())
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return CategoryRead.model_validate(category)


@router.delete("/{category_id}", response_model=MessageResponse)
def delete_admin_category(category_id: int, _: dict = Depends(get_current_admin)) -> MessageResponse:
    deleted = delete_entity(CATEGORIES, category_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return MessageResponse(message="Category deleted")

