from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

ProductReviewStatus = Literal["pending", "approved", "rejected"]
ProductReviewSource = Literal["customer", "imported", "admin"]


class ProductReviewRead(BaseModel):
    id: int
    customer_name: str = Field(serialization_alias="customerName")
    rating: int
    title: str | None = None
    body: str
    verified_purchase: bool = Field(default=False, serialization_alias="verifiedPurchase")
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class ApprovedProductReviewRead(BaseModel):
    id: int
    product_id: int = Field(serialization_alias="productId")
    product_name: str = Field(serialization_alias="productName")
    product_slug: str = Field(serialization_alias="productSlug")
    customer_name: str = Field(serialization_alias="customerName")
    rating: int
    title: str | None = None
    body: str
    verified_purchase: bool = Field(default=False, serialization_alias="verifiedPurchase")
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class ProductReviewListResponse(BaseModel):
    product_id: int = Field(serialization_alias="productId")
    average_rating: float = Field(serialization_alias="averageRating")
    review_count: int = Field(serialization_alias="reviewCount")
    reviews: list[ProductReviewRead]

    model_config = ConfigDict(populate_by_name=True)


class ReviewsSummaryResponse(BaseModel):
    average_rating: float = Field(serialization_alias="averageRating")
    total_reviews: int = Field(serialization_alias="totalReviews")
    approved_reviews_preview: list[ApprovedProductReviewRead] = Field(serialization_alias="approvedReviewsPreview")

    model_config = ConfigDict(populate_by_name=True)


class ReviewsListResponse(BaseModel):
    items: list[ApprovedProductReviewRead]
    page: int
    page_size: int = Field(serialization_alias="pageSize")
    total: int
    total_pages: int = Field(serialization_alias="totalPages")
    average_rating: float = Field(serialization_alias="averageRating")

    model_config = ConfigDict(populate_by_name=True)


class ProductReviewCreate(BaseModel):
    customer_name: str = Field(alias="customerName", min_length=2, max_length=255)
    customer_email: EmailStr | None = Field(default=None, alias="customerEmail")
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(default=None, max_length=255)
    body: str = Field(min_length=10)

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    @field_validator("title", mode="before")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("body", "customer_name", mode="before")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        return normalized


class VerifiedProductReviewCreate(BaseModel):
    order_number: str = Field(alias="orderNumber", min_length=2, max_length=80)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    product_id: int = Field(alias="productId", ge=1)
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(default=None, max_length=255)
    body: str = Field(min_length=10)
    customer_name: str = Field(alias="customerName", min_length=2, max_length=255)

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    @field_validator("order_number", "body", "customer_name", mode="before")
    @classmethod
    def normalize_required_fields(cls, value: str) -> str:
        normalized = value.strip()
        return normalized

    @field_validator("phone", "title", mode="before")
    @classmethod
    def normalize_optional_fields(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def validate_contact(self) -> "VerifiedProductReviewCreate":
        if not self.email and not self.phone:
            raise ValueError("Email or phone is required")
        return self


class ProductReviewCreateResponse(BaseModel):
    id: int
    status: ProductReviewStatus
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class AdminProductReviewRead(BaseModel):
    id: int
    product_id: int = Field(serialization_alias="productId")
    product_name: str = Field(serialization_alias="productName")
    product_slug: str = Field(serialization_alias="productSlug")
    customer_name: str = Field(serialization_alias="customerName")
    customer_email: EmailStr | None = Field(default=None, serialization_alias="customerEmail")
    rating: int
    title: str | None = None
    body: str
    status: ProductReviewStatus
    source: ProductReviewSource
    verified_purchase: bool = Field(default=False, serialization_alias="verifiedPurchase")
    order_id: int | None = Field(default=None, serialization_alias="orderId")
    created_at: datetime = Field(serialization_alias="createdAt")
    approved_at: datetime | None = Field(default=None, serialization_alias="approvedAt")

    model_config = ConfigDict(populate_by_name=True)


class AdminProductReviewUpdate(BaseModel):
    status: ProductReviewStatus | None = None
    title: str | None = Field(default=None, max_length=255)
    body: str | None = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("title", mode="before")
    @classmethod
    def normalize_optional_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("body", mode="before")
    @classmethod
    def normalize_optional_body(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def validate_payload(self) -> "AdminProductReviewUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one review field must be provided")
        if "body" in self.model_fields_set and not self.body:
            raise ValueError("body cannot be empty")
        return self
