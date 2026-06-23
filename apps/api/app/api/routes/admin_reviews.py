from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db.session import get_db
from app.schemas.review import AdminProductReviewRead, AdminProductReviewUpdate
from app.services.product_reviews import list_admin_product_reviews, update_admin_product_review

router = APIRouter(prefix="/admin/reviews")


@router.get("", response_model=list[AdminProductReviewRead])
def list_reviews_admin(
    status_value: str | None = Query(default=None, alias="status"),
    product: str | None = Query(default=None),
    rating: int | None = Query(default=None, ge=1, le=5),
    search: str | None = Query(default=None),
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[AdminProductReviewRead]:
    reviews = list_admin_product_reviews(
        db,
        product=product,
        rating=rating,
        search=search,
        status_value=status_value,
    )
    return [AdminProductReviewRead.model_validate(review) for review in reviews]


@router.patch("/{review_id}", response_model=AdminProductReviewRead)
def patch_review_admin(
    review_id: int,
    payload: AdminProductReviewUpdate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminProductReviewRead:
    review = update_admin_product_review(db, review_id, payload)
    if not review:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Review not found")
    return AdminProductReviewRead.model_validate(review)
