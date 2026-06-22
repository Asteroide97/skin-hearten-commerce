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


class CRMLifecycleStatus(StrEnum):
    LEAD = "lead"
    CUSTOMER = "customer"
    REPEAT_CUSTOMER = "repeat_customer"
    INACTIVE = "inactive"


class CRMTaskStatus(StrEnum):
    PENDING = "pending"
    DONE = "done"
    CANCELLED = "cancelled"


class CRMTaskType(StrEnum):
    FOLLOW_UP = "follow_up"
    ABANDONED_CART = "abandoned_cart"
    REPURCHASE = "repurchase"
    POST_PURCHASE = "post_purchase"
    MANUAL = "manual"
