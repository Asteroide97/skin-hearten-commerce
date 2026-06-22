from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CheckoutSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class CheckoutCustomerInput(CheckoutSchema):
    first_name: str = Field(alias="firstName", min_length=2)
    last_name: str = Field(alias="lastName", min_length=2)
    email: EmailStr
    phone: str = Field(min_length=8)


class CheckoutShippingAddressInput(CheckoutSchema):
    line1: str = Field(min_length=5)
    line2: str | None = None
    city: str = Field(min_length=2)
    state: str = Field(min_length=2)
    postal_code: str = Field(alias="postalCode", min_length=5)
    country: str = Field(min_length=2)


class CheckoutItemInput(CheckoutSchema):
    product_id: int | str = Field(alias="productId")
    slug: str = Field(min_length=1)
    name: str = Field(min_length=1)
    quantity: int = Field(ge=1)
    unit_price: float = Field(alias="unitPrice", gt=0)


class CheckoutRequest(CheckoutSchema):
    customer: CheckoutCustomerInput
    shipping_address: CheckoutShippingAddressInput = Field(alias="shippingAddress")
    items: list[CheckoutItemInput] = Field(min_length=1)
    coupon_code: str | None = Field(default=None, alias="couponCode")
    payment_method: str = Field(alias="paymentMethod", pattern="^(mercadopago|paypal|stripe)$")


class CheckoutResponse(BaseModel):
    order_id: int = Field(serialization_alias="orderId")
    order_number: str = Field(serialization_alias="orderNumber")
    status: str
    payment_status: str = Field(serialization_alias="paymentStatus")
    subtotal: float
    discount: float
    shipping: float
    total: float
    next_action: str = Field(serialization_alias="nextAction")
