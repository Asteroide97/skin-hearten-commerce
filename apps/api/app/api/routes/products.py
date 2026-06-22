from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.schemas.catalog import ProductRead
from app.services.catalog_store import get_catalog_product, list_catalog_products
from app.services.storefront_catalog import serialize_product

router = APIRouter(prefix="/products")


def _normalize(value: str) -> str:
    return value.strip().lower()


def _slugify(value: str) -> str:
    return "-".join(value.strip().lower().split())


@router.get("", response_model=list[ProductRead])
def get_products(
    brand: str | None = None,
    category: str | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    skin_type: str | None = None,
    concern: str | None = None,
    available: bool | None = None,
    db: Session = Depends(get_db),
) -> list[ProductRead]:
    items = list_catalog_products(db)

    def matches(product: dict) -> bool:
        serialized = serialize_product(product)
        raw_price = serialized["price"]
        brand_name = serialized["brand_name"]
        category_name = serialized["category_name"]
        category_slug = _slugify(category_name)
        skin_types = serialized["skinTypes"]
        concerns = serialized["concerns"]

        return all(
            [
                brand is None or _normalize(brand_name) == _normalize(brand) or _slugify(brand_name) == _slugify(brand),
                category is None
                or _normalize(category_name) == _normalize(category)
                or category_slug == _slugify(category),
                min_price is None or raw_price >= min_price,
                max_price is None or raw_price <= max_price,
                skin_type is None or any(_normalize(entry) == _normalize(skin_type) for entry in skin_types),
                concern is None or any(_normalize(entry) == _normalize(concern) for entry in concerns),
                available is None or (serialized["stock"] > 0) == available,
            ]
        )

    return [ProductRead.model_validate(serialize_product(product)) for product in items if matches(product)]


@router.get("/{product_ref}", response_model=ProductRead)
def get_product_detail(product_ref: str, db: Session = Depends(get_db)) -> ProductRead:
    product = get_catalog_product(db, product_ref)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ProductRead.model_validate(serialize_product(product))
