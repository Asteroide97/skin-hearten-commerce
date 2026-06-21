from pydantic import BaseModel, Field


class OrderItemRead(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: float


class OrderRead(BaseModel):
    id: int
    order_number: str
    customer_id: int
    status: str
    subtotal: float
    discount_total: float
    shipping_total: float
    grand_total: float
    payment_provider: str
    items: list[OrderItemRead]


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|paid|preparing|shipped|delivered|canceled|refunded)$")

