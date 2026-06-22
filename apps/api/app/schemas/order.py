from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class OrderItemRead(BaseModel):
    product_id: int = Field(serialization_alias="productId")
    product_name: str = Field(serialization_alias="productName")
    quantity: int
    unit_price: float = Field(serialization_alias="unitPrice")

    model_config = ConfigDict(populate_by_name=True)


class OrderRead(BaseModel):
    id: int
    order_number: str = Field(serialization_alias="orderNumber")
    customer_id: int = Field(serialization_alias="customerId")
    status: str
    subtotal: float
    discount_total: float = Field(serialization_alias="discountTotal")
    shipping_total: float = Field(serialization_alias="shippingTotal")
    grand_total: float = Field(serialization_alias="grandTotal")
    payment_provider: str = Field(serialization_alias="paymentProvider")
    items: list[OrderItemRead]

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderSummaryRead(BaseModel):
    id: int
    order_number: str = Field(serialization_alias="orderNumber")
    customer_name: str = Field(serialization_alias="customerName")
    customer_email: str | None = Field(default=None, serialization_alias="customerEmail")
    customer_phone: str | None = Field(default=None, serialization_alias="customerPhone")
    status: str
    payment_status: str = Field(serialization_alias="paymentStatus")
    payment_provider: str = Field(serialization_alias="paymentProvider")
    total: float
    created_at: datetime = Field(serialization_alias="createdAt")
    paid_at: datetime | None = Field(default=None, serialization_alias="paidAt")

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderCustomerRead(BaseModel):
    id: int
    name: str
    email: str | None = None
    phone: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderShippingAddressRead(BaseModel):
    line1: str | None = None
    line2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = Field(default=None, serialization_alias="postalCode")
    country: str | None = None
    full_address: str = Field(serialization_alias="fullAddress")

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderPaymentRead(BaseModel):
    id: int
    provider: str
    provider_reference: str | None = Field(default=None, serialization_alias="providerReference")
    status: str
    amount: float
    raw_payload_json: dict | None = Field(default=None, serialization_alias="rawPayloadJson")
    paid_at: datetime | None = Field(default=None, serialization_alias="paidAt")
    failed_at: datetime | None = Field(default=None, serialization_alias="failedAt")
    created_at: datetime | None = Field(default=None, serialization_alias="createdAt")
    updated_at: datetime | None = Field(default=None, serialization_alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderCrmContactRead(BaseModel):
    id: int
    name: str
    email: str | None = None
    whatsapp: str | None = None
    lifecycle_status: str = Field(serialization_alias="lifecycleStatus")

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderTimestampsRead(BaseModel):
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime | None = Field(default=None, serialization_alias="updatedAt")
    paid_at: datetime | None = Field(default=None, serialization_alias="paidAt")
    shipped_at: datetime | None = Field(default=None, serialization_alias="shippedAt")
    delivered_at: datetime | None = Field(default=None, serialization_alias="deliveredAt")
    cancelled_at: datetime | None = Field(default=None, serialization_alias="cancelledAt")
    refunded_at: datetime | None = Field(default=None, serialization_alias="refundedAt")

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderDetailRead(BaseModel):
    id: int
    order_number: str = Field(serialization_alias="orderNumber")
    status: str
    payment_status: str = Field(serialization_alias="paymentStatus")
    payment_provider: str = Field(serialization_alias="paymentProvider")
    subtotal: float
    discount_total: float = Field(serialization_alias="discountTotal")
    shipping_total: float = Field(serialization_alias="shippingTotal")
    total: float
    tracking_number: str | None = Field(default=None, serialization_alias="trackingNumber")
    shipping_carrier: str | None = Field(default=None, serialization_alias="shippingCarrier")
    internal_notes: str | None = Field(default=None, serialization_alias="internalNotes")
    customer: AdminOrderCustomerRead
    shipping_address: AdminOrderShippingAddressRead = Field(serialization_alias="shippingAddress")
    items: list[OrderItemRead]
    payment: AdminOrderPaymentRead
    raw_provider_reference: str | None = Field(default=None, serialization_alias="rawProviderReference")
    timestamps: AdminOrderTimestampsRead
    crm_contact: AdminOrderCrmContactRead | None = Field(default=None, serialization_alias="crmContact")

    model_config = ConfigDict(populate_by_name=True)


class AdminOrderUpdate(BaseModel):
    status: str | None = Field(
        default=None,
        pattern="^(pending|paid|preparing|shipped|delivered|canceled|cancelled|refunded)$",
    )
    tracking_number: str | None = Field(default=None, alias="trackingNumber", max_length=120)
    shipping_carrier: str | None = Field(default=None, alias="shippingCarrier", max_length=120)
    internal_notes: str | None = Field(default=None, alias="internalNotes", max_length=2000)
    explicit_manual_override: bool = Field(default=False, alias="explicitManualOverride")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    @field_validator("status")
    @classmethod
    def normalize_status(cls, value: str | None) -> str | None:
        if value == "cancelled":
            return "canceled"
        return value

    @model_validator(mode="after")
    def validate_non_empty_payload(self) -> "AdminOrderUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one order field must be provided")
        return self
