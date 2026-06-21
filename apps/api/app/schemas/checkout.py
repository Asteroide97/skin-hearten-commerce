from pydantic import BaseModel, EmailStr, Field


class CheckoutRequest(BaseModel):
    first_name: str = Field(min_length=2)
    last_name: str = Field(min_length=2)
    email: EmailStr
    phone: str = Field(min_length=8)
    address_line1: str = Field(min_length=5)
    city: str = Field(min_length=2)
    state: str = Field(min_length=2)
    postal_code: str = Field(min_length=5)
    payment_method: str = Field(pattern="^(mercadopago|paypal|stripe)$")
    coupon_code: str | None = None


class CheckoutResponse(BaseModel):
    order_id: int
    order_number: str
    payment_provider: str
    payment_reference: str
    checkout_url: str
    status: str

