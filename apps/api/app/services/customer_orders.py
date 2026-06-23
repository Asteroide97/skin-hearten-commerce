from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Customer, Order, OrderItem, Payment
from app.services.admin_orders import (
    _build_customer_name,
    _extract_shipping_payload,
    _normalize_datetime,
    _serialize_payment,
    _to_float,
)
from app.services.mock_store import CUSTOMERS, ORDERS, PAYMENTS


def _normalize_email(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    return normalized or None


def _normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    normalized = "".join(character for character in value if character.isdigit())
    return normalized or None


def _phone_tokens(value: str | None) -> set[str]:
    normalized = _normalize_phone(value)
    if not normalized:
        return set()

    tokens = {normalized}
    if len(normalized) >= 10:
        tokens.add(normalized[-10:])
    return tokens


def _phones_match(first: str | None, second: str | None) -> bool:
    tokens_first = _phone_tokens(first)
    tokens_second = _phone_tokens(second)
    if not tokens_first or not tokens_second:
        return False
    return bool(tokens_first & tokens_second)


def _customer_matches(
    *,
    customer_email: str | None,
    customer_phone: str | None,
    email: str | None,
    phone: str | None,
) -> bool:
    normalized_email = _normalize_email(email)
    normalized_phone = _normalize_phone(phone)

    email_matches = normalized_email is not None and _normalize_email(customer_email) == normalized_email
    phone_matches = normalized_phone is not None and _phones_match(customer_phone, normalized_phone)

    return email_matches or phone_matches


def _serialize_summary(
    *,
    order_id: int,
    order_number: str,
    status: str,
    payment_status: str,
    payment_provider: str,
    total: Any,
    created_at: datetime | None,
    shipped_at: datetime | None,
    delivered_at: datetime | None,
    tracking_number: str | None,
    shipping_carrier: str | None,
) -> dict[str, Any]:
    return {
        "order_id": int(order_id),
        "order_number": order_number,
        "status": status,
        "payment_status": payment_status,
        "payment_provider": payment_provider,
        "total": _to_float(total),
        "created_at": _normalize_datetime(created_at) or datetime.now(timezone.utc),
        "shipped_at": _normalize_datetime(shipped_at),
        "delivered_at": _normalize_datetime(delivered_at),
        "tracking_number": tracking_number,
        "shipping_carrier": shipping_carrier,
    }


def _serialize_detail(
    *,
    order_id: int,
    order_number: str,
    customer_name: str,
    customer_email: str | None,
    customer_phone: str | None,
    shipping_address: dict[str, Any],
    items: list[dict[str, Any]],
    payment_status: str,
    payment_provider: str,
    order_status: str,
    tracking_number: str | None,
    shipping_carrier: str | None,
    created_at: datetime | None,
    updated_at: datetime | None,
    paid_at: datetime | None,
    shipped_at: datetime | None,
    delivered_at: datetime | None,
    cancelled_at: datetime | None,
    refunded_at: datetime | None,
    subtotal: Any,
    discount: Any,
    shipping: Any,
    total: Any,
) -> dict[str, Any]:
    return {
        "order_id": int(order_id),
        "order_number": order_number,
        "customer": {
            "name": customer_name,
            "email": customer_email,
            "phone": customer_phone,
        },
        "shipping_address": shipping_address,
        "items": items,
        "payment_status": payment_status,
        "payment_provider": payment_provider,
        "order_status": order_status,
        "tracking": {
            "tracking_number": tracking_number,
            "shipping_carrier": shipping_carrier,
        },
        "timestamps": {
            "created_at": _normalize_datetime(created_at) or datetime.now(timezone.utc),
            "updated_at": _normalize_datetime(updated_at),
            "paid_at": _normalize_datetime(paid_at),
            "shipped_at": _normalize_datetime(shipped_at),
            "delivered_at": _normalize_datetime(delivered_at),
            "cancelled_at": _normalize_datetime(cancelled_at),
            "refunded_at": _normalize_datetime(refunded_at),
        },
        "subtotal": _to_float(subtotal),
        "discount": _to_float(discount),
        "shipping": _to_float(shipping),
        "total": _to_float(total),
    }


def _build_mock_summary(order: dict[str, Any]) -> dict[str, Any]:
    payment_entry = next((entry for entry in PAYMENTS if entry["order_id"] == order["id"]), None)
    payment = _serialize_payment(payment_entry, provider_fallback=order.get("payment_provider"))
    return _serialize_summary(
        order_id=int(order["id"]),
        order_number=str(order.get("order_number") or f"SH-{order['id']}"),
        status=str(order.get("status") or "pending"),
        payment_status=str(payment.get("status") or "pending"),
        payment_provider=str(payment.get("provider") or order.get("payment_provider") or "mock"),
        total=order.get("grand_total"),
        created_at=order.get("created_at"),
        shipped_at=order.get("shipped_at"),
        delivered_at=order.get("delivered_at"),
        tracking_number=order.get("tracking_number"),
        shipping_carrier=order.get("shipping_carrier"),
    )


def _build_mock_detail(order: dict[str, Any], customer: dict[str, Any] | None) -> dict[str, Any]:
    payment_entry = next((entry for entry in PAYMENTS if entry["order_id"] == order["id"]), None)
    payment = _serialize_payment(payment_entry, provider_fallback=order.get("payment_provider"))
    shipping_address = _extract_shipping_payload(order, payment)
    customer_name = _build_customer_name(
        first_name=customer.get("first_name") if customer else None,
        last_name=customer.get("last_name") if customer else None,
        fallback=order.get("shipping_name"),
    )
    return _serialize_detail(
        order_id=int(order["id"]),
        order_number=str(order.get("order_number") or f"SH-{order['id']}"),
        customer_name=customer_name,
        customer_email=order.get("customer_email") or (customer.get("email") if customer else None),
        customer_phone=order.get("shipping_phone") or (customer.get("phone") if customer else None),
        shipping_address=shipping_address,
        items=[
            {
                "product_id": int(item.get("product_id") or 0),
                "product_name": str(item.get("product_name") or "Producto"),
                "quantity": int(item.get("quantity") or 0),
                "unit_price": _to_float(item.get("unit_price")),
            }
            for item in order.get("items", [])
        ],
        payment_status=str(payment.get("status") or "pending"),
        payment_provider=str(payment.get("provider") or order.get("payment_provider") or "mock"),
        order_status=str(order.get("status") or "pending"),
        tracking_number=order.get("tracking_number"),
        shipping_carrier=order.get("shipping_carrier"),
        created_at=order.get("created_at"),
        updated_at=order.get("updated_at"),
        paid_at=payment.get("paid_at"),
        shipped_at=order.get("shipped_at"),
        delivered_at=order.get("delivered_at"),
        cancelled_at=order.get("cancelled_at"),
        refunded_at=order.get("refunded_at"),
        subtotal=order.get("subtotal"),
        discount=order.get("discount_total"),
        shipping=order.get("shipping_total"),
        total=order.get("grand_total"),
    )


def _mock_order_matches(order: dict[str, Any], customer: dict[str, Any] | None, email: str | None, phone: str | None) -> bool:
    return _customer_matches(
        customer_email=order.get("customer_email") or (customer.get("email") if customer else None),
        customer_phone=order.get("shipping_phone") or (customer.get("phone") if customer else None),
        email=email,
        phone=phone,
    )


def list_customer_order_summaries(
    db: Session,
    *,
    email: str | None,
    phone: str | None,
) -> list[dict[str, Any]]:
    try:
        customers = db.query(Customer).all()
        customer_ids = [
            int(customer.id)
            for customer in customers
            if _customer_matches(
                customer_email=customer.email,
                customer_phone=customer.phone,
                email=email,
                phone=phone,
            )
        ]
        if not customer_ids:
            return []

        orders = (
            db.query(Order)
            .filter(Order.customer_id.in_(customer_ids))
            .order_by(Order.created_at.desc(), Order.id.desc())
            .all()
        )
        if not orders:
            return []

        payments = (
            db.query(Payment)
            .filter(Payment.order_id.in_([order.id for order in orders]))
            .order_by(Payment.created_at.desc(), Payment.id.desc())
            .all()
        )
        payment_by_order_id: dict[int, Payment] = {}
        for payment in payments:
            payment_by_order_id.setdefault(int(payment.order_id), payment)

        return [
            _serialize_summary(
                order_id=int(order.id),
                order_number=order.order_number,
                status=str(order.status),
                payment_status=str(payment_by_order_id[order.id].status) if order.id in payment_by_order_id else "pending",
                payment_provider=str(payment_by_order_id[order.id].provider) if order.id in payment_by_order_id else "mock",
                total=order.grand_total,
                created_at=order.created_at,
                shipped_at=order.shipped_at,
                delivered_at=order.delivered_at,
                tracking_number=order.tracking_number,
                shipping_carrier=order.shipping_carrier,
            )
            for order in orders
        ]
    except SQLAlchemyError:
        db.rollback()

    summaries: list[dict[str, Any]] = []
    for order in sorted(
        ORDERS,
        key=lambda entry: _normalize_datetime(entry.get("created_at")) or datetime.now(timezone.utc),
        reverse=True,
    ):
        customer = next((entry for entry in CUSTOMERS if entry["id"] == order["customer_id"]), None)
        if not _mock_order_matches(order, customer, email, phone):
            continue
        summaries.append(_build_mock_summary(order))
    return summaries


def get_customer_order_detail(
    db: Session,
    *,
    order_id: int,
    email: str | None,
    phone: str | None,
) -> dict[str, Any] | None:
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return None

        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if not customer or not _customer_matches(
            customer_email=customer.email,
            customer_phone=customer.phone,
            email=email,
            phone=phone,
        ):
            return None

        items = (
            db.query(OrderItem)
            .filter(OrderItem.order_id == order.id)
            .order_by(OrderItem.id.asc())
            .all()
        )
        payment = (
            db.query(Payment)
            .filter(Payment.order_id == order.id)
            .order_by(Payment.created_at.desc(), Payment.id.desc())
            .first()
        )
        payment_data = _serialize_payment(payment)

        return _serialize_detail(
            order_id=int(order.id),
            order_number=order.order_number,
            customer_name=_build_customer_name(
                first_name=customer.first_name,
                last_name=customer.last_name,
                fallback=order.shipping_name,
            ),
            customer_email=customer.email,
            customer_phone=customer.phone,
            shipping_address=_extract_shipping_payload({"shipping_address": order.shipping_address}, payment_data),
            items=[
                {
                    "product_id": int(item.product_id),
                    "product_name": item.product_name,
                    "quantity": int(item.quantity),
                    "unit_price": _to_float(item.unit_price),
                }
                for item in items
            ],
            payment_status=str(payment.status) if payment else "pending",
            payment_provider=str(payment.provider) if payment else "mock",
            order_status=str(order.status),
            tracking_number=order.tracking_number,
            shipping_carrier=order.shipping_carrier,
            created_at=order.created_at,
            updated_at=order.updated_at,
            paid_at=payment.paid_at if payment else None,
            shipped_at=order.shipped_at,
            delivered_at=order.delivered_at,
            cancelled_at=order.cancelled_at,
            refunded_at=order.refunded_at,
            subtotal=order.subtotal,
            discount=order.discount_total,
            shipping=order.shipping_total,
            total=order.grand_total,
        )
    except SQLAlchemyError:
        db.rollback()

    order = next((entry for entry in ORDERS if entry["id"] == order_id), None)
    if not order:
        return None

    customer = next((entry for entry in CUSTOMERS if entry["id"] == order["customer_id"]), None)
    if not _mock_order_matches(order, customer, email, phone):
        return None

    return _build_mock_detail(order, customer)
