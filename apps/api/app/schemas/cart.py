from pydantic import BaseModel, Field


class CartItemRead(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float


class CartRead(BaseModel):
    customer_id: int
    items: list[CartItemRead]


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)

