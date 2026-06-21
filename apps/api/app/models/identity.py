from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin


class Role(TimestampMixin, Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text())

    users: Mapped[list["User"]] = relationship(back_populates="role")


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(120))
    last_name: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))

    role: Mapped["Role"] = relationship(back_populates="users")


class Customer(TimestampMixin, Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(120))
    last_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(30))
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    addresses: Mapped[list["CustomerAddress"]] = relationship(back_populates="customer")


class CustomerAddress(TimestampMixin, Base):
    __tablename__ = "customer_addresses"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    label: Mapped[str] = mapped_column(String(80))
    address_line1: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(120))
    state: Mapped[str] = mapped_column(String(120))
    postal_code: Mapped[str] = mapped_column(String(20))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    customer: Mapped["Customer"] = relationship(back_populates="addresses")

