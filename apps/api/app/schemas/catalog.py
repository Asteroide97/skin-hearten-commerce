from pydantic import BaseModel, Field


class CategoryRead(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None = None


class CategoryWrite(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=140)
    description: str | None = None


class BrandRead(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None = None


class BrandWrite(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=140)
    description: str | None = None


class ProductRead(BaseModel):
    id: int
    name: str
    slug: str
    sku: str
    brand_id: int
    brand_name: str
    category_id: int
    category_name: str
    price: float
    discount_price: float | None = None
    stock: int
    description: str
    benefits: list[str]
    ingredients: list[str]
    usage: list[str]
    skin_type: list[str]
    concern: list[str]
    is_active: bool


class ProductWrite(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    slug: str = Field(min_length=2, max_length=255)
    sku: str = Field(min_length=2, max_length=80)
    brand_id: int
    brand_name: str
    category_id: int
    category_name: str
    price: float = Field(gt=0)
    discount_price: float | None = Field(default=None, gt=0)
    stock: int = Field(ge=0)
    description: str = Field(min_length=10)
    benefits: list[str] = Field(default_factory=list)
    ingredients: list[str] = Field(default_factory=list)
    usage: list[str] = Field(default_factory=list)
    skin_type: list[str] = Field(default_factory=list)
    concern: list[str] = Field(default_factory=list)
    is_active: bool = True

