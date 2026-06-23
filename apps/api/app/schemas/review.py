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
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class ProductReviewListResponse(BaseModel):
    product_id: int = Field(serialization_alias="productId")
    average_rating: float = Field(serialization_alias="averageRating")
    review_count: int = Field(serialization_alias="reviewCount")
    reviews: list[ProductReviewRead]

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
