from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Product, ProductImage
from app.schemas.catalog import ProductImageUpdate
from app.services.mock_store import (
    create_product_image as create_mock_product_image,
    delete_product_image as delete_mock_product_image,
    get_product as get_mock_product,
    update_product_image as update_mock_product_image,
)
from app.services.product_media_storage import delete_product_image_asset, store_product_image_asset


def _normalize_alt_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _serialize_image_record(record: Mapping[str, Any], *, is_primary: bool) -> dict[str, Any]:
    return {
        "id": int(record["id"]),
        "url": str(record.get("url") or record.get("image_url") or ""),
        "altText": _normalize_alt_text(record.get("altText") or record.get("alt_text")),
        "sortOrder": int(record.get("sortOrder") or record.get("sort_order") or 0),
        "isPrimary": is_primary,
    }


def _serialize_db_image(image: ProductImage, *, is_primary: bool) -> dict[str, Any]:
    return {
        "id": int(image.id),
        "url": image.image_url,
        "altText": _normalize_alt_text(image.alt_text),
        "sortOrder": int(image.sort_order),
        "isPrimary": is_primary,
    }


def _get_db_product(db: Session, product_id: int) -> Product | None:
    return db.query(Product).filter(Product.id == product_id).first()


def _get_db_product_images(db: Session, product_id: int) -> list[ProductImage]:
    return (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order.asc(), ProductImage.id.asc())
        .all()
    )


def _resequence_db_images(
    images: list[ProductImage],
    *,
    target_image_id: int,
    requested_sort_order: int | None = None,
    is_primary: bool | None = None,
) -> None:
    if not images:
        return

    ordered_images = sorted(images, key=lambda image: (int(image.sort_order), int(image.id)))
    target_image = next((image for image in ordered_images if int(image.id) == target_image_id), None)
    if not target_image:
        return

    remaining_images = [image for image in ordered_images if int(image.id) != target_image_id]
    current_index = next(
        (index for index, image in enumerate(ordered_images) if int(image.id) == target_image_id),
        len(remaining_images),
    )
    desired_index = current_index
    if is_primary:
        desired_index = 0
    elif requested_sort_order is not None:
        desired_index = max(0, min(int(requested_sort_order), len(remaining_images)))

    remaining_images.insert(desired_index, target_image)
    for index, image in enumerate(remaining_images):
        image.sort_order = index


def _resolve_mock_product(product_id: int) -> dict[str, Any] | None:
    return get_mock_product(product_id)


def create_admin_product_image(
    db: Session,
    *,
    product_id: int,
    file_bytes: bytes,
    content_type: str | None,
    alt_text: str | None,
) -> dict[str, Any]:
    stored_asset = store_product_image_asset(content=file_bytes, content_type=content_type)
    normalized_alt_text = _normalize_alt_text(alt_text)

    try:
        product = _get_db_product(db, product_id)
        if product:
            images = _get_db_product_images(db, product_id)
            image = ProductImage(
                product_id=product.id,
                image_url=stored_asset["url"],
                alt_text=normalized_alt_text,
                storage_path=stored_asset["storage_path"],
                sort_order=len(images),
            )
            db.add(image)
            db.commit()
            db.refresh(image)
            return _serialize_db_image(image, is_primary=len(images) == 0)
    except SQLAlchemyError:
        db.rollback()

    mock_product = _resolve_mock_product(product_id)
    if not mock_product:
        delete_product_image_asset(storage_path=stored_asset["storage_path"], public_url=stored_asset["url"])
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    created_image = create_mock_product_image(
        product_id,
        {
            "url": stored_asset["url"],
            "altText": normalized_alt_text,
            "sortOrder": len(mock_product.get("imageObjects", [])),
            "isPrimary": len(mock_product.get("imageObjects", [])) == 0,
            "storagePath": stored_asset["storage_path"],
        },
    )
    if not created_image:
        delete_product_image_asset(storage_path=stored_asset["storage_path"], public_url=stored_asset["url"])
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return _serialize_image_record(created_image, is_primary=bool(created_image.get("isPrimary")))


def update_admin_product_image(
    db: Session,
    *,
    product_id: int,
    image_id: int,
    payload: ProductImageUpdate,
) -> dict[str, Any] | None:
    normalized_alt_text = _normalize_alt_text(payload.altText) if payload.altText is not None else None

    try:
        product = _get_db_product(db, product_id)
        if product:
            images = _get_db_product_images(db, product_id)
            image = next((entry for entry in images if int(entry.id) == image_id), None)
            if not image:
                return None

            if payload.altText is not None:
                image.alt_text = normalized_alt_text

            _resequence_db_images(
                images,
                target_image_id=image_id,
                requested_sort_order=payload.sortOrder,
                is_primary=payload.isPrimary,
            )

            db.add(image)
            db.commit()

            refreshed_images = _get_db_product_images(db, product_id)
            refreshed_image = next((entry for entry in refreshed_images if int(entry.id) == image_id), None)
            if not refreshed_image:
                return None
            return _serialize_db_image(refreshed_image, is_primary=refreshed_image.sort_order == 0)
    except SQLAlchemyError:
        db.rollback()

    mock_product = _resolve_mock_product(product_id)
    if not mock_product:
        return None

    updated_image = update_mock_product_image(
        product_id,
        image_id,
        {
            **({"altText": normalized_alt_text} if payload.altText is not None else {}),
            **({"sortOrder": payload.sortOrder} if payload.sortOrder is not None else {}),
            **({"isPrimary": payload.isPrimary} if payload.isPrimary is not None else {}),
        },
    )
    if not updated_image:
        return None
    return _serialize_image_record(updated_image, is_primary=bool(updated_image.get("isPrimary")))


def delete_admin_product_image(
    db: Session,
    *,
    product_id: int,
    image_id: int,
) -> bool:
    try:
        product = _get_db_product(db, product_id)
        if product:
            images = _get_db_product_images(db, product_id)
            image = next((entry for entry in images if int(entry.id) == image_id), None)
            if not image:
                return False

            storage_path = image.storage_path
            public_url = image.image_url

            db.delete(image)
            db.commit()

            remaining_images = _get_db_product_images(db, product_id)
            for index, remaining_image in enumerate(remaining_images):
                remaining_image.sort_order = index
                db.add(remaining_image)
            db.commit()

            delete_product_image_asset(storage_path=storage_path, public_url=public_url)
            return True
    except SQLAlchemyError:
        db.rollback()

    deleted_image = delete_mock_product_image(product_id, image_id)
    if not deleted_image:
        return False
    delete_product_image_asset(
        storage_path=deleted_image.get("storagePath"),
        public_url=deleted_image.get("url"),
    )
    return True
