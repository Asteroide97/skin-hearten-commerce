from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, get_db
from app.schemas.catalog import ProductRead, ProductWrite
from app.schemas.common import MessageResponse
from app.services.catalog_store import create_product_entry, delete_product_entry, update_product_entry
from app.services.storefront_catalog import serialize_product

router = APIRouter(prefix="/admin/products")


@router.post("", response_model=ProductRead)
def create_admin_product(
    payload: ProductWrite,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProductRead:
    product = create_product_entry(db, payload)
    return ProductRead.model_validate(serialize_product(product))


@router.put("/{product_id}", response_model=ProductRead)
def update_admin_product(
    product_id: int,
    payload: ProductWrite,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProductRead:
    product = update_product_entry(db, product_id, payload)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ProductRead.model_validate(serialize_product(product))


@router.delete("/{product_id}", response_model=MessageResponse)
def delete_admin_product(
    product_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    deleted = delete_product_entry(db, product_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return MessageResponse(message="Product deleted")
