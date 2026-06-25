from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AdminCustomerSummaryRead(BaseModel):
    id: int
    name: str
    first_name: str = Field(serialization_alias="firstName")
    last_name: str | None = Field(default=None, serialization_alias="lastName")
    email: str | None = None
    whatsapp: str | None = None
    orders_count: int = Field(serialization_alias="ordersCount")
    total_spent: float = Field(serialization_alias="totalSpent")
    last_purchase_at: datetime | None = Field(default=None, serialization_alias="lastPurchaseAt")
    accepted_marketing: bool | None = Field(default=None, serialization_alias="acceptedMarketing")
    lifecycle_status: str | None = Field(default=None, serialization_alias="lifecycleStatus")
    main_goal: str | None = Field(default=None, serialization_alias="mainGoal")
    skin_type: str | None = Field(default=None, serialization_alias="skinType")
    source: str | None = None
    has_orders: bool = Field(serialization_alias="hasOrders")
    created_at: datetime | None = Field(default=None, serialization_alias="createdAt")
    updated_at: datetime | None = Field(default=None, serialization_alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True)


class AdminCustomerAddressRead(BaseModel):
    id: int
    label: str
    address_line1: str = Field(serialization_alias="addressLine1")
    city: str
    state: str
    postal_code: str = Field(serialization_alias="postalCode")
    is_default: bool = Field(serialization_alias="isDefault")

    model_config = ConfigDict(populate_by_name=True)


class AdminCustomerRecentOrderRead(BaseModel):
    id: int
    order_number: str = Field(serialization_alias="orderNumber")
    status: str
    payment_status: str = Field(serialization_alias="paymentStatus")
    payment_provider: str = Field(serialization_alias="paymentProvider")
    total: float
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class AdminCustomerNoteRead(BaseModel):
    id: int
    note: str
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class AdminCustomerDetailRead(AdminCustomerSummaryRead):
    addresses: list[AdminCustomerAddressRead]
    recent_orders: list[AdminCustomerRecentOrderRead] = Field(serialization_alias="recentOrders")
    notes: list[AdminCustomerNoteRead]
    tags: list[str]


class AdminCustomerPageRead(BaseModel):
    items: list[AdminCustomerSummaryRead]
    page: int
    page_size: int = Field(serialization_alias="pageSize")
    total: int
    total_pages: int = Field(serialization_alias="totalPages")

    model_config = ConfigDict(populate_by_name=True)
