from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.catalog import ProductRead
from app.services.mock_store import get_product, list_products

router = APIRouter(prefix="/products")


@router.get("", response_model=list[ProductRead])
def get_products(
    brand: str | None = None,
    category: str | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    skin_type: str | None = None,
    concern: str | None = None,
    available: bool | None = None,
) -> list[ProductRead]:
    items = list_products()

    def matches(product: dict) -> bool:
        return all(
            [
                brand is None or product["brand_name"].lower() == brand.lower(),
                category is None or product["category_name"].lower() == category.lower(),
                min_price is None or product["price"] >= min_price,
                max_price is None or product["price"] <= max_price,
                skin_type is None or skin_type in product["skin_type"],
                concern is None or concern in product["concern"],
                available is None or (product["stock"] > 0) == available,
            ]
        )

    return [ProductRead.model_validate(product) for product in items if matches(product)]


@router.get("/{product_id}", response_model=ProductRead)
def get_product_detail(product_id: int) -> ProductRead:
    product = get_product(product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ProductRead.model_validate(product)

