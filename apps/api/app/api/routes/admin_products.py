from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, get_db
from app.schemas.catalog import ProductImageRead, ProductImageUpdate, ProductRead, ProductWrite
from app.schemas.common import MessageResponse
from app.services.catalog_store import (
    create_product_entry,
    delete_product_entry,
    get_catalog_product,
    list_catalog_products,
    update_product_entry,
)
from app.services.product_media import (
    create_admin_product_image,
    delete_admin_product_image,
    update_admin_product_image,
)
from app.services.storefront_catalog import serialize_product

router = APIRouter(prefix="/admin/products")


@router.get("", response_model=list[ProductRead])
def list_admin_products(
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[ProductRead]:
    products = list_catalog_products(db)
    return [ProductRead.model_validate(serialize_product(product)) for product in products]


@router.get("/{product_id}", response_model=ProductRead)
def get_admin_product(
    product_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProductRead:
    product = get_catalog_product(db, str(product_id))
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ProductRead.model_validate(serialize_product(product))


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


@router.post("/{product_id}/images", response_model=ProductImageRead, status_code=status.HTTP_201_CREATED)
async def upload_admin_product_image(
    product_id: int,
    file: UploadFile = File(...),
    alt_text: str | None = Form(default=None, alias="altText"),
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProductImageRead:
    file_bytes = await file.read()
    image = create_admin_product_image(
        db,
        product_id=product_id,
        file_bytes=file_bytes,
        content_type=file.content_type,
        alt_text=alt_text,
    )
    return ProductImageRead.model_validate(image)


@router.patch("/{product_id}/images/{image_id}", response_model=ProductImageRead)
def patch_admin_product_image(
    product_id: int,
    image_id: int,
    payload: ProductImageUpdate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProductImageRead:
    image = update_admin_product_image(
        db,
        product_id=product_id,
        image_id=image_id,
        payload=payload,
    )
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product image not found")
    return ProductImageRead.model_validate(image)


@router.delete("/{product_id}/images/{image_id}", response_model=MessageResponse)
def remove_admin_product_image(
    product_id: int,
    image_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    deleted = delete_admin_product_image(db, product_id=product_id, image_id=image_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product image not found")
    return MessageResponse(message="Product image deleted")
