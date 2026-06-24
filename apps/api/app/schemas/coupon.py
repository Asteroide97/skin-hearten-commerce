from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class CouponSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class CouponValidationItemInput(CouponSchema):
    product_id: int | str | None = Field(default=None, alias="productId")
    slug: str | None = None
    name: str | None = None
    quantity: int | None = Field(default=None, ge=1)
    unit_price: float | None = Field(default=None, alias="unitPrice", ge=0)


class CouponValidateRequest(CouponSchema):
    code: str = Field(min_length=2, max_length=80)
    items: list[CouponValidationItemInput] = Field(default_factory=list)
    customer_email: EmailStr | None = Field(default=None, alias="customerEmail")
    customer_phone: str | None = Field(default=None, alias="customerPhone", max_length=30)
    subtotal: float = Field(ge=0)


class CouponValidateResponse(CouponSchema):
    valid: bool
    code: str | None = None
    discount_type: str | None = Field(default=None, serialization_alias="discountType")
    discount_amount: float = Field(serialization_alias="discountAmount")
    free_shipping: bool = Field(serialization_alias="freeShipping")
    reason_code: str = Field(serialization_alias="reasonCode")
    message: str


class AdminCouponRead(CouponSchema):
    id: int
    code: str
    name: str
    description: str | None = None
    discount_type: str = Field(serialization_alias="discountType")
    discount_value: float = Field(serialization_alias="discountValue")
    min_subtotal: float | None = Field(default=None, serialization_alias="minSubtotal")
    max_discount: float | None = Field(default=None, serialization_alias="maxDiscount")
    starts_at: datetime | None = Field(default=None, serialization_alias="startsAt")
    ends_at: datetime | None = Field(default=None, serialization_alias="endsAt")
    usage_limit: int | None = Field(default=None, serialization_alias="usageLimit")
    usage_count: int = Field(serialization_alias="usageCount")
    per_customer_limit: int | None = Field(default=None, serialization_alias="perCustomerLimit")
    is_active: bool = Field(serialization_alias="isActive")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class AdminCouponWrite(CouponSchema):
    code: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    discount_type: str = Field(alias="discountType", pattern="^(percentage|fixed_amount|free_shipping|fixed)$")
    discount_value: float = Field(alias="discountValue", ge=0)
    min_subtotal: float | None = Field(default=None, alias="minSubtotal", ge=0)
    max_discount: float | None = Field(default=None, alias="maxDiscount", ge=0)
    starts_at: datetime | None = Field(default=None, alias="startsAt")
    ends_at: datetime | None = Field(default=None, alias="endsAt")
    usage_limit: int | None = Field(default=None, alias="usageLimit", ge=1)
    per_customer_limit: int | None = Field(default=None, alias="perCustomerLimit", ge=1)
    is_active: bool = Field(default=True, alias="isActive")

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("discount_type")
    @classmethod
    def normalize_discount_type(cls, value: str) -> str:
        return "fixed_amount" if value == "fixed" else value

    @model_validator(mode="after")
    def validate_logic(self) -> "AdminCouponWrite":
        if self.ends_at and self.starts_at and self.ends_at < self.starts_at:
            raise ValueError("endsAt must be later than startsAt")
        if self.discount_type == "percentage" and self.discount_value > 100:
            raise ValueError("Percentage discounts cannot exceed 100")
        if self.discount_type == "free_shipping" and self.discount_value != 0:
            self.discount_value = 0
        if self.max_discount is not None and self.discount_type == "free_shipping":
            self.max_discount = None
        return self


class AdminCouponCreate(AdminCouponWrite):
    pass


class AdminCouponUpdate(CouponSchema):
    code: str | None = Field(default=None, min_length=2, max_length=80)
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    discount_type: str | None = Field(
        default=None,
        alias="discountType",
        pattern="^(percentage|fixed_amount|free_shipping|fixed)$",
    )
    discount_value: float | None = Field(default=None, alias="discountValue", ge=0)
    min_subtotal: float | None = Field(default=None, alias="minSubtotal", ge=0)
    max_discount: float | None = Field(default=None, alias="maxDiscount", ge=0)
    starts_at: datetime | None = Field(default=None, alias="startsAt")
    ends_at: datetime | None = Field(default=None, alias="endsAt")
    usage_limit: int | None = Field(default=None, alias="usageLimit", ge=1)
    per_customer_limit: int | None = Field(default=None, alias="perCustomerLimit", ge=1)
    is_active: bool | None = Field(default=None, alias="isActive")

    @field_validator("code")
    @classmethod
    def normalize_optional_code(cls, value: str | None) -> str | None:
        return value.strip().upper() if value else value

    @field_validator("discount_type")
    @classmethod
    def normalize_optional_discount_type(cls, value: str | None) -> str | None:
        if value == "fixed":
            return "fixed_amount"
        return value

    @model_validator(mode="after")
    def validate_payload(self) -> "AdminCouponUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one coupon field must be provided")
        if self.ends_at and self.starts_at and self.ends_at < self.starts_at:
            raise ValueError("endsAt must be later than startsAt")
        if self.discount_type == "percentage" and self.discount_value is not None and self.discount_value > 100:
            raise ValueError("Percentage discounts cannot exceed 100")
        return self


class AdminCouponDuplicateRequest(CouponSchema):
    code: str = Field(min_length=2, max_length=80)

    @field_validator("code")
    @classmethod
    def normalize_duplicate_code(cls, value: str) -> str:
        return value.strip().upper()
