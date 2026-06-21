from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_admin
from app.schemas.catalog import BrandRead, BrandWrite
from app.schemas.common import MessageResponse
from app.services.mock_store import BRANDS, create_entity, delete_entity, update_entity

router = APIRouter(prefix="/admin/brands")


@router.post("", response_model=BrandRead)
def create_admin_brand(payload: BrandWrite, _: dict = Depends(get_current_admin)) -> BrandRead:
    brand = create_entity(BRANDS, payload.model_dump())
    return BrandRead.model_validate(brand)


@router.put("/{brand_id}", response_model=BrandRead)
def update_admin_brand(brand_id: int, payload: BrandWrite, _: dict = Depends(get_current_admin)) -> BrandRead:
    brand = update_entity(BRANDS, brand_id, payload.model_dump())
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    return BrandRead.model_validate(brand)


@router.delete("/{brand_id}", response_model=MessageResponse)
def delete_admin_brand(brand_id: int, _: dict = Depends(get_current_admin)) -> MessageResponse:
    deleted = delete_entity(BRANDS, brand_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    return MessageResponse(message="Brand deleted")

