from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class CustomerOrderLookupInput(BaseModel):
    email: EmailStr | None = None
    phone: str | None = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def validate_contact(self) -> "CustomerOrderLookupInput":
        if not self.email and not self.phone:
            raise ValueError("Email or phone is required")
        return self


class CustomerOrderItemRead(BaseModel):
    product_id: int = Field(serialization_alias="productId")
    product_name: str = Field(serialization_alias="productName")
    quantity: int
    unit_price: float = Field(serialization_alias="unitPrice")

    model_config = ConfigDict(populate_by_name=True)


class CustomerOrderShippingAddressRead(BaseModel):
    line1: str | None = None
    line2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = Field(default=None, serialization_alias="postalCode")
    country: str | None = None
    full_address: str = Field(serialization_alias="fullAddress")

    model_config = ConfigDict(populate_by_name=True)


class CustomerOrderCustomerRead(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class CustomerOrderTrackingRead(BaseModel):
    tracking_number: str | None = Field(default=None, serialization_alias="trackingNumber")
    shipping_carrier: str | None = Field(default=None, serialization_alias="shippingCarrier")

    model_config = ConfigDict(populate_by_name=True)


class CustomerOrderTimestampsRead(BaseModel):
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime | None = Field(default=None, serialization_alias="updatedAt")
    paid_at: datetime | None = Field(default=None, serialization_alias="paidAt")
    shipped_at: datetime | None = Field(default=None, serialization_alias="shippedAt")
    delivered_at: datetime | None = Field(default=None, serialization_alias="deliveredAt")
    cancelled_at: datetime | None = Field(default=None, serialization_alias="cancelledAt")
    refunded_at: datetime | None = Field(default=None, serialization_alias="refundedAt")

    model_config = ConfigDict(populate_by_name=True)


class CustomerOrderSummaryRead(BaseModel):
    order_id: int = Field(serialization_alias="orderId")
    order_number: str = Field(serialization_alias="orderNumber")
    status: str
    payment_status: str = Field(serialization_alias="paymentStatus")
    payment_provider: str = Field(serialization_alias="paymentProvider")
    total: float
    created_at: datetime = Field(serialization_alias="createdAt")
    shipped_at: datetime | None = Field(default=None, serialization_alias="shippedAt")
    delivered_at: datetime | None = Field(default=None, serialization_alias="deliveredAt")
    tracking_number: str | None = Field(default=None, serialization_alias="trackingNumber")
    shipping_carrier: str | None = Field(default=None, serialization_alias="shippingCarrier")

    model_config = ConfigDict(populate_by_name=True)


class CustomerOrderDetailRead(BaseModel):
    order_id: int = Field(serialization_alias="orderId")
    order_number: str = Field(serialization_alias="orderNumber")
    customer: CustomerOrderCustomerRead
    shipping_address: CustomerOrderShippingAddressRead = Field(serialization_alias="shippingAddress")
    items: list[CustomerOrderItemRead]
    payment_status: str = Field(serialization_alias="paymentStatus")
    payment_provider: str = Field(serialization_alias="paymentProvider")
    order_status: str = Field(serialization_alias="orderStatus")
    tracking: CustomerOrderTrackingRead
    timestamps: CustomerOrderTimestampsRead
    subtotal: float
    discount: float
    shipping: float
    total: float

    model_config = ConfigDict(populate_by_name=True)
