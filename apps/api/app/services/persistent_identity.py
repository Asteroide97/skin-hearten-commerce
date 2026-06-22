from __future__ import annotations

from typing import Any

from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_password_hash
from app.models import Customer, Role, User
from app.models.enums import RoleName
from app.schemas.auth import RegisterRequest
from app.services.mock_store import create_mock_customer, get_mock_admin_by_email, get_mock_customer_by_email


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _customer_to_dict(customer: Customer) -> dict[str, Any]:
    return {
        "email": customer.email,
        "first_name": customer.first_name,
        "hashed_password": customer.hashed_password,
        "id": customer.id,
        "last_name": customer.last_name,
        "phone": customer.phone,
    }


def _user_to_dict(user: User) -> dict[str, Any]:
    return {
        "email": user.email,
        "first_name": user.first_name,
        "hashed_password": user.hashed_password,
        "id": user.id,
        "last_name": user.last_name,
        "role": user.role.name if user.role else None,
    }


def get_customer_identity_by_email(db: Session, email: str) -> dict[str, Any] | None:
    normalized_email = _normalize_email(email)
    try:
        customer = (
            db.query(Customer)
            .filter(func.lower(Customer.email) == normalized_email)
            .first()
        )
        if customer:
            return _customer_to_dict(customer)
    except SQLAlchemyError:
        db.rollback()

    return get_mock_customer_by_email(email)


def get_admin_identity_by_email(db: Session, email: str) -> dict[str, Any] | None:
    normalized_email = _normalize_email(email)
    try:
        user = (
            db.query(User)
            .options(selectinload(User.role))
            .filter(func.lower(User.email) == normalized_email)
            .first()
        )
        if user and user.role and user.role.name == RoleName.SUPERADMIN.value:
            return _user_to_dict(user)
    except SQLAlchemyError:
        db.rollback()

    return get_mock_admin_by_email(email)


def create_customer_identity(db: Session, payload: RegisterRequest) -> dict[str, Any]:
    try:
        existing = (
            db.query(Customer)
            .filter(func.lower(Customer.email) == _normalize_email(payload.email))
            .first()
        )
        if existing:
            return _customer_to_dict(existing)

        customer = Customer(
            email=_normalize_email(payload.email),
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone=payload.phone,
            hashed_password=get_password_hash(payload.password),
            is_active=True,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return _customer_to_dict(customer)
    except SQLAlchemyError:
        db.rollback()

    return create_mock_customer(
        {
            "email": payload.email,
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "phone": payload.phone,
            "hashed_password": get_password_hash(payload.password),
        }
    )


def get_identity_by_scope(db: Session, scope: str, email: str) -> dict[str, Any] | None:
    if scope == "customer":
        return get_customer_identity_by_email(db, email)
    if scope == "admin":
        return get_admin_identity_by_email(db, email)
    return None
