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
    FIXED_AMOUNT = "fixed_amount"
    FREE_SHIPPING = "free_shipping"


class ProductReviewStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ProductReviewSource(StrEnum):
    CUSTOMER = "customer"
    IMPORTED = "imported"
    ADMIN = "admin"


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


class CRMAutomationTriggerType(StrEnum):
    SKIN_QUIZ_COMPLETED = "skin_quiz_completed"
    CHECKOUT_COMPLETED = "checkout_completed"
    ABANDONED_CART = "abandoned_cart"
    POST_PURCHASE = "post_purchase"
    REPURCHASE_DUE = "repurchase_due"
    CUSTOMER_INACTIVE = "customer_inactive"


class CRMAutomationRunStatus(StrEnum):
    PENDING = "pending"
    EXECUTED = "executed"
    SKIPPED = "skipped"
    FAILED = "failed"


class CRMReminderStatus(StrEnum):
    PENDING = "pending"
    READY = "ready"
    SENT_MANUAL = "sent_manual"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"


class CRMReminderChannel(StrEnum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"


class CRMReminderType(StrEnum):
    SKIN_QUIZ_FOLLOW_UP = "skin_quiz_follow_up"
    ABANDONED_CART = "abandoned_cart"
    POST_PURCHASE = "post_purchase"
    POST_SHIPPING_FOLLOW_UP = "post_shipping_follow_up"
    REPURCHASE_30_DAYS = "repurchase_30_days"
    CUSTOMER_INACTIVE = "customer_inactive"
    MANUAL = "manual"
