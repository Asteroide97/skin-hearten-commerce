from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime, timezone
from math import ceil
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import Base, Customer, Order, OrderItem, Product, ProductReview
from app.models.enums import ProductReviewSource, ProductReviewStatus
from app.schemas.review import AdminProductReviewUpdate, ProductReviewCreate, VerifiedProductReviewCreate
from app.services.mock_store import (
    CUSTOMERS,
    create_product_review as create_mock_product_review,
    get_order_by_number as get_mock_order_by_number,
    get_product as get_mock_product,
    get_product_by_slug as get_mock_product_by_slug,
    get_product_review as get_mock_product_review,
    list_product_reviews as list_mock_product_reviews,
    list_products as list_mock_products,
    update_product_review as update_mock_product_review,
)

_product_reviews_table_initialized = False


def _ensure_product_reviews_table() -> None:
    global _product_reviews_table_initialized

    if _product_reviews_table_initialized:
        return

    Base.metadata.create_all(bind=engine, tables=[ProductReview.__table__])
    _product_reviews_table_initialized = True


def _normalize_email(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    return normalized or None


def _normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    normalized = "".join(character for character in value if character.isdigit())
    return normalized or None


def _phone_tokens(value: str | None) -> set[str]:
    normalized = _normalize_phone(value)
    if not normalized:
        return set()

    tokens = {normalized}
    if len(normalized) >= 10:
        tokens.add(normalized[-10:])
    return tokens


def _phones_match(first: str | None, second: str | None) -> bool:
    first_tokens = _phone_tokens(first)
    second_tokens = _phone_tokens(second)
    if not first_tokens or not second_tokens:
        return False
    return bool(first_tokens & second_tokens)


def _contact_matches(
    *,
    customer_email: str | None,
    customer_phone: str | None,
    email: str | None,
    phone: str | None,
) -> bool:
    normalized_email = _normalize_email(email)
    email_matches = normalized_email is not None and _normalize_email(customer_email) == normalized_email
    phone_matches = phone is not None and _phones_match(customer_phone, phone)
    return email_matches or phone_matches


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _resolve_mock_product(product_ref: str) -> dict[str, Any] | None:
    if product_ref.isdigit():
        product = get_mock_product(int(product_ref))
        if product:
            return product
    return get_mock_product_by_slug(product_ref)


def _resolve_db_product(db: Session, product_ref: str) -> Product | None:
    query = db.query(Product)
    product = query.filter(Product.id == int(product_ref)).first() if product_ref.isdigit() else None
    if product:
        return product
    return query.filter(Product.slug == product_ref).first()


def _find_mock_product_by_query(product_query: str) -> dict[str, Any] | None:
    normalized_query = product_query.strip().lower()
    if not normalized_query:
        return None

    if normalized_query.isdigit():
        product = get_mock_product(int(normalized_query))
        if product:
            return product

    exact_slug_match = next(
        (product for product in list_mock_products() if str(product.get("slug") or "").lower() == normalized_query),
        None,
    )
    if exact_slug_match:
        return exact_slug_match

    return next(
        (
            product
            for product in list_mock_products()
            if normalized_query in str(product.get("name") or "").lower()
        ),
        None,
    )


def _product_matches_query(product: Mapping[str, Any], product_query: str | None) -> bool:
    if not product_query:
        return True

    normalized_query = product_query.strip().lower()
    if not normalized_query:
        return True

    haystack = " ".join(
        [
            str(product.get("id") or ""),
            str(product.get("name") or ""),
            str(product.get("slug") or ""),
        ]
    ).lower()
    return normalized_query in haystack


def _parse_review_status(value: str | None) -> ProductReviewStatus | None:
    if not value:
        return None
    try:
        return ProductReviewStatus(value)
    except ValueError:
        return None


def _serialize_public_review(review: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "id": int(review["id"]),
        "customer_name": str(review.get("customer_name") or "Clienta"),
        "rating": int(review.get("rating") or 0),
        "title": review.get("title"),
        "body": str(review.get("body") or ""),
        "verified_purchase": bool(review.get("verified_purchase", False)),
        "created_at": review.get("created_at") or datetime.now(timezone.utc),
    }


def _serialize_approved_review(review: Mapping[str, Any], product: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "id": int(review["id"]),
        "product_id": int(product["id"]),
        "product_name": str(product.get("name") or "Producto"),
        "product_slug": str(product.get("slug") or ""),
        "customer_name": str(review.get("customer_name") or "Clienta"),
        "rating": int(review.get("rating") or 0),
        "title": review.get("title"),
        "body": str(review.get("body") or ""),
        "verified_purchase": bool(review.get("verified_purchase", False)),
        "created_at": review.get("created_at") or datetime.now(timezone.utc),
    }


def _serialize_admin_review(review: Mapping[str, Any], product: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "id": int(review["id"]),
        "product_id": int(product["id"]),
        "product_name": str(product.get("name") or "Producto"),
        "product_slug": str(product.get("slug") or ""),
        "customer_name": str(review.get("customer_name") or "Clienta"),
        "customer_email": review.get("customer_email"),
        "rating": int(review.get("rating") or 0),
        "title": review.get("title"),
        "body": str(review.get("body") or ""),
        "status": str(review.get("status") or ProductReviewStatus.PENDING),
        "source": str(review.get("source") or ProductReviewSource.CUSTOMER),
        "verified_purchase": bool(review.get("verified_purchase", False)),
        "order_id": int(review["order_id"]) if review.get("order_id") is not None else None,
        "created_at": review.get("created_at") or datetime.now(timezone.utc),
        "approved_at": review.get("approved_at"),
    }


def _build_public_response(product_id: int, reviews: list[Mapping[str, Any]]) -> dict[str, Any]:
    serialized_reviews = [_serialize_public_review(review) for review in reviews]
    review_count = len(serialized_reviews)
    average_rating = round(
        sum(review["rating"] for review in serialized_reviews) / review_count,
        1,
    ) if review_count > 0 else 0.0

    return {
        "product_id": product_id,
        "average_rating": average_rating,
        "review_count": review_count,
        "reviews": serialized_reviews,
    }


def _build_reviews_summary(rows: list[tuple[Mapping[str, Any], Mapping[str, Any]]]) -> dict[str, Any]:
    serialized_preview = [_serialize_approved_review(review, product) for review, product in rows[:3]]
    total_reviews = len(rows)
    average_rating = round(
        sum(int(review.get("rating") or 0) for review, _ in rows) / total_reviews,
        1,
    ) if total_reviews > 0 else 0.0

    return {
        "average_rating": average_rating,
        "total_reviews": total_reviews,
        "approved_reviews_preview": serialized_preview,
    }


def _build_reviews_list_response(
    *,
    items: list[dict[str, Any]],
    page: int,
    page_size: int,
    total: int,
    average_rating: float,
) -> dict[str, Any]:
    total_pages = max(1, ceil(total / page_size)) if page_size > 0 else 1
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "average_rating": average_rating,
    }


def get_product_reviews_public(db: Session, product_ref: str) -> dict[str, Any] | None:
    try:
        _ensure_product_reviews_table()
        product = _resolve_db_product(db, product_ref)
        if not product:
            return None

        reviews = (
            db.query(ProductReview)
            .filter(
                ProductReview.product_id == product.id,
                ProductReview.status == ProductReviewStatus.APPROVED,
            )
            .order_by(desc(ProductReview.verified_purchase), desc(ProductReview.created_at))
            .all()
        )
        return _build_public_response(
            int(product.id),
            [
                {
                    "id": review.id,
                    "customer_name": review.customer_name,
                    "rating": review.rating,
                    "title": review.title,
                    "body": review.body,
                    "verified_purchase": review.verified_purchase,
                    "created_at": review.created_at,
                }
                for review in reviews
            ],
        )
    except SQLAlchemyError:
        db.rollback()

    product = _resolve_mock_product(product_ref)
    if not product:
        return None
    reviews = list_mock_product_reviews(product_id=int(product["id"]), status=ProductReviewStatus.APPROVED)
    reviews.sort(
        key=lambda review: (
            0 if bool(review.get("verified_purchase", False)) else 1,
            -(review.get("created_at") or datetime.now(timezone.utc)).timestamp(),
        ),
    )
    return _build_public_response(int(product["id"]), reviews)


def get_reviews_summary_public(db: Session) -> dict[str, Any]:
    try:
        _ensure_product_reviews_table()
        rows = (
            db.query(ProductReview, Product)
            .join(Product, Product.id == ProductReview.product_id)
            .filter(ProductReview.status == ProductReviewStatus.APPROVED)
            .order_by(desc(ProductReview.verified_purchase), desc(ProductReview.created_at))
            .all()
        )
        return _build_reviews_summary(
            [
                (
                    {
                        "id": review.id,
                        "customer_name": review.customer_name,
                        "rating": review.rating,
                        "title": review.title,
                        "body": review.body,
                        "verified_purchase": review.verified_purchase,
                        "created_at": review.created_at,
                    },
                    {
                        "id": int(product.id),
                        "name": product.name,
                        "slug": product.slug,
                    },
                )
                for review, product in rows
            ]
        )
    except SQLAlchemyError:
        db.rollback()

    rows: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for review in list_mock_product_reviews(status=ProductReviewStatus.APPROVED):
        product = get_mock_product(int(review["product_id"]))
        if not product:
            continue
        rows.append((review, product))

    rows.sort(
        key=lambda row: (
            0 if bool(row[0].get("verified_purchase", False)) else 1,
            -(row[0].get("created_at") or datetime.now(timezone.utc)).timestamp(),
        ),
    )
    return _build_reviews_summary(rows)


def list_reviews_public(
    db: Session,
    *,
    page: int,
    page_size: int,
    product: str | None = None,
    rating: int | None = None,
) -> dict[str, Any]:
    try:
        _ensure_product_reviews_table()
        query = (
            db.query(ProductReview, Product)
            .join(Product, Product.id == ProductReview.product_id)
            .filter(ProductReview.status == ProductReviewStatus.APPROVED)
        )

        if rating is not None:
            query = query.filter(ProductReview.rating == rating)

        normalized_product = product.strip() if product else None
        if normalized_product:
            if normalized_product.isdigit():
                query = query.filter(Product.id == int(normalized_product))
            else:
                pattern = f"%{normalized_product}%"
                query = query.filter(or_(Product.slug.ilike(pattern), Product.name.ilike(pattern)))

        rows = query.order_by(desc(ProductReview.verified_purchase), desc(ProductReview.created_at)).all()
        items = [
            _serialize_approved_review(
                {
                    "id": review.id,
                    "customer_name": review.customer_name,
                    "rating": review.rating,
                    "title": review.title,
                    "body": review.body,
                    "verified_purchase": review.verified_purchase,
                    "created_at": review.created_at,
                },
                {
                    "id": int(product_model.id),
                    "name": product_model.name,
                    "slug": product_model.slug,
                },
            )
            for review, product_model in rows
        ]
        total = len(items)
        average_rating = round(
            sum(int(item.get("rating") or 0) for item in items) / total,
            1,
        ) if total > 0 else 0.0
        start = max(0, (page - 1) * page_size)
        end = start + page_size
        return _build_reviews_list_response(
            items=items[start:end],
            page=page,
            page_size=page_size,
            total=total,
            average_rating=average_rating,
        )
    except SQLAlchemyError:
        db.rollback()

    rows: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for review in list_mock_product_reviews(status=ProductReviewStatus.APPROVED, rating=rating):
        product_model = get_mock_product(int(review["product_id"]))
        if not product_model:
            continue
        if not _product_matches_query(product_model, product):
            continue
        rows.append((review, product_model))

    rows.sort(
        key=lambda row: (
            0 if bool(row[0].get("verified_purchase", False)) else 1,
            -(row[0].get("created_at") or datetime.now(timezone.utc)).timestamp(),
        ),
    )

    items = [_serialize_approved_review(review, product_model) for review, product_model in rows]
    total = len(items)
    average_rating = round(
        sum(int(item.get("rating") or 0) for item in items) / total,
        1,
    ) if total > 0 else 0.0
    start = max(0, (page - 1) * page_size)
    end = start + page_size
    return _build_reviews_list_response(
        items=items[start:end],
        page=page,
        page_size=page_size,
        total=total,
        average_rating=average_rating,
    )


def create_product_review(db: Session, product_ref: str, payload: ProductReviewCreate) -> dict[str, Any]:
    try:
        _ensure_product_reviews_table()
        product = _resolve_db_product(db, product_ref)
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        review = ProductReview(
            product_id=product.id,
            order_id=None,
            customer_name=payload.customer_name.strip(),
            customer_email=_normalize_email(str(payload.customer_email)) if payload.customer_email else None,
            rating=payload.rating,
            title=_normalize_text(payload.title),
            body=payload.body.strip(),
            verified_purchase=False,
            status=ProductReviewStatus.PENDING,
            source=ProductReviewSource.CUSTOMER,
            created_at=datetime.now(timezone.utc),
            approved_at=None,
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        return {
            "id": review.id,
            "status": str(review.status),
            "created_at": review.created_at,
        }
    except HTTPException:
        raise
    except SQLAlchemyError:
        db.rollback()

    product = _resolve_mock_product(product_ref)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    review = create_mock_product_review(
        {
            "product_id": int(product["id"]),
            "order_id": None,
            "customer_name": payload.customer_name.strip(),
            "customer_email": _normalize_email(str(payload.customer_email)) if payload.customer_email else None,
            "rating": payload.rating,
            "title": _normalize_text(payload.title),
            "body": payload.body.strip(),
            "verified_purchase": False,
            "status": ProductReviewStatus.PENDING,
            "source": ProductReviewSource.CUSTOMER,
            "approved_at": None,
        }
    )
    return {
        "id": int(review["id"]),
        "status": str(review.get("status") or ProductReviewStatus.PENDING),
        "created_at": review["created_at"],
    }


def create_verified_product_review(db: Session, payload: VerifiedProductReviewCreate) -> dict[str, Any]:
    normalized_order_number = payload.order_number.strip()
    normalized_email = _normalize_email(str(payload.email)) if payload.email else None

    try:
        _ensure_product_reviews_table()
        order = db.query(Order).filter(Order.order_number == normalized_order_number).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No pudimos validar esa compra con los datos proporcionados.",
            )

        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if not customer or not _contact_matches(
            customer_email=customer.email,
            customer_phone=customer.phone,
            email=normalized_email,
            phone=payload.phone,
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No pudimos validar esa compra con los datos proporcionados.",
            )

        order_item = (
            db.query(OrderItem)
            .filter(OrderItem.order_id == order.id, OrderItem.product_id == payload.product_id)
            .first()
        )
        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ese producto no forma parte del pedido indicado.",
            )

        duplicate_query = db.query(ProductReview).filter(
            ProductReview.order_id == order.id,
            ProductReview.product_id == payload.product_id,
            ProductReview.verified_purchase.is_(True),
        )
        if normalized_email or customer.email:
            duplicate_query = duplicate_query.filter(
                ProductReview.customer_email == (normalized_email or _normalize_email(customer.email))
            )

        if duplicate_query.first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya recibimos una resena verificada para este producto y pedido.",
            )

        review = ProductReview(
            product_id=payload.product_id,
            order_id=order.id,
            customer_name=payload.customer_name.strip(),
            customer_email=normalized_email or _normalize_email(customer.email),
            rating=payload.rating,
            title=_normalize_text(payload.title),
            body=payload.body.strip(),
            verified_purchase=True,
            status=ProductReviewStatus.PENDING,
            source=ProductReviewSource.CUSTOMER,
            created_at=datetime.now(timezone.utc),
            approved_at=None,
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        return {
            "id": review.id,
            "status": str(review.status),
            "created_at": review.created_at,
        }
    except HTTPException:
        raise
    except SQLAlchemyError:
        db.rollback()

    order = get_mock_order_by_number(normalized_order_number)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pudimos validar esa compra con los datos proporcionados.",
        )

    customer = next((entry for entry in CUSTOMERS if entry["id"] == order["customer_id"]), None)
    customer_email = order.get("customer_email") or (customer.get("email") if customer else None)
    customer_phone = order.get("shipping_phone") or (customer.get("phone") if customer else None)
    if not _contact_matches(
        customer_email=customer_email,
        customer_phone=customer_phone,
        email=normalized_email,
        phone=payload.phone,
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pudimos validar esa compra con los datos proporcionados.",
        )

    has_product = any(int(item.get("product_id") or 0) == payload.product_id for item in order.get("items", []))
    if not has_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ese producto no forma parte del pedido indicado.",
        )

    duplicate_email = normalized_email or _normalize_email(customer_email)
    existing_reviews = list_mock_product_reviews(product_id=payload.product_id)
    duplicate = next(
        (
            review
            for review in existing_reviews
            if int(review.get("order_id") or 0) == int(order["id"])
            and bool(review.get("verified_purchase", False))
            and (
                not duplicate_email
                or _normalize_email(review.get("customer_email")) == duplicate_email
            )
        ),
        None,
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya recibimos una resena verificada para este producto y pedido.",
        )

    review = create_mock_product_review(
        {
            "product_id": payload.product_id,
            "order_id": int(order["id"]),
            "customer_name": payload.customer_name.strip(),
            "customer_email": duplicate_email,
            "rating": payload.rating,
            "title": _normalize_text(payload.title),
            "body": payload.body.strip(),
            "verified_purchase": True,
            "status": ProductReviewStatus.PENDING,
            "source": ProductReviewSource.CUSTOMER,
            "approved_at": None,
        }
    )
    return {
        "id": int(review["id"]),
        "status": str(review.get("status") or ProductReviewStatus.PENDING),
        "created_at": review["created_at"],
    }


def list_admin_product_reviews(
    db: Session,
    *,
    product: str | None = None,
    rating: int | None = None,
    search: str | None = None,
    status_value: str | None = None,
    verified_purchase: bool | None = None,
) -> list[dict[str, Any]]:
    normalized_product = product.strip().lower() if product else None
    normalized_status = _parse_review_status(status_value)

    try:
        _ensure_product_reviews_table()
        query = db.query(ProductReview)
        if normalized_status:
            query = query.filter(ProductReview.status == normalized_status)
        if verified_purchase is not None:
            query = query.filter(ProductReview.verified_purchase.is_(verified_purchase))
        if rating is not None:
            query = query.filter(ProductReview.rating == rating)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    ProductReview.customer_name.ilike(pattern),
                    ProductReview.customer_email.ilike(pattern),
                    ProductReview.title.ilike(pattern),
                    ProductReview.body.ilike(pattern),
                )
            )

        reviews = query.order_by(desc(ProductReview.verified_purchase), desc(ProductReview.created_at)).all()
        product_ids = sorted({int(review.product_id) for review in reviews})
        products = db.query(Product).filter(Product.id.in_(product_ids)).all() if product_ids else []
        product_by_id = {
            int(product_model.id): {
                "id": int(product_model.id),
                "name": product_model.name,
                "slug": product_model.slug,
            }
            for product_model in products
        }

        results: list[dict[str, Any]] = []
        for review in reviews:
            review_product = product_by_id.get(int(review.product_id))
            if not review_product:
                continue

            if normalized_product and not _product_matches_query(review_product, normalized_product):
                continue

            results.append(
                _serialize_admin_review(
                    {
                        "id": review.id,
                        "order_id": review.order_id,
                        "customer_name": review.customer_name,
                        "customer_email": review.customer_email,
                        "rating": review.rating,
                        "title": review.title,
                        "body": review.body,
                        "status": review.status,
                        "source": review.source,
                        "verified_purchase": review.verified_purchase,
                        "created_at": review.created_at,
                        "approved_at": review.approved_at,
                    },
                    review_product,
                )
            )

        return results
    except SQLAlchemyError:
        db.rollback()

    reviews = list_mock_product_reviews(
        rating=rating,
        search=search,
        status=str(normalized_status) if normalized_status else None,
        verified_purchase=verified_purchase,
    )
    reviews.sort(
        key=lambda review: (
            0 if bool(review.get("verified_purchase", False)) else 1,
            -(review.get("created_at") or datetime.now(timezone.utc)).timestamp(),
        ),
    )

    results: list[dict[str, Any]] = []
    for review in reviews:
        review_product = get_mock_product(int(review["product_id"]))
        if not review_product:
            continue
        if normalized_product and not _product_matches_query(review_product, normalized_product):
            continue
        results.append(_serialize_admin_review(review, review_product))
    return results


def update_admin_product_review(
    db: Session,
    review_id: int,
    payload: AdminProductReviewUpdate,
) -> dict[str, Any] | None:
    changes: dict[str, Any] = {}
    if "status" in payload.model_fields_set and payload.status is not None:
        changes["status"] = _parse_review_status(payload.status)
    if "title" in payload.model_fields_set:
        changes["title"] = payload.title
    if "body" in payload.model_fields_set:
        changes["body"] = payload.body

    now = datetime.now(timezone.utc)

    try:
        _ensure_product_reviews_table()
        review = db.query(ProductReview).filter(ProductReview.id == review_id).first()
        if not review:
            return None

        for field_name, field_value in changes.items():
            setattr(review, field_name, field_value)

        if "status" in changes:
            if changes["status"] == ProductReviewStatus.APPROVED:
                review.approved_at = review.approved_at or now
            else:
                review.approved_at = None

        db.add(review)
        db.commit()
        db.refresh(review)

        product = db.query(Product).filter(Product.id == review.product_id).first()
        if not product:
            return None

        return _serialize_admin_review(
            {
                "id": review.id,
                "order_id": review.order_id,
                "customer_name": review.customer_name,
                "customer_email": review.customer_email,
                "rating": review.rating,
                "title": review.title,
                "body": review.body,
                "status": review.status,
                "source": review.source,
                "verified_purchase": review.verified_purchase,
                "created_at": review.created_at,
                "approved_at": review.approved_at,
            },
            {
                "id": int(product.id),
                "name": product.name,
                "slug": product.slug,
            },
        )
    except SQLAlchemyError:
        db.rollback()

    review = get_mock_product_review(review_id)
    if not review:
        return None

    if "status" in changes:
        changes["approved_at"] = now if changes["status"] == ProductReviewStatus.APPROVED else None

    updated_review = update_mock_product_review(review_id, changes)
    if not updated_review:
        return None
    product = get_mock_product(int(updated_review["product_id"]))
    if not product:
        return None
    return _serialize_admin_review(updated_review, product)
