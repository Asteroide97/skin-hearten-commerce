from enum import StrEnum


class RoleName(StrEnum):
    SUPERADMIN = "superadmin"


class InventoryMovementType(StrEnum):
    ENTRY = "entry"
    EXIT = "exit"
    ADJUSTMENT = "adjustment"


class OrderStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    PREPARING = "preparing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELED = "canceled"
    REFUNDED = "refunded"


class PaymentProvider(StrEnum):
    MERCADOPAGO = "mercadopago"
    PAYPAL = "paypal"
    STRIPE = "stripe"


class PaymentStatus(StrEnum):
    PENDING = "pending"
    REQUIRES_ACTION = "requires_action"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class CouponType(StrEnum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"
    FREE_SHIPPING = "free_shipping"

