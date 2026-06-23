from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.schemas.review import ProductReviewCreate, ProductReviewCreateResponse, ProductReviewListResponse
from app.services.product_reviews import create_product_review, get_product_reviews_public

router = APIRouter(prefix="/products")


@router.get("/{product_ref}/reviews", response_model=ProductReviewListResponse)
def get_product_reviews(
    product_ref: str,
    db: Session = Depends(get_db),
) -> ProductReviewListResponse:
    review_payload = get_product_reviews_public(db, product_ref)
    if not review_payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ProductReviewListResponse.model_validate(review_payload)


@router.post("/{product_ref}/reviews", response_model=ProductReviewCreateResponse, status_code=status.HTTP_201_CREATED)
def post_product_review(
    product_ref: str,
    payload: ProductReviewCreate,
    db: Session = Depends(get_db),
) -> ProductReviewCreateResponse:
    review = create_product_review(db, product_ref, payload)
    return ProductReviewCreateResponse.model_validate(review)
