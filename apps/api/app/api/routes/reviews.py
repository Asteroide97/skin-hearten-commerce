from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.schemas.review import (
    ProductReviewCreateResponse,
    ReviewsListResponse,
    ReviewsSummaryResponse,
    VerifiedProductReviewCreate,
)
from app.services.product_reviews import (
    create_verified_product_review,
    get_reviews_summary_public,
    list_reviews_public,
)

router = APIRouter(prefix="/reviews")


@router.get("/summary", response_model=ReviewsSummaryResponse)
def get_reviews_summary(
    db: Session = Depends(get_db),
) -> ReviewsSummaryResponse:
    payload = get_reviews_summary_public(db)
    return ReviewsSummaryResponse.model_validate(payload)


@router.get("", response_model=ReviewsListResponse)
def get_reviews(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, alias="pageSize", ge=1, le=48),
    rating: int | None = Query(default=None, ge=1, le=5),
    product: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> ReviewsListResponse:
    payload = list_reviews_public(
        db,
        page=page,
        page_size=page_size,
        product=product,
        rating=rating,
    )
    return ReviewsListResponse.model_validate(payload)


@router.post("/verified", response_model=ProductReviewCreateResponse, status_code=status.HTTP_201_CREATED)
def post_verified_review(
    payload: VerifiedProductReviewCreate,
    db: Session = Depends(get_db),
) -> ProductReviewCreateResponse:
    review = create_verified_product_review(db, payload)
    return ProductReviewCreateResponse.model_validate(review)
