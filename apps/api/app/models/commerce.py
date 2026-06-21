from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import CouponType, InventoryMovementType, OrderStatus, PaymentProvider, PaymentStatus
from app.models.mixins import TimestampMixin


class InventoryMovement(TimestampMixin, Base):
    __tablename__ = "inventory_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    movement_type: Mapped[InventoryMovementType] = mapped_column(Enum(InventoryMovementType))
    quantity: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str | None] = mapped_column(String(255))


class Cart(TimestampMixin, Base):
    __tablename__ = "carts"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), unique=True)


class CartItem(TimestampMixin, Base):
    __tablename__ = "cart_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    cart_id: Mapped[int] = mapped_column(ForeignKey("carts.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2))


class Order(TimestampMixin, Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.PENDING)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2))
    discount_total: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    shipping_total: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    grand_total: Mapped[float] = mapped_column(Numeric(10, 2))
    shipping_name: Mapped[str] = mapped_column(String(255))
    shipping_address: Mapped[str] = mapped_column(Text())


class OrderItem(TimestampMixin, Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    product_name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2))


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    provider: Mapped[PaymentProvider] = mapped_column(Enum(PaymentProvider))
    provider_reference: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Coupon(TimestampMixin, Base):
    __tablename__ = "coupons"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(80), unique=True)
    coupon_type: Mapped[CouponType] = mapped_column(Enum(CouponType))
    value: Mapped[float] = mapped_column(Numeric(10, 2))
    starts_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    minimum_amount: Mapped[float | None] = mapped_column(Numeric(10, 2))
    max_uses: Mapped[int | None] = mapped_column(Integer)


class CouponUsage(TimestampMixin, Base):
    __tablename__ = "coupon_usages"

    id: Mapped[int] = mapped_column(primary_key=True)
    coupon_id: Mapped[int] = mapped_column(ForeignKey("coupons.id"))
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
