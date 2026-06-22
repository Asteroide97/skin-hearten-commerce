from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_admin
from app.schemas.catalog import ProductRead, ProductWrite
from app.schemas.common import MessageResponse
from app.services.mock_store import create_product, delete_product, update_product
from app.services.storefront_catalog import serialize_product

router = APIRouter(prefix="/admin/products")


@router.post("", response_model=ProductRead)
def create_admin_product(payload: ProductWrite, _: dict = Depends(get_current_admin)) -> ProductRead:
    product = create_product(payload.model_dump())
    return ProductRead.model_validate(serialize_product(product))


@router.put("/{product_id}", response_model=ProductRead)
def update_admin_product(
    product_id: int,
    payload: ProductWrite,
    _: dict = Depends(get_current_admin),
) -> ProductRead:
    product = update_product(product_id, payload.model_dump())
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ProductRead.model_validate(serialize_product(product))


@router.delete("/{product_id}", response_model=MessageResponse)
def delete_admin_product(product_id: int, _: dict = Depends(get_current_admin)) -> MessageResponse:
    deleted = delete_product(product_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return MessageResponse(message="Product deleted")
