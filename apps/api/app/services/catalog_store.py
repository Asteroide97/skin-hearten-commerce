from __future__ import annotations

from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models import Brand, Category, Product, ProductImage
from app.schemas.catalog import BrandWrite, CategoryWrite, ProductWrite
from app.services.mock_store import (
    BRANDS,
    CATEGORIES,
    create_entity,
    create_product as create_mock_product,
    delete_entity,
    delete_product as delete_mock_product,
    get_product as get_mock_product,
    get_product_by_slug as get_mock_product_by_slug,
    list_brands as list_mock_brands,
    list_categories as list_mock_categories,
    list_products as list_mock_products,
    update_entity,
    update_product as update_mock_product,
)
from app.services.storefront_catalog import serialize_product


def _split_text_list(value: str | None) -> list[str]:
    if not value:
        return []

    normalized = value.replace("\r\n", "\n")
    if "\n" in normalized:
        raw_items = normalized.split("\n")
    else:
        raw_items = normalized.split(",")

    return [item.strip(" -\t") for item in raw_items if item.strip(" -\t")]


def _join_text_list(values: list[str]) -> str | None:
    cleaned = [value.strip() for value in values if value.strip()]
    return "\n".join(cleaned) if cleaned else None


def _brand_to_dict(brand: Brand) -> dict[str, Any]:
    return {
        "description": brand.description,
        "id": brand.id,
        "name": brand.name,
        "slug": brand.slug,
    }


def _category_to_dict(category: Category) -> dict[str, Any]:
    return {
        "description": category.description,
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
    }


def _product_to_dict(
    product: Product,
    *,
    brand_name: str,
    category_name: str,
) -> dict[str, Any]:
    images = sorted(product.images, key=lambda image: image.sort_order)
    image_urls = [image.image_url for image in images if image.image_url]

    return {
        "benefits": _split_text_list(product.benefits),
        "brand": brand_name,
        "brand_id": product.brand_id,
        "brand_name": brand_name,
        "category": category_name,
        "category_id": product.category_id,
        "category_name": category_name,
        "concern": _split_text_list(product.concern),
        "description": product.description,
        "discount_price": float(product.discount_price) if product.discount_price is not None else None,
        "id": product.id,
        "image": image_urls[0] if image_urls else None,
        "images": image_urls,
        "ingredients": _split_text_list(product.ingredients),
        "is_active": bool(product.is_active),
        "name": product.name,
        "price": float(product.price),
        "skin_type": _split_text_list(product.skin_type),
        "slug": product.slug,
        "sku": product.sku,
        "stock": product.stock,
        "usage": _split_text_list(product.usage),
    }


def list_catalog_brands(db: Session) -> list[dict[str, Any]]:
    try:
        brands = db.query(Brand).order_by(Brand.name.asc()).all()
        if brands:
            return [_brand_to_dict(brand) for brand in brands]
    except SQLAlchemyError:
        db.rollback()

    return list_mock_brands()


def list_catalog_categories(db: Session) -> list[dict[str, Any]]:
    try:
        categories = db.query(Category).order_by(Category.name.asc()).all()
        if categories:
            return [_category_to_dict(category) for category in categories]
    except SQLAlchemyError:
        db.rollback()

    return list_mock_categories()


def list_catalog_products(db: Session) -> list[dict[str, Any]]:
    try:
        products = db.query(Product).options(selectinload(Product.images)).order_by(Product.name.asc()).all()
        if products:
            brands = {brand.id: brand.name for brand in db.query(Brand).all()}
            categories = {category.id: category.name for category in db.query(Category).all()}
            return [
                _product_to_dict(
                    product,
                    brand_name=brands.get(product.brand_id, ""),
                    category_name=categories.get(product.category_id, ""),
                )
                for product in products
            ]
    except SQLAlchemyError:
        db.rollback()

    return list_mock_products()


def get_catalog_product(db: Session, product_ref: str) -> dict[str, Any] | None:
    try:
        query = db.query(Product).options(selectinload(Product.images))
        product = query.filter(Product.id == int(product_ref)).first() if product_ref.isdigit() else None
        if not product:
            product = query.filter(Product.slug == product_ref).first()
        if product:
            brand = db.query(Brand).filter(Brand.id == product.brand_id).first()
            category = db.query(Category).filter(Category.id == product.category_id).first()
            return _product_to_dict(
                product,
                brand_name=brand.name if brand else "",
                category_name=category.name if category else "",
            )
    except SQLAlchemyError:
        db.rollback()

    return get_mock_product(int(product_ref)) if product_ref.isdigit() else get_mock_product_by_slug(product_ref)


def create_brand_entry(db: Session, payload: BrandWrite) -> dict[str, Any]:
    try:
        brand = Brand(
            description=payload.description,
            logo_url=None,
            name=payload.name,
            slug=payload.slug,
        )
        db.add(brand)
        db.commit()
        db.refresh(brand)
        return _brand_to_dict(brand)
    except SQLAlchemyError:
        db.rollback()
        return create_entity(BRANDS, payload.model_dump())


def update_brand_entry(db: Session, brand_id: int, payload: BrandWrite) -> dict[str, Any] | None:
    try:
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            return None
        brand.name = payload.name
        brand.slug = payload.slug
        brand.description = payload.description
        db.add(brand)
        db.commit()
        db.refresh(brand)
        return _brand_to_dict(brand)
    except SQLAlchemyError:
        db.rollback()
        return update_entity(BRANDS, brand_id, payload.model_dump())


def delete_brand_entry(db: Session, brand_id: int) -> bool:
    try:
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            return False
        db.delete(brand)
        db.commit()
        return True
    except SQLAlchemyError:
        db.rollback()
        return delete_entity(BRANDS, brand_id)


def create_category_entry(db: Session, payload: CategoryWrite) -> dict[str, Any]:
    try:
        category = Category(
            description=payload.description,
            image_url=None,
            name=payload.name,
            slug=payload.slug,
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        return _category_to_dict(category)
    except SQLAlchemyError:
        db.rollback()
        return create_entity(CATEGORIES, payload.model_dump())


def update_category_entry(db: Session, category_id: int, payload: CategoryWrite) -> dict[str, Any] | None:
    try:
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            return None
        category.name = payload.name
        category.slug = payload.slug
        category.description = payload.description
        db.add(category)
        db.commit()
        db.refresh(category)
        return _category_to_dict(category)
    except SQLAlchemyError:
        db.rollback()
        return update_entity(CATEGORIES, category_id, payload.model_dump())


def delete_category_entry(db: Session, category_id: int) -> bool:
    try:
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            return False
        db.delete(category)
        db.commit()
        return True
    except SQLAlchemyError:
        db.rollback()
        return delete_entity(CATEGORIES, category_id)


def create_product_entry(db: Session, payload: ProductWrite) -> dict[str, Any]:
    try:
        product = Product(
            brand_id=payload.brand_id,
            category_id=payload.category_id,
            concern=_join_text_list(payload.concern),
            cost=None,
            description=payload.description,
            discount_price=payload.discount_price,
            benefits=_join_text_list(payload.benefits),
            ingredients=_join_text_list(payload.ingredients),
            is_active=payload.is_active,
            name=payload.name,
            price=payload.price,
            skin_type=_join_text_list(payload.skin_type),
            sku=payload.sku,
            slug=payload.slug,
            stock=payload.stock,
            usage=_join_text_list(payload.usage),
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return get_catalog_product(db, product.slug) or payload.model_dump()
    except SQLAlchemyError:
        db.rollback()
        return create_mock_product(payload.model_dump())


def update_product_entry(db: Session, product_id: int, payload: ProductWrite) -> dict[str, Any] | None:
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return None

        product.brand_id = payload.brand_id
        product.category_id = payload.category_id
        product.concern = _join_text_list(payload.concern)
        product.description = payload.description
        product.discount_price = payload.discount_price
        product.benefits = _join_text_list(payload.benefits)
        product.ingredients = _join_text_list(payload.ingredients)
        product.is_active = payload.is_active
        product.name = payload.name
        product.price = payload.price
        product.skin_type = _join_text_list(payload.skin_type)
        product.sku = payload.sku
        product.slug = payload.slug
        product.stock = payload.stock
        product.usage = _join_text_list(payload.usage)

        db.add(product)
        db.commit()
        db.refresh(product)
        return get_catalog_product(db, product.slug)
    except SQLAlchemyError:
        db.rollback()
        return update_mock_product(product_id, payload.model_dump())


def delete_product_entry(db: Session, product_id: int) -> bool:
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return False
        db.query(ProductImage).filter(ProductImage.product_id == product_id).delete()
        db.delete(product)
        db.commit()
        return True
    except SQLAlchemyError:
        db.rollback()
        return delete_mock_product(product_id)


def sync_product_images(
    db: Session,
    *,
    product: Product,
    images: list[str],
) -> None:
    db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
    for sort_order, image_url in enumerate(images):
        db.add(ProductImage(product_id=product.id, image_url=image_url, sort_order=sort_order))
    db.add(product)
    db.commit()

