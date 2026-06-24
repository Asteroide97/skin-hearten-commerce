from __future__ import annotations

from sqlalchemy import inspect

from app.db.session import SessionLocal
from app.models import Brand, Category, Coupon, Product, ProductImage
from app.models.enums import CouponType
from app.services.mock_store import BRANDS, CATEGORIES, PRODUCTS

COUPON_SEED_DATA = [
    {
        "code": "GLOW10",
        "name": "Glow 10",
        "description": "10% de descuento en tu rutina.",
        "discount_type": CouponType.PERCENTAGE,
        "discount_value": 10.0,
        "min_subtotal": 500.0,
        "max_discount": None,
        "starts_at": None,
        "ends_at": None,
        "usage_limit": None,
        "per_customer_limit": None,
        "is_active": True,
    },
    {
        "code": "ENVIOGRATIS",
        "name": "Envio Gratis",
        "description": "Envio gratis en pedidos seleccionados.",
        "discount_type": CouponType.FREE_SHIPPING,
        "discount_value": 0.0,
        "min_subtotal": 1200.0,
        "max_discount": None,
        "starts_at": None,
        "ends_at": None,
        "usage_limit": None,
        "per_customer_limit": None,
        "is_active": True,
    },
    {
        "code": "BIENVENIDA15",
        "name": "Bienvenida 15",
        "description": "15% de descuento para primeras compras.",
        "discount_type": CouponType.PERCENTAGE,
        "discount_value": 15.0,
        "min_subtotal": None,
        "max_discount": None,
        "starts_at": None,
        "ends_at": None,
        "usage_limit": 500,
        "per_customer_limit": 1,
        "is_active": True,
    },
]


def _join_text_list(values: list[str] | None) -> str | None:
    if not values:
        return None
    cleaned = [value.strip() for value in values if value.strip()]
    return "\n".join(cleaned) if cleaned else None


def main() -> None:
    with SessionLocal() as db:
        inspector = inspect(db.bind)
        required_tables = {"brands", "categories", "products", "product_images", "coupons"}
        if not required_tables.issubset(set(inspector.get_table_names())):
            raise SystemExit("Run 'alembic upgrade head' before seeding the catalog.")

        brand_map: dict[int, Brand] = {}
        category_map: dict[int, Category] = {}
        created_brands = 0
        created_categories = 0
        created_products = 0
        created_coupons = 0

        for entry in BRANDS:
            brand = db.query(Brand).filter(Brand.slug == entry["slug"]).first()
            if not brand:
                brand = Brand(
                    name=entry["name"],
                    slug=entry["slug"],
                    description=entry.get("description"),
                    logo_url=entry.get("logo_url"),
                )
                db.add(brand)
                db.flush()
                created_brands += 1
            else:
                brand.name = entry["name"]
                brand.description = entry.get("description")
                brand.logo_url = entry.get("logo_url")
                db.add(brand)
            brand_map[int(entry["id"])] = brand

        for entry in CATEGORIES:
            category = db.query(Category).filter(Category.slug == entry["slug"]).first()
            if not category:
                category = Category(
                    name=entry["name"],
                    slug=entry["slug"],
                    description=entry.get("description"),
                    image_url=entry.get("image_url"),
                )
                db.add(category)
                db.flush()
                created_categories += 1
            else:
                category.name = entry["name"]
                category.description = entry.get("description")
                category.image_url = entry.get("image_url")
                db.add(category)
            category_map[int(entry["id"])] = category

        for entry in PRODUCTS:
            product = db.query(Product).filter(Product.slug == entry["slug"]).first()
            if not product:
                product = Product(
                    brand_id=brand_map[int(entry["brand_id"])].id,
                    category_id=category_map[int(entry["category_id"])].id,
                    name=entry["name"],
                    slug=entry["slug"],
                    sku=entry["sku"],
                    price=entry["price"],
                    discount_price=entry.get("discount_price"),
                    cost=entry.get("cost"),
                    stock=int(entry.get("stock") or 0),
                    description=entry["description"],
                    benefits=_join_text_list(entry.get("benefits")),
                    ingredients=_join_text_list(entry.get("ingredients")),
                    usage=_join_text_list(entry.get("usage")),
                    skin_type=_join_text_list(entry.get("skin_type")),
                    concern=_join_text_list(entry.get("concern")),
                    is_active=bool(entry.get("is_active", True)),
                )
                db.add(product)
                db.flush()
                created_products += 1
            else:
                product.brand_id = brand_map[int(entry["brand_id"])].id
                product.category_id = category_map[int(entry["category_id"])].id
                product.name = entry["name"]
                product.sku = entry["sku"]
                product.price = entry["price"]
                product.discount_price = entry.get("discount_price")
                product.cost = entry.get("cost")
                product.stock = int(entry.get("stock") or 0)
                product.description = entry["description"]
                product.benefits = _join_text_list(entry.get("benefits"))
                product.ingredients = _join_text_list(entry.get("ingredients"))
                product.usage = _join_text_list(entry.get("usage"))
                product.skin_type = _join_text_list(entry.get("skin_type"))
                product.concern = _join_text_list(entry.get("concern"))
                product.is_active = bool(entry.get("is_active", True))
                db.add(product)

            db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
            images = entry.get("images") or ([entry["image"]] if entry.get("image") else [])
            for sort_order, image_url in enumerate(images):
                db.add(
                    ProductImage(
                        product_id=product.id,
                        image_url=str(image_url),
                        sort_order=sort_order,
                    )
                )

        for entry in COUPON_SEED_DATA:
            coupon = db.query(Coupon).filter(Coupon.code == entry["code"]).first()
            if not coupon:
                coupon = Coupon(
                    code=entry["code"],
                    name=entry["name"],
                    description=entry["description"],
                    discount_type=entry["discount_type"],
                    discount_value=entry["discount_value"],
                    min_subtotal=entry["min_subtotal"],
                    max_discount=entry["max_discount"],
                    starts_at=entry["starts_at"],
                    ends_at=entry["ends_at"],
                    usage_limit=entry["usage_limit"],
                    usage_count=0,
                    per_customer_limit=entry["per_customer_limit"],
                    is_active=entry["is_active"],
                )
                db.add(coupon)
                created_coupons += 1
            else:
                coupon.name = entry["name"]
                coupon.description = entry["description"]
                coupon.discount_type = entry["discount_type"]
                coupon.discount_value = entry["discount_value"]
                coupon.min_subtotal = entry["min_subtotal"]
                coupon.max_discount = entry["max_discount"]
                coupon.starts_at = entry["starts_at"]
                coupon.ends_at = entry["ends_at"]
                coupon.usage_limit = entry["usage_limit"]
                coupon.per_customer_limit = entry["per_customer_limit"]
                coupon.is_active = entry["is_active"]
                db.add(coupon)

        db.commit()
        print(
            "Catalog seed completed: "
            f"{created_brands} brands created, "
            f"{created_categories} categories created, "
            f"{created_products} products created, "
            f"{created_coupons} coupons created."
        )


if __name__ == "__main__":
    main()
