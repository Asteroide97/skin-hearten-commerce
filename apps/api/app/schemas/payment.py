from pydantic import BaseModel, Field


class PaymentCreateRequest(BaseModel):
    order_id: int
    provider: str = Field(pattern="^(mercadopago|paypal|stripe)$")


class PaymentCreateResponse(BaseModel):
    provider: str
    checkout_url: str
    reference: str
    status: str

