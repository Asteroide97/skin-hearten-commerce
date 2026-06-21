from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin


class Brand(TimestampMixin, Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text())


class Category(TimestampMixin, Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text())
    image_url: Mapped[str | None] = mapped_column(String(255))


class Product(TimestampMixin, Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id"))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    name: Mapped[str] = mapped_column(String(255), index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    sku: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    discount_price: Mapped[float | None] = mapped_column(Numeric(10, 2))
    cost: Mapped[float | None] = mapped_column(Numeric(10, 2))
    stock: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str] = mapped_column(Text())
    benefits: Mapped[str | None] = mapped_column(Text())
    ingredients: Mapped[str | None] = mapped_column(Text())
    usage: Mapped[str | None] = mapped_column(Text())
    skin_type: Mapped[str | None] = mapped_column(String(255))
    concern: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    images: Mapped[list["ProductImage"]] = relationship(back_populates="product")


class ProductImage(TimestampMixin, Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    image_url: Mapped[str] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    product: Mapped["Product"] = relationship(back_populates="images")

