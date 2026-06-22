from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import CRMContact, Customer, Order, OrderItem, Payment
from app.models.enums import OrderStatus, PaymentStatus
from app.schemas.order import AdminOrderUpdate
from app.services.crm import record_crm_event
from app.services.crm_reminders import create_post_shipping_followup_reminder
from app.services.mock_store import (
    CUSTOMERS,
    ORDERS,
    PAYMENTS,
    find_crm_contact as find_mock_crm_contact,
    update_order as update_mock_order,
)


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _build_date_range(
    date_from: date | None,
    date_to: date | None,
) -> tuple[datetime | None, datetime | None]:
    start = datetime.combine(date_from, time.min, tzinfo=timezone.utc) if date_from else None
    end = datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=timezone.utc) if date_to else None
    return start, end


def _to_float(value: Any) -> float:
    return round(float(value or 0), 2)


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _build_customer_name(
    *,
    first_name: str | None = None,
    last_name: str | None = None,
    fallback: str | None = None,
) -> str:
    name = " ".join(part for part in [first_name or "", last_name or ""] if part).strip()
    if name:
        return name
    return fallback or "Cliente"


def _extract_shipping_payload(
    order_data: dict[str, Any],
    payment_data: dict[str, Any] | None,
) -> dict[str, Any]:
    payload = order_data.get("shipping_address_data")
    if not isinstance(payload, dict):
        raw_payload = payment_data.get("raw_payload_json") if payment_data else None
        payload = raw_payload.get("shipping_address") if isinstance(raw_payload, dict) else None

    payload = payload if isinstance(payload, dict) else {}
    line1 = payload.get("line1")
    line2 = payload.get("line2")
    city = payload.get("city")
    state = payload.get("state")
    postal_code = payload.get("postal_code") or payload.get("postalCode")
    country = payload.get("country")

    full_address = order_data.get("shipping_address") or ", ".join(
        [
            part
            for part in [line1, line2, city, state, postal_code, country]
            if part
        ]
    )

    return {
        "line1": line1,
        "line2": line2,
        "city": city,
        "state": state,
        "postal_code": postal_code,
        "country": country,
        "full_address": full_address or "Sin direccion registrada",
    }


def _serialize_payment(payment: dict[str, Any] | Payment | None, *, provider_fallback: str | None = None) -> dict[str, Any]:
    if isinstance(payment, Payment):
        return {
            "id": payment.id,
            "provider": str(payment.provider),
            "provider_reference": payment.provider_reference,
            "status": str(payment.status),
            "amount": _to_float(payment.amount),
            "raw_payload_json": payment.raw_payload_json if isinstance(payment.raw_payload_json, dict) else {},
            "paid_at": _normalize_datetime(payment.paid_at),
            "failed_at": _normalize_datetime(payment.failed_at),
            "created_at": _normalize_datetime(payment.created_at),
            "updated_at": _normalize_datetime(payment.updated_at),
        }

    payment_data = payment or {}
    return {
        "id": int(payment_data.get("id") or 0),
        "provider": str(payment_data.get("provider") or provider_fallback or "mock"),
        "provider_reference": payment_data.get("provider_reference"),
        "status": str(payment_data.get("status") or "pending"),
        "amount": _to_float(payment_data.get("amount")),
        "raw_payload_json": payment_data.get("raw_payload_json") if isinstance(payment_data.get("raw_payload_json"), dict) else {},
        "paid_at": _normalize_datetime(payment_data.get("paid_at")),
        "failed_at": _normalize_datetime(payment_data.get("failed_at")),
        "created_at": _normalize_datetime(payment_data.get("created_at")),
        "updated_at": _normalize_datetime(payment_data.get("updated_at")),
    }


def _serialize_crm_contact(contact: CRMContact | dict[str, Any] | None) -> dict[str, Any] | None:
    if isinstance(contact, CRMContact):
        return {
            "id": int(contact.id),
            "name": _build_customer_name(first_name=contact.first_name, last_name=contact.last_name, fallback="Contacto"),
            "email": contact.email,
            "whatsapp": contact.whatsapp,
            "lifecycle_status": str(contact.lifecycle_status),
        }

    if isinstance(contact, dict):
        return {
            "id": int(contact["id"]),
            "name": _build_customer_name(
                first_name=contact.get("first_name"),
                last_name=contact.get("last_name"),
                fallback="Contacto",
            ),
            "email": contact.get("email"),
            "whatsapp": contact.get("whatsapp"),
            "lifecycle_status": str(contact.get("lifecycle_status") or "lead"),
        }

    return None


def _matches_search(summary: dict[str, Any], payment: dict[str, Any], search: str | None) -> bool:
    if not search:
        return True

    normalized_search = search.strip().lower()
    if not normalized_search:
        return True

    haystack = " ".join(
        [
            str(summary.get("order_number") or ""),
            str(summary.get("customer_name") or ""),
            str(summary.get("customer_email") or ""),
            str(summary.get("customer_phone") or ""),
            str(payment.get("provider_reference") or ""),
        ]
    ).lower()
    return normalized_search in haystack


def _find_db_crm_contact(
    db: Session,
    *,
    email: str | None,
    phone: str | None,
) -> CRMContact | None:
    contacts = db.query(CRMContact).all()
    normalized_email = email.strip().lower() if email else None
    normalized_phone = "".join(character for character in phone if character.isdigit()) if phone else None

    for contact in contacts:
        if normalized_email and contact.email and contact.email.strip().lower() == normalized_email:
            return contact
        if normalized_phone and contact.whatsapp:
            contact_phone = "".join(character for character in contact.whatsapp if character.isdigit())
            if contact_phone == normalized_phone:
                return contact

    return None


def _serialize_mock_order_summary(order: dict[str, Any]) -> dict[str, Any]:
    customer = next((entry for entry in CUSTOMERS if entry["id"] == order["customer_id"]), None)
    payment_entry = next((entry for entry in PAYMENTS if entry["order_id"] == order["id"]), None)
    payment = _serialize_payment(payment_entry, provider_fallback=order.get("payment_provider"))
    customer_name = _build_customer_name(
        first_name=customer.get("first_name") if customer else None,
        last_name=customer.get("last_name") if customer else None,
        fallback=order.get("shipping_name"),
    )
    return {
        "id": int(order["id"]),
        "order_number": str(order.get("order_number") or f"SH-{order['id']}"),
        "customer_name": customer_name,
        "customer_email": order.get("customer_email") or (customer.get("email") if customer else None),
        "customer_phone": order.get("shipping_phone") or (customer.get("phone") if customer else None),
        "status": str(order.get("status") or "pending"),
        "payment_status": str(payment.get("status") or order.get("payment_status") or "pending"),
        "payment_provider": str(payment.get("provider") or order.get("payment_provider") or "mock"),
        "total": _to_float(order.get("grand_total")),
        "created_at": _normalize_datetime(order.get("created_at")) or datetime.now(timezone.utc),
        "paid_at": _normalize_datetime(payment.get("paid_at")),
        "_payment": payment,
        "_customer": customer,
        "_order": order,
    }


def _serialize_mock_order_detail(order: dict[str, Any]) -> dict[str, Any]:
    summary = _serialize_mock_order_summary(order)
    customer = summary["_customer"]
    payment = summary["_payment"]
    crm_contact = find_mock_crm_contact(
        email=summary.get("customer_email"),
        whatsapp=summary.get("customer_phone"),
    )

    return {
        "id": summary["id"],
        "order_number": summary["order_number"],
        "status": summary["status"],
        "payment_status": summary["payment_status"],
        "payment_provider": summary["payment_provider"],
        "subtotal": _to_float(order.get("subtotal")),
        "discount_total": _to_float(order.get("discount_total")),
        "shipping_total": _to_float(order.get("shipping_total")),
        "total": _to_float(order.get("grand_total")),
        "tracking_number": order.get("tracking_number"),
        "shipping_carrier": order.get("shipping_carrier"),
        "internal_notes": order.get("internal_notes"),
        "customer": {
            "id": int(customer["id"]) if customer else int(order.get("customer_id") or 0),
            "name": summary["customer_name"],
            "email": summary["customer_email"],
            "phone": summary["customer_phone"],
        },
        "shipping_address": _extract_shipping_payload(order, payment),
        "items": [
            {
                "product_id": int(item.get("product_id") or 0),
                "product_name": str(item.get("product_name") or "Producto"),
                "quantity": int(item.get("quantity") or 0),
                "unit_price": _to_float(item.get("unit_price")),
            }
            for item in order.get("items", [])
        ],
        "payment": payment,
        "raw_provider_reference": payment.get("provider_reference"),
        "timestamps": {
            "created_at": summary["created_at"],
            "updated_at": _normalize_datetime(order.get("updated_at")) or summary["created_at"],
            "paid_at": _normalize_datetime(payment.get("paid_at")),
            "shipped_at": _normalize_datetime(order.get("shipped_at")),
            "delivered_at": _normalize_datetime(order.get("delivered_at")),
            "cancelled_at": _normalize_datetime(order.get("cancelled_at")),
            "refunded_at": _normalize_datetime(order.get("refunded_at")),
        },
        "crm_contact": _serialize_crm_contact(crm_contact),
    }


def _serialize_db_order_detail(
    *,
    order: Order,
    customer: Customer | None,
    items: list[OrderItem],
    payment: Payment | None,
    crm_contact: CRMContact | None,
) -> dict[str, Any]:
    customer_email = customer.email if customer else None
    customer_phone = customer.phone if customer else None
    customer_name = _build_customer_name(
        first_name=customer.first_name if customer else None,
        last_name=customer.last_name if customer else None,
        fallback=order.shipping_name,
    )
    payment_data = _serialize_payment(payment)
    order_data = {
        "shipping_address": order.shipping_address,
    }

    return {
        "id": int(order.id),
        "order_number": order.order_number,
        "status": str(order.status),
        "payment_status": str(payment.status) if payment else "pending",
        "payment_provider": str(payment.provider) if payment else "mock",
        "subtotal": _to_float(order.subtotal),
        "discount_total": _to_float(order.discount_total),
        "shipping_total": _to_float(order.shipping_total),
        "total": _to_float(order.grand_total),
        "tracking_number": order.tracking_number,
        "shipping_carrier": order.shipping_carrier,
        "internal_notes": order.internal_notes,
        "customer": {
            "id": int(customer.id) if customer else int(order.customer_id),
            "name": customer_name,
            "email": customer_email,
            "phone": customer_phone,
        },
        "shipping_address": _extract_shipping_payload(order_data, payment_data),
        "items": [
            {
                "product_id": int(item.product_id),
                "product_name": item.product_name,
                "quantity": int(item.quantity),
                "unit_price": _to_float(item.unit_price),
            }
            for item in items
        ],
        "payment": payment_data,
        "raw_provider_reference": payment.provider_reference if payment else None,
        "timestamps": {
            "created_at": _normalize_datetime(order.created_at) or datetime.now(timezone.utc),
            "updated_at": _normalize_datetime(order.updated_at),
            "paid_at": _normalize_datetime(payment.paid_at) if payment else None,
            "shipped_at": _normalize_datetime(order.shipped_at),
            "delivered_at": _normalize_datetime(order.delivered_at),
            "cancelled_at": _normalize_datetime(order.cancelled_at),
            "refunded_at": _normalize_datetime(order.refunded_at),
        },
        "crm_contact": _serialize_crm_contact(crm_contact),
    }


def list_admin_order_summaries(
    db: Session,
    *,
    search: str | None = None,
    order_status: str | None = None,
    payment_status: str | None = None,
    payment_provider: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[dict[str, Any]]:
    start, end = _build_date_range(date_from, date_to)

    try:
        query = db.query(Order).order_by(Order.created_at.desc())
        if start:
            query = query.filter(Order.created_at >= start)
        if end:
            query = query.filter(Order.created_at < end)

        orders = query.all()
        order_ids = [order.id for order in orders]
        customer_ids = [order.customer_id for order in orders]
        payments = (
            db.query(Payment).filter(Payment.order_id.in_(order_ids)).all()
            if order_ids
            else []
        )
        customers = (
            db.query(Customer).filter(Customer.id.in_(customer_ids)).all()
            if customer_ids
            else []
        )
        payment_by_order_id = {payment.order_id: payment for payment in payments}
        customer_by_id = {customer.id: customer for customer in customers}

        results: list[dict[str, Any]] = []
        for order in orders:
            customer = customer_by_id.get(order.customer_id)
            payment = payment_by_order_id.get(order.id)
            summary = {
                "id": int(order.id),
                "order_number": order.order_number,
                "customer_name": _build_customer_name(
                    first_name=customer.first_name if customer else None,
                    last_name=customer.last_name if customer else None,
                    fallback=order.shipping_name,
                ),
                "customer_email": customer.email if customer else None,
                "customer_phone": customer.phone if customer else None,
                "status": str(order.status),
                "payment_status": str(payment.status) if payment else "pending",
                "payment_provider": str(payment.provider) if payment else "mock",
                "total": _to_float(order.grand_total),
                "created_at": _normalize_datetime(order.created_at) or datetime.now(timezone.utc),
                "paid_at": _normalize_datetime(payment.paid_at) if payment else None,
            }
            payment_payload = _serialize_payment(payment)

            if order_status and summary["status"] != order_status:
                continue
            if payment_status and summary["payment_status"] != payment_status:
                continue
            if payment_provider and summary["payment_provider"] != payment_provider:
                continue
            if not _matches_search(summary, payment_payload, search):
                continue

            results.append(summary)

        return results
    except SQLAlchemyError:
        db.rollback()

    results: list[dict[str, Any]] = []
    for order in sorted(
        ORDERS,
        key=lambda entry: _normalize_datetime(entry.get("created_at")) or datetime.now(timezone.utc),
        reverse=True,
    ):
        summary = _serialize_mock_order_summary(order)
        created_at = summary["created_at"]
        if start and created_at < start:
            continue
        if end and created_at >= end:
            continue
        if order_status and summary["status"] != order_status:
            continue
        if payment_status and summary["payment_status"] != payment_status:
            continue
        if payment_provider and summary["payment_provider"] != payment_provider:
            continue
        if not _matches_search(summary, summary["_payment"], search):
            continue

        results.append(
            {
                "id": summary["id"],
                "order_number": summary["order_number"],
                "customer_name": summary["customer_name"],
                "customer_email": summary["customer_email"],
                "customer_phone": summary["customer_phone"],
                "status": summary["status"],
                "payment_status": summary["payment_status"],
                "payment_provider": summary["payment_provider"],
                "total": summary["total"],
                "created_at": summary["created_at"],
                "paid_at": summary["paid_at"],
            }
        )

    return results


def get_admin_order_detail(db: Session, order_id: int) -> dict[str, Any] | None:
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return None

        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).order_by(OrderItem.id.asc()).all()
        payment = (
            db.query(Payment)
            .filter(Payment.order_id == order.id)
            .order_by(Payment.created_at.desc(), Payment.id.desc())
            .first()
        )
        crm_contact = _find_db_crm_contact(
            db,
            email=customer.email if customer else None,
            phone=customer.phone if customer else None,
        )
        return _serialize_db_order_detail(
            order=order,
            customer=customer,
            items=items,
            payment=payment,
            crm_contact=crm_contact,
        )
    except SQLAlchemyError:
        db.rollback()

    order = next((entry for entry in ORDERS if entry["id"] == order_id), None)
    if not order:
        return None
    return _serialize_mock_order_detail(order)


def _build_status_event_payload(
    *,
    order_detail: dict[str, Any],
    previous_status: str,
    next_status: str,
) -> dict[str, Any]:
    payment = order_detail["payment"]
    return {
        "order_id": order_detail["id"],
        "order_number": order_detail["order_number"],
        "previous_status": previous_status,
        "next_status": next_status,
        "payment_status": payment["status"],
        "payment_provider": payment["provider"],
        "tracking_number": order_detail.get("tracking_number"),
        "shipping_carrier": order_detail.get("shipping_carrier"),
        "total": order_detail["total"],
    }


def _maybe_create_shipping_followup(
    db: Session,
    *,
    order_detail: dict[str, Any],
    event_id: int | None,
) -> None:
    crm_contact = order_detail.get("crm_contact")
    if not crm_contact:
        return

    accepted_marketing = False
    source_contact: dict[str, Any] | None = None

    try:
        contact_model = db.query(CRMContact).filter(CRMContact.id == crm_contact["id"]).first()
        if contact_model:
            accepted_marketing = bool(contact_model.accepted_marketing)
            source_contact = {
                "id": int(contact_model.id),
                "first_name": contact_model.first_name,
                "last_name": contact_model.last_name,
                "email": contact_model.email,
                "whatsapp": contact_model.whatsapp,
                "main_goal": contact_model.main_goal,
                "skin_type": contact_model.skin_type,
                "accepted_marketing": bool(contact_model.accepted_marketing),
            }
    except SQLAlchemyError:
        db.rollback()

    if source_contact is None:
        fallback_contact = find_mock_crm_contact(
            email=order_detail["customer"].get("email"),
            whatsapp=order_detail["customer"].get("phone"),
        )
        if fallback_contact:
            accepted_marketing = bool(fallback_contact.get("accepted_marketing"))
            source_contact = fallback_contact

    if not source_contact or not accepted_marketing:
        return

    shipped_at = order_detail["timestamps"].get("shipped_at") or datetime.now(timezone.utc)
    order_payload = {
        "id": order_detail["id"],
        "order_number": order_detail["order_number"],
        "created_at": order_detail["timestamps"].get("created_at"),
        "updated_at": order_detail["timestamps"].get("updated_at"),
        "shipped_at": shipped_at,
    }
    create_post_shipping_followup_reminder(
        db,
        source_contact,
        order_payload,
        hours=72,
        related_event_id=event_id,
    )


def update_admin_order(
    db: Session,
    order_id: int,
    payload: AdminOrderUpdate,
) -> dict[str, Any] | None:
    existing = get_admin_order_detail(db, order_id)
    if not existing:
        return None

    previous_status = existing["status"]
    next_status = payload.status or previous_status
    payment_status = existing["payment"]["status"]
    if next_status == "paid" and payment_status != str(PaymentStatus.PAID) and not payload.explicit_manual_override:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes marcar la orden como pagada mientras el pago no este confirmado.",
        )

    now = datetime.now(timezone.utc)
    normalized_tracking = _normalize_text(payload.tracking_number) if "tracking_number" in payload.model_fields_set else existing.get("tracking_number")
    normalized_carrier = _normalize_text(payload.shipping_carrier) if "shipping_carrier" in payload.model_fields_set else existing.get("shipping_carrier")
    normalized_notes = _normalize_text(payload.internal_notes) if "internal_notes" in payload.model_fields_set else existing.get("internal_notes")

    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return None

        if "tracking_number" in payload.model_fields_set:
            order.tracking_number = normalized_tracking
        if "shipping_carrier" in payload.model_fields_set:
            order.shipping_carrier = normalized_carrier
        if "internal_notes" in payload.model_fields_set:
            order.internal_notes = normalized_notes
        if payload.status and payload.status != previous_status:
            order.status = OrderStatus(payload.status)
            if payload.status == "shipped" and order.shipped_at is None:
                order.shipped_at = now
            if payload.status == "delivered" and order.delivered_at is None:
                order.delivered_at = now
            if payload.status == "canceled" and order.cancelled_at is None:
                order.cancelled_at = now
            if payload.status == "refunded" and order.refunded_at is None:
                order.refunded_at = now

        db.add(order)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        update_payload: dict[str, Any] = {
            "updated_at": now,
        }
        if "tracking_number" in payload.model_fields_set:
            update_payload["tracking_number"] = normalized_tracking
        if "shipping_carrier" in payload.model_fields_set:
            update_payload["shipping_carrier"] = normalized_carrier
        if "internal_notes" in payload.model_fields_set:
            update_payload["internal_notes"] = normalized_notes
        if payload.status and payload.status != previous_status:
            update_payload["status"] = payload.status
            if payload.status == "shipped" and existing["timestamps"].get("shipped_at") is None:
                update_payload["shipped_at"] = now
            if payload.status == "delivered" and existing["timestamps"].get("delivered_at") is None:
                update_payload["delivered_at"] = now
            if payload.status == "canceled" and existing["timestamps"].get("cancelled_at") is None:
                update_payload["cancelled_at"] = now
            if payload.status == "refunded" and existing["timestamps"].get("refunded_at") is None:
                update_payload["refunded_at"] = now

        updated_order = update_mock_order(order_id, update_payload)
        if not updated_order:
            return None

    updated = get_admin_order_detail(db, order_id)
    if not updated:
        return None

    if next_status != previous_status:
        crm_contact = updated.get("crm_contact")
        event = record_crm_event(
            db,
            contact_id=crm_contact["id"] if crm_contact else None,
            event_type="order_status_updated",
            payload_json=_build_status_event_payload(
                order_detail=updated,
                previous_status=previous_status,
                next_status=next_status,
            ),
            source="admin_orders",
        )
        if next_status == "shipped":
            try:
                _maybe_create_shipping_followup(
                    db,
                    order_detail=updated,
                    event_id=event.get("id") if event else None,
                )
            except Exception:
                db.rollback()

    return get_admin_order_detail(db, order_id)
