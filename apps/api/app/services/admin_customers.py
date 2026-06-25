from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import and_, func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import CRMContact, CRMNote, Customer, CustomerAddress, Order, Payment
from app.models.enums import CRMTaskStatus
from app.services.mock_store import CRM_CONTACTS, CRM_NOTES, CUSTOMERS, CUSTOMER_ADDRESSES, ORDERS, PAYMENTS


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


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _build_customer_name(
    *,
    email: str | None,
    fallback: str,
    first_name: str | None,
    last_name: str | None,
) -> str:
    parts = [part.strip() for part in [first_name or "", last_name or ""] if part and part.strip()]
    if parts:
        return " ".join(parts)
    if email:
        return email
    return fallback


def _pick_matching_contact(
    *,
    contacts_by_email: dict[str, dict[str, Any]],
    contacts_by_phone: dict[str, dict[str, Any]],
    email: str | None,
    phone: str | None,
) -> dict[str, Any] | None:
    normalized_email = _normalize_email(email)
    if normalized_email and normalized_email in contacts_by_email:
        return contacts_by_email[normalized_email]

    normalized_phone = _normalize_phone(phone)
    if normalized_phone and normalized_phone in contacts_by_phone:
        return contacts_by_phone[normalized_phone]

    return None


def _serialize_tags(contact: dict[str, Any] | None) -> list[str]:
    if not contact:
        return []

    tags = [
        str(contact.get("lifecycle_status") or "").strip(),
        str(contact.get("skin_type") or "").strip(),
        str(contact.get("main_goal") or "").strip(),
        str(contact.get("source") or "").strip(),
    ]
    return [tag for tag in tags if tag]


def _build_paginated_payload(*, items: list[dict[str, Any]], page: int, page_size: int, total: int) -> dict[str, Any]:
    total_pages = max(1, math.ceil(total / page_size)) if page_size > 0 else 1
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }


def _contact_filters_requested(
    *,
    accepted_marketing: bool | None,
    lifecycle_status: str | None,
    main_goal: str | None,
    skin_type: str | None,
) -> bool:
    return any(
        value is not None
        for value in [accepted_marketing, lifecycle_status, main_goal, skin_type]
    )


def _customer_summary_from_sources(
    *,
    customer: dict[str, Any],
    contact: dict[str, Any] | None,
    last_purchase_at: datetime | None,
    orders_count: int,
    total_spent: float,
) -> dict[str, Any]:
    return {
        "id": int(customer["id"]),
        "name": _build_customer_name(
            email=customer.get("email"),
            fallback=f"Cliente #{customer['id']}",
            first_name=customer.get("first_name"),
            last_name=customer.get("last_name"),
        ),
        "first_name": customer.get("first_name") or "Cliente",
        "last_name": customer.get("last_name"),
        "email": customer.get("email"),
        "whatsapp": customer.get("phone"),
        "orders_count": int(orders_count),
        "total_spent": round(float(total_spent), 2),
        "last_purchase_at": _normalize_datetime(last_purchase_at),
        "accepted_marketing": contact.get("accepted_marketing") if contact else None,
        "lifecycle_status": contact.get("lifecycle_status") if contact else None,
        "main_goal": contact.get("main_goal") if contact else None,
        "skin_type": contact.get("skin_type") if contact else None,
        "source": contact.get("source") if contact else None,
        "has_orders": int(orders_count) > 0,
        "created_at": _normalize_datetime(customer.get("created_at")),
        "updated_at": _normalize_datetime(customer.get("updated_at")),
    }


def _build_contact_filters_for_customer_query(
    *,
    accepted_marketing: bool | None,
    lifecycle_status: str | None,
    main_goal: str | None,
    skin_type: str | None,
) -> list[Any]:
    filters: list[Any] = []
    if accepted_marketing is not None:
        filters.append(CRMContact.accepted_marketing == accepted_marketing)
    if lifecycle_status:
        filters.append(CRMContact.lifecycle_status == lifecycle_status)
    if main_goal:
        filters.append(CRMContact.main_goal == main_goal)
    if skin_type:
        filters.append(CRMContact.skin_type == skin_type)
    return filters

def _list_mock_admin_customers(
    *,
    accepted_marketing: bool | None,
    has_orders: bool | None,
    lifecycle_status: str | None,
    main_goal: str | None,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_dir: str,
    skin_type: str | None,
) -> dict[str, Any]:
    normalized_search = search.strip().lower() if search else None
    contacts_by_email: dict[str, dict[str, Any]] = {}
    contacts_by_phone: dict[str, dict[str, Any]] = {}

    for contact in CRM_CONTACTS:
        normalized_email = _normalize_email(contact.get("email"))
        normalized_phone = _normalize_phone(contact.get("whatsapp"))
        if normalized_email and normalized_email not in contacts_by_email:
            contacts_by_email[normalized_email] = contact
        if normalized_phone and normalized_phone not in contacts_by_phone:
            contacts_by_phone[normalized_phone] = contact

    order_stats_by_customer_id: dict[int, dict[str, Any]] = {}
    for order in ORDERS:
        customer_id = int(order.get("customer_id") or 0)
        if customer_id <= 0:
            continue
        stats = order_stats_by_customer_id.setdefault(
            customer_id,
            {
                "orders_count": 0,
                "total_spent": 0.0,
                "last_purchase_at": None,
            },
        )
        stats["orders_count"] += 1
        stats["total_spent"] += float(order.get("grand_total") or 0)
        created_at = _normalize_datetime(order.get("created_at"))
        if created_at and (stats["last_purchase_at"] is None or created_at > stats["last_purchase_at"]):
            stats["last_purchase_at"] = created_at

    filtered: list[dict[str, Any]] = []
    for customer in CUSTOMERS:
        contact = _pick_matching_contact(
            contacts_by_email=contacts_by_email,
            contacts_by_phone=contacts_by_phone,
            email=customer.get("email"),
            phone=customer.get("phone"),
        )
        stats = order_stats_by_customer_id.get(int(customer["id"]), {})
        summary = _customer_summary_from_sources(
            customer=customer,
            contact=contact,
            last_purchase_at=stats.get("last_purchase_at"),
            orders_count=int(stats.get("orders_count") or 0),
            total_spent=float(stats.get("total_spent") or 0),
        )

        if accepted_marketing is not None and summary.get("accepted_marketing") != accepted_marketing:
            continue
        if lifecycle_status and summary.get("lifecycle_status") != lifecycle_status:
            continue
        if main_goal and summary.get("main_goal") != main_goal:
            continue
        if skin_type and summary.get("skin_type") != skin_type:
            continue
        if has_orders is True and not summary["has_orders"]:
            continue
        if has_orders is False and summary["has_orders"]:
            continue
        if normalized_search:
            haystack = " ".join(
                [
                    summary["name"],
                    str(summary.get("email") or ""),
                    str(summary.get("whatsapp") or ""),
                ]
            ).lower()
            if normalized_search not in haystack:
                continue

        filtered.append(summary)

    reverse = sort_dir == "desc"
    if sort_by == "totalSpent":
        filtered.sort(key=lambda item: float(item.get("total_spent") or 0), reverse=reverse)
    elif sort_by == "ordersCount":
        filtered.sort(key=lambda item: int(item.get("orders_count") or 0), reverse=reverse)
    elif sort_by == "lastPurchaseAt":
        filtered.sort(
            key=lambda item: item.get("last_purchase_at") or datetime.min.replace(tzinfo=timezone.utc),
            reverse=reverse,
        )
    elif sort_by == "email":
        filtered.sort(key=lambda item: str(item.get("email") or "").lower(), reverse=reverse)
    else:
        filtered.sort(key=lambda item: str(item.get("name") or "").lower(), reverse=reverse)

    total = len(filtered)
    start = (page - 1) * page_size
    return _build_paginated_payload(items=filtered[start : start + page_size], page=page, page_size=page_size, total=total)


def list_admin_customer_summaries(
    db: Session,
    *,
    accepted_marketing: bool | None = None,
    has_orders: bool | None = None,
    lifecycle_status: str | None = None,
    main_goal: str | None = None,
    page: int = 1,
    page_size: int = 25,
    search: str | None = None,
    sort_by: str = "lastPurchaseAt",
    sort_dir: str = "desc",
    skin_type: str | None = None,
) -> dict[str, Any]:
    try:
        orders_aggregate = (
            db.query(
                Order.customer_id.label("customer_id"),
                func.count(Order.id).label("orders_count"),
                func.coalesce(func.sum(Order.grand_total), 0).label("total_spent"),
                func.max(Order.created_at).label("last_purchase_at"),
            )
            .group_by(Order.customer_id)
            .subquery()
        )

        query = (
            db.query(
                Customer,
                orders_aggregate.c.orders_count,
                orders_aggregate.c.total_spent,
                orders_aggregate.c.last_purchase_at,
            )
            .outerjoin(orders_aggregate, orders_aggregate.c.customer_id == Customer.id)
        )

        normalized_search = search.strip().lower() if search else None
        if normalized_search:
            like_value = f"%{normalized_search}%"
            query = query.filter(
                or_(
                    func.lower(Customer.first_name).like(like_value),
                    func.lower(Customer.last_name).like(like_value),
                    func.lower(Customer.email).like(like_value),
                    func.lower(func.coalesce(Customer.phone, "")).like(like_value),
                )
            )

        if has_orders is True:
            query = query.filter(func.coalesce(orders_aggregate.c.orders_count, 0) > 0)
        elif has_orders is False:
            query = query.filter(func.coalesce(orders_aggregate.c.orders_count, 0) == 0)

        if _contact_filters_requested(
            accepted_marketing=accepted_marketing,
            lifecycle_status=lifecycle_status,
            main_goal=main_goal,
            skin_type=skin_type,
        ):
            contact_filters = _build_contact_filters_for_customer_query(
                accepted_marketing=accepted_marketing,
                lifecycle_status=lifecycle_status,
                main_goal=main_goal,
                skin_type=skin_type,
            )
            contact_exists = (
                db.query(CRMContact.id)
                .filter(
                    or_(
                        and_(
                            CRMContact.email.is_not(None),
                            Customer.email.is_not(None),
                            func.lower(CRMContact.email) == func.lower(Customer.email),
                        ),
                        and_(
                            CRMContact.whatsapp.is_not(None),
                            Customer.phone.is_not(None),
                            CRMContact.whatsapp == Customer.phone,
                        ),
                    )
                )
                .filter(*contact_filters)
                .exists()
            )
            query = query.filter(contact_exists)

        total = query.order_by(None).count()

        sort_key = sort_by or "lastPurchaseAt"
        direction = sort_dir if sort_dir in {"asc", "desc"} else "desc"

        if sort_key == "totalSpent":
            sort_expression = func.coalesce(orders_aggregate.c.total_spent, 0)
            query = query.order_by(sort_expression.asc() if direction == "asc" else sort_expression.desc())
        elif sort_key == "ordersCount":
            sort_expression = func.coalesce(orders_aggregate.c.orders_count, 0)
            query = query.order_by(sort_expression.asc() if direction == "asc" else sort_expression.desc())
        elif sort_key == "email":
            sort_expression = func.lower(Customer.email)
            query = query.order_by(sort_expression.asc() if direction == "asc" else sort_expression.desc())
        elif sort_key == "createdAt":
            query = query.order_by(Customer.created_at.asc() if direction == "asc" else Customer.created_at.desc())
        elif sort_key == "customer":
            primary = func.lower(Customer.first_name)
            secondary = func.lower(Customer.last_name)
            if direction == "asc":
                query = query.order_by(primary.asc(), secondary.asc())
            else:
                query = query.order_by(primary.desc(), secondary.desc())
        else:
            last_purchase_sort = orders_aggregate.c.last_purchase_at
            if direction == "asc":
                query = query.order_by(last_purchase_sort.asc().nullsfirst(), Customer.created_at.asc())
            else:
                query = query.order_by(last_purchase_sort.desc().nullslast(), Customer.created_at.desc())

        rows = query.offset((page - 1) * page_size).limit(page_size).all()
        customer_records = [row[0] for row in rows]

        normalized_emails = sorted(
            {
                normalized
                for normalized in (_normalize_email(customer.email) for customer in customer_records)
                if normalized
            }
        )
        raw_phones = sorted({customer.phone for customer in customer_records if customer.phone})

        contacts: list[CRMContact] = []
        if normalized_emails or raw_phones:
            contact_filters = []
            if normalized_emails:
                contact_filters.append(func.lower(CRMContact.email).in_(normalized_emails))
            if raw_phones:
                contact_filters.append(CRMContact.whatsapp.in_(raw_phones))
            contacts = db.query(CRMContact).filter(or_(*contact_filters)).all()

        contacts.sort(
            key=lambda contact: _normalize_datetime(contact.last_seen_at) or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )

        contacts_by_email: dict[str, dict[str, Any]] = {}
        contacts_by_phone: dict[str, dict[str, Any]] = {}
        for contact in contacts:
            serialized_contact = {
                "id": contact.id,
                "email": contact.email,
                "whatsapp": contact.whatsapp,
                "accepted_marketing": bool(contact.accepted_marketing),
                "lifecycle_status": str(contact.lifecycle_status),
                "main_goal": contact.main_goal,
                "skin_type": contact.skin_type,
                "source": contact.source,
            }
            normalized_email = _normalize_email(contact.email)
            normalized_phone = _normalize_phone(contact.whatsapp)
            if normalized_email and normalized_email not in contacts_by_email:
                contacts_by_email[normalized_email] = serialized_contact
            if normalized_phone and normalized_phone not in contacts_by_phone:
                contacts_by_phone[normalized_phone] = serialized_contact

        items = [
            _customer_summary_from_sources(
                customer={
                    "id": customer.id,
                    "first_name": customer.first_name,
                    "last_name": customer.last_name,
                    "email": customer.email,
                    "phone": customer.phone,
                    "created_at": customer.created_at,
                    "updated_at": customer.updated_at,
                },
                contact=_pick_matching_contact(
                    contacts_by_email=contacts_by_email,
                    contacts_by_phone=contacts_by_phone,
                    email=customer.email,
                    phone=customer.phone,
                ),
                last_purchase_at=last_purchase_at,
                orders_count=int(orders_count or 0),
                total_spent=float(total_spent or 0),
            )
            for customer, orders_count, total_spent, last_purchase_at in rows
        ]

        return _build_paginated_payload(items=items, page=page, page_size=page_size, total=total)
    except SQLAlchemyError:
        db.rollback()
        return _list_mock_admin_customers(
            accepted_marketing=accepted_marketing,
            has_orders=has_orders,
            lifecycle_status=lifecycle_status,
            main_goal=main_goal,
            page=page,
            page_size=page_size,
            search=search,
            sort_by=sort_by,
            sort_dir=sort_dir,
            skin_type=skin_type,
        )


def _serialize_address(address: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": int(address["id"]),
        "label": str(address.get("label") or "Direccion"),
        "address_line1": str(address.get("address_line1") or ""),
        "city": str(address.get("city") or ""),
        "state": str(address.get("state") or ""),
        "postal_code": str(address.get("postal_code") or ""),
        "is_default": bool(address.get("is_default")),
    }


def _serialize_recent_order(order: dict[str, Any], payment: dict[str, Any] | None) -> dict[str, Any]:
    return {
        "id": int(order["id"]),
        "order_number": str(order.get("order_number") or f"#{order['id']}"),
        "status": str(order.get("status") or "pending"),
        "payment_status": str((payment or {}).get("status") or order.get("payment_status") or "pending"),
        "payment_provider": str((payment or {}).get("provider") or order.get("payment_provider") or "mock"),
        "total": round(float(order.get("grand_total") or 0), 2),
        "created_at": _normalize_datetime(order.get("created_at")) or datetime.now(timezone.utc),
    }


def get_admin_customer_detail(db: Session, customer_id: int) -> dict[str, Any] | None:
    try:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return None

        addresses = (
            db.query(CustomerAddress)
            .filter(CustomerAddress.customer_id == customer_id)
            .order_by(CustomerAddress.is_default.desc(), CustomerAddress.id.asc())
            .all()
        )
        orders = (
            db.query(Order)
            .filter(Order.customer_id == customer_id)
            .order_by(Order.created_at.desc())
            .limit(8)
            .all()
        )
        payments_by_order_id = {
            payment.order_id: payment
            for payment in (
                db.query(Payment).filter(Payment.order_id.in_([order.id for order in orders])).all()
                if orders
                else []
            )
        }

        contact = (
            db.query(CRMContact)
            .filter(
                or_(
                    and_(
                        CRMContact.email.is_not(None),
                        customer.email is not None,
                        func.lower(CRMContact.email) == func.lower(customer.email),
                    ),
                    and_(
                        CRMContact.whatsapp.is_not(None),
                        customer.phone is not None,
                        CRMContact.whatsapp == customer.phone,
                    ),
                )
            )
            .order_by(CRMContact.last_seen_at.desc())
            .first()
        )

        order_count = len(orders)
        total_spent = round(sum(float(order.grand_total or 0) for order in orders), 2)
        if order_count == 8:
            try:
                total_spent = round(
                    float(
                        db.query(func.coalesce(func.sum(Order.grand_total), 0))
                        .filter(Order.customer_id == customer_id)
                        .scalar()
                        or 0
                    ),
                    2,
                )
                order_count = int(
                    db.query(func.count(Order.id)).filter(Order.customer_id == customer_id).scalar() or 0
                )
            except SQLAlchemyError:
                db.rollback()

        summary = _customer_summary_from_sources(
            customer={
                "id": customer.id,
                "first_name": customer.first_name,
                "last_name": customer.last_name,
                "email": customer.email,
                "phone": customer.phone,
                "created_at": customer.created_at,
                "updated_at": customer.updated_at,
            },
            contact={
                "accepted_marketing": bool(contact.accepted_marketing),
                "lifecycle_status": str(contact.lifecycle_status),
                "main_goal": contact.main_goal,
                "skin_type": contact.skin_type,
                "source": contact.source,
            }
            if contact
            else None,
            last_purchase_at=orders[0].created_at if orders else None,
            orders_count=order_count,
            total_spent=total_spent,
        )

        notes = []
        if contact:
            notes = [
                {
                    "id": note.id,
                    "note": note.note,
                    "created_at": _normalize_datetime(note.created_at) or datetime.now(timezone.utc),
                }
                for note in (
                    db.query(CRMNote)
                    .filter(CRMNote.contact_id == contact.id)
                    .order_by(CRMNote.created_at.desc())
                    .limit(12)
                    .all()
                )
            ]

        detail = {
            **summary,
            "addresses": [
                _serialize_address(
                    {
                        "id": address.id,
                        "label": address.label,
                        "address_line1": address.address_line1,
                        "city": address.city,
                        "state": address.state,
                        "postal_code": address.postal_code,
                        "is_default": address.is_default,
                    }
                )
                for address in addresses
            ],
            "recent_orders": [
                _serialize_recent_order(
                    {
                        "id": order.id,
                        "order_number": order.order_number,
                        "status": str(order.status),
                        "payment_provider": None,
                        "payment_status": None,
                        "grand_total": float(order.grand_total or 0),
                        "created_at": order.created_at,
                    },
                    payments_by_order_id.get(order.id),
                )
                for order in orders
            ],
            "notes": notes,
            "tags": _serialize_tags(
                {
                    "lifecycle_status": summary.get("lifecycle_status"),
                    "skin_type": summary.get("skin_type"),
                    "main_goal": summary.get("main_goal"),
                    "source": summary.get("source"),
                }
                if contact
                else None
            ),
        }
        return detail
    except SQLAlchemyError:
        db.rollback()

    customer = next((entry for entry in CUSTOMERS if int(entry["id"]) == customer_id), None)
    if not customer:
        return None

    normalized_email = _normalize_email(customer.get("email"))
    normalized_phone = _normalize_phone(customer.get("phone"))
    contact = next(
        (
            contact
            for contact in CRM_CONTACTS
            if (normalized_email and _normalize_email(contact.get("email")) == normalized_email)
            or (normalized_phone and _normalize_phone(contact.get("whatsapp")) == normalized_phone)
        ),
        None,
    )
    customer_orders = [
        order for order in ORDERS if int(order.get("customer_id") or 0) == customer_id
    ]
    customer_orders.sort(
        key=lambda order: _normalize_datetime(order.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    summary = _customer_summary_from_sources(
        customer=customer,
        contact=contact,
        last_purchase_at=customer_orders[0].get("created_at") if customer_orders else None,
        orders_count=len(customer_orders),
        total_spent=sum(float(order.get("grand_total") or 0) for order in customer_orders),
    )
    detail = {
        **summary,
        "addresses": [
            _serialize_address(address)
            for address in CUSTOMER_ADDRESSES
            if int(address.get("customer_id") or 0) == customer_id
        ],
        "recent_orders": [
            _serialize_recent_order(
                order,
                next((payment for payment in PAYMENTS if int(payment.get("order_id") or 0) == int(order["id"])), None),
            )
            for order in customer_orders[:8]
        ],
        "notes": [
            {
                "id": int(note["id"]),
                "note": str(note.get("note") or ""),
                "created_at": _normalize_datetime(note.get("created_at")) or datetime.now(timezone.utc),
            }
            for note in CRM_NOTES
            if contact and int(note.get("contact_id") or 0) == int(contact["id"])
        ],
        "tags": _serialize_tags(contact),
    }
    return detail
