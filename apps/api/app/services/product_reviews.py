from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import desc, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import Base, Product, ProductReview
from app.models.enums import ProductReviewSource, ProductReviewStatus
from app.schemas.review import AdminProductReviewUpdate, ProductReviewCreate
from app.services.mock_store import (
    create_product_review as create_mock_product_review,
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
            .order_by(desc(ProductReview.created_at))
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
    return _build_public_response(int(product["id"]), reviews)


def create_product_review(db: Session, product_ref: str, payload: ProductReviewCreate) -> dict[str, Any]:
    try:
        _ensure_product_reviews_table()
        product = _resolve_db_product(db, product_ref)
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        review = ProductReview(
            product_id=product.id,
            customer_name=payload.customer_name.strip(),
            customer_email=_normalize_email(str(payload.customer_email)) if payload.customer_email else None,
            rating=payload.rating,
            title=_normalize_text(payload.title),
            body=payload.body.strip(),
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
            "customer_name": payload.customer_name.strip(),
            "customer_email": _normalize_email(str(payload.customer_email)) if payload.customer_email else None,
            "rating": payload.rating,
            "title": _normalize_text(payload.title),
            "body": payload.body.strip(),
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
) -> list[dict[str, Any]]:
    normalized_product = product.strip().lower() if product else None
    normalized_status = _parse_review_status(status_value)

    try:
        _ensure_product_reviews_table()
        query = db.query(ProductReview)
        if normalized_status:
            query = query.filter(ProductReview.status == normalized_status)
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

        reviews = query.order_by(desc(ProductReview.created_at)).all()
        product_ids = sorted({int(review.product_id) for review in reviews})
        products = (
            db.query(Product).filter(Product.id.in_(product_ids)).all()
            if product_ids
            else []
        )
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

            if normalized_product:
                haystack = " ".join(
                    [
                        str(review_product.get("id") or ""),
                        str(review_product.get("name") or ""),
                        str(review_product.get("slug") or ""),
                    ]
                ).lower()
                if normalized_product not in haystack:
                    continue

            results.append(
                _serialize_admin_review(
                    {
                        "id": review.id,
                        "customer_name": review.customer_name,
                        "customer_email": review.customer_email,
                        "rating": review.rating,
                        "title": review.title,
                        "body": review.body,
                        "status": review.status,
                        "source": review.source,
                        "created_at": review.created_at,
                        "approved_at": review.approved_at,
                    },
                    review_product,
                )
            )

        return results
    except SQLAlchemyError:
        db.rollback()

    product_id_filter: int | None = None
    if normalized_product:
        matched_product = _find_mock_product_by_query(normalized_product)
        if matched_product:
            product_id_filter = int(matched_product["id"])

    reviews = list_mock_product_reviews(
        product_id=product_id_filter,
        rating=rating,
        search=search,
        status=str(normalized_status) if normalized_status else None,
    )
    results: list[dict[str, Any]] = []
    for review in reviews:
        review_product = get_mock_product(int(review["product_id"]))
        if not review_product:
            continue
        if normalized_product and product_id_filter is None:
            product_haystack = " ".join(
                [
                    str(review_product.get("id") or ""),
                    str(review_product.get("name") or ""),
                    str(review_product.get("slug") or ""),
                ]
            ).lower()
            if normalized_product not in product_haystack:
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
                "customer_name": review.customer_name,
                "customer_email": review.customer_email,
                "rating": review.rating,
                "title": review.title,
                "body": review.body,
                "status": review.status,
                "source": review.source,
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
