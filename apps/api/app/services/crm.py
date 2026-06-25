from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import and_, func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import Base, CRMContact, CRMEvent, CRMNote, CRMTask, Customer, Order
from app.models.enums import CRMLifecycleStatus, CRMTaskStatus
from app.schemas.checkout import CheckoutRequest
from app.schemas.crm import CRMContactUpdate, CRMNoteCreate, CRMTaskCreate, CRMTaskUpdate
from app.schemas.skin_quiz import SkinQuizLeadCreate
from app.services.crm_reminders import (
    create_post_purchase_reminder_from_order,
    create_repurchase_reminder_from_order,
    create_skin_quiz_followup_reminder,
    list_contact_reminders,
)
from app.services.mock_store import (
    CUSTOMERS,
    ORDERS,
    CRM_TASKS,
    create_crm_event as create_mock_crm_event,
    create_crm_note as create_mock_crm_note,
    create_crm_task as create_mock_crm_task,
    find_crm_contact as find_mock_crm_contact,
    get_crm_contact as get_mock_crm_contact,
    get_crm_task as get_mock_crm_task,
    list_crm_contacts as list_mock_crm_contacts,
    list_crm_events as list_mock_crm_events,
    list_crm_notes as list_mock_crm_notes,
    list_crm_tasks as list_mock_crm_tasks,
    update_crm_contact as update_mock_crm_contact,
    update_crm_task as update_mock_crm_task,
    upsert_crm_contact as upsert_mock_crm_contact,
)

_crm_tables_initialized = False


def _ensure_crm_tables() -> None:
    global _crm_tables_initialized

    if _crm_tables_initialized:
        return

    Base.metadata.create_all(
        bind=engine,
        tables=[
            CRMContact.__table__,
            CRMEvent.__table__,
            CRMNote.__table__,
            CRMTask.__table__,
        ],
    )
    _crm_tables_initialized = True


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


def _split_name(full_name: str) -> tuple[str, str | None]:
    parts = [part for part in full_name.strip().split() if part]
    if not parts:
        return "Contacto", None
    if len(parts) == 1:
        return parts[0], None
    return parts[0], " ".join(parts[1:])


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _contact_to_dict(contact: CRMContact) -> dict[str, Any]:
    return {
        "id": contact.id,
        "first_name": contact.first_name,
        "last_name": contact.last_name,
        "email": contact.email,
        "whatsapp": contact.whatsapp,
        "source": contact.source,
        "lifecycle_status": str(contact.lifecycle_status),
        "skin_type": contact.skin_type,
        "main_goal": contact.main_goal,
        "age_range": contact.age_range,
        "accepted_marketing": bool(contact.accepted_marketing),
        "first_seen_at": contact.first_seen_at,
        "last_seen_at": contact.last_seen_at,
        "created_at": contact.created_at,
        "updated_at": contact.updated_at,
    }


def _event_to_dict(event: CRMEvent) -> dict[str, Any]:
    return {
        "id": event.id,
        "contact_id": event.contact_id,
        "anonymous_id": event.anonymous_id,
        "event_type": event.event_type,
        "payload_json": event.payload_json or {},
        "source": event.source,
        "created_at": event.created_at,
    }


def _note_to_dict(note: CRMNote) -> dict[str, Any]:
    return {
        "id": note.id,
        "contact_id": note.contact_id,
        "note": note.note,
        "created_by_user_id": note.created_by_user_id,
        "created_at": note.created_at,
    }


def _task_to_dict(task: CRMTask) -> dict[str, Any]:
    return {
        "id": task.id,
        "contact_id": task.contact_id,
        "title": task.title,
        "due_at": task.due_at,
        "status": str(task.status),
        "task_type": str(task.task_type),
        "created_at": task.created_at,
        "completed_at": task.completed_at,
    }


def _serialize_purchase_summary(contact: dict[str, Any]) -> dict[str, Any]:
    contact_email = _normalize_email(contact.get("email"))
    contact_phone = _normalize_phone(contact.get("whatsapp"))

    customer_ids: set[int] = set()
    for customer in CUSTOMERS:
        if contact_email and _normalize_email(customer.get("email")) == contact_email:
            customer_ids.add(int(customer["id"]))
        elif contact_phone and _normalize_phone(customer.get("phone")) == contact_phone:
            customer_ids.add(int(customer["id"]))

    matching_orders: list[dict[str, Any]] = []
    for order in ORDERS:
        customer_id = order.get("customer_id")
        if customer_id in customer_ids:
            matching_orders.append(order)
            continue
        if contact_email and _normalize_email(order.get("customer_email")) == contact_email:
            matching_orders.append(order)

    matching_orders.sort(
        key=lambda order: _normalize_datetime(order.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    return {
        "order_count": len(matching_orders),
        "total_spent": round(sum(float(order.get("grand_total") or 0) for order in matching_orders), 2),
        "last_order_at": _normalize_datetime(matching_orders[0].get("created_at")) if matching_orders else None,
        "last_order_number": matching_orders[0].get("order_number") if matching_orders else None,
    }


def _serialize_purchase_summary_from_db(db: Session, contact: CRMContact) -> dict[str, Any]:
    try:
        filters = []
        normalized_email = _normalize_email(contact.email)
        normalized_phone = _normalize_phone(contact.whatsapp)

        if normalized_email:
            filters.append(func.lower(Customer.email) == normalized_email)
        if normalized_phone and contact.whatsapp:
            filters.append(Customer.phone == contact.whatsapp)

        if not filters:
            return _serialize_purchase_summary(_contact_to_dict(contact))

        customers = db.query(Customer).filter(or_(*filters)).all()
        customer_ids = [customer.id for customer in customers]
        if not customer_ids:
            return _serialize_purchase_summary(_contact_to_dict(contact))

        orders = (
            db.query(Order)
            .filter(Order.customer_id.in_(customer_ids))
            .order_by(Order.created_at.desc())
            .all()
        )
        if not orders:
            return _serialize_purchase_summary(_contact_to_dict(contact))

        latest_order = orders[0]
        return {
            "order_count": len(orders),
            "total_spent": round(sum(float(order.grand_total or 0) for order in orders), 2),
            "last_order_at": _normalize_datetime(latest_order.created_at),
            "last_order_number": latest_order.order_number,
        }
    except SQLAlchemyError:
        db.rollback()
        return _serialize_purchase_summary(_contact_to_dict(contact))


def _serialize_contact_summary(contact: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": contact["id"],
        "first_name": contact.get("first_name") or "Contacto",
        "last_name": contact.get("last_name"),
        "email": contact.get("email"),
        "whatsapp": contact.get("whatsapp"),
        "source": contact.get("source") or "unknown",
        "lifecycle_status": contact.get("lifecycle_status") or "lead",
        "skin_type": contact.get("skin_type"),
        "main_goal": contact.get("main_goal"),
        "age_range": contact.get("age_range"),
        "accepted_marketing": bool(contact.get("accepted_marketing")),
        "first_seen_at": _normalize_datetime(contact.get("first_seen_at")) or datetime.now(timezone.utc),
        "last_seen_at": _normalize_datetime(contact.get("last_seen_at")) or datetime.now(timezone.utc),
        "created_at": _normalize_datetime(contact.get("created_at")) or datetime.now(timezone.utc),
        "updated_at": _normalize_datetime(contact.get("updated_at")) or datetime.now(timezone.utc),
    }


def _serialize_contact_detail(
    contact: dict[str, Any],
    *,
    events: list[dict[str, Any]],
    notes: list[dict[str, Any]],
    reminders: list[dict[str, Any]],
    tasks: list[dict[str, Any]],
    purchase_summary: dict[str, Any] | None = None,
) -> dict[str, Any]:
    summary = _serialize_contact_summary(contact)
    summary.update(
        {
            "events": [
                {
                    "id": event["id"],
                    "contact_id": event.get("contact_id"),
                    "anonymous_id": event.get("anonymous_id"),
                    "event_type": event.get("event_type"),
                    "payload_json": event.get("payload_json") or {},
                    "source": event.get("source") or "unknown",
                    "created_at": _normalize_datetime(event.get("created_at")) or datetime.now(timezone.utc),
                }
                for event in events
            ],
            "notes": [
                {
                    "id": note["id"],
                    "contact_id": note["contact_id"],
                    "note": note["note"],
                    "created_by_user_id": note.get("created_by_user_id"),
                    "created_at": _normalize_datetime(note.get("created_at")) or datetime.now(timezone.utc),
                }
                for note in notes
            ],
            "reminders": reminders,
            "tasks": [
                {
                    "id": task["id"],
                    "contact_id": task["contact_id"],
                    "title": task["title"],
                    "due_at": _normalize_datetime(task.get("due_at")),
                    "status": task.get("status") or "pending",
                    "task_type": task.get("task_type") or "manual",
                    "created_at": _normalize_datetime(task.get("created_at")) or datetime.now(timezone.utc),
                    "completed_at": _normalize_datetime(task.get("completed_at")),
                }
                for task in tasks
            ],
            "purchase_summary": purchase_summary or _serialize_purchase_summary(contact),
        }
    )
    return summary


def _find_db_contact(db: Session, *, email: str | None = None, whatsapp: str | None = None) -> CRMContact | None:
    normalized_email = _normalize_email(email)
    normalized_whatsapp = _normalize_phone(whatsapp)
    contacts = db.query(CRMContact).all()

    for contact in contacts:
        if normalized_email and _normalize_email(contact.email) == normalized_email:
            return contact
        if normalized_whatsapp and _normalize_phone(contact.whatsapp) == normalized_whatsapp:
            return contact
    return None


def _record_crm_event_fallback(
    *,
    contact_id: int | None,
    anonymous_id: str | None,
    event_type: str,
    payload_json: dict[str, Any],
    source: str,
) -> dict[str, Any]:
    return create_mock_crm_event(
        {
            "contact_id": contact_id,
            "anonymous_id": anonymous_id,
            "event_type": event_type,
            "payload_json": payload_json,
            "source": source,
        }
    )


def record_crm_event(
    db: Session,
    *,
    contact_id: int | None,
    anonymous_id: str | None = None,
    event_type: str,
    payload_json: dict[str, Any] | None = None,
    source: str,
) -> dict[str, Any]:
    payload_data = payload_json or {}
    try:
        _ensure_crm_tables()
        event = CRMEvent(
            contact_id=contact_id,
            anonymous_id=anonymous_id,
            event_type=event_type,
            payload_json=payload_data,
            source=source,
        )
        db.add(event)

        if contact_id is not None:
            contact = db.query(CRMContact).filter(CRMContact.id == contact_id).first()
            if contact:
                contact.last_seen_at = datetime.now(timezone.utc)
                db.add(contact)

        db.commit()
        db.refresh(event)
        event_data = _event_to_dict(event)
        try:
            from app.services.crm_automations import evaluate_automations_for_event

            evaluate_automations_for_event(db, event_data)
        except Exception:
            db.rollback()

        return event_data
    except SQLAlchemyError:
        db.rollback()
        event_data = _record_crm_event_fallback(
            contact_id=contact_id,
            anonymous_id=anonymous_id,
            event_type=event_type,
            payload_json=payload_data,
            source=source,
        )
        try:
            from app.services.crm_automations import evaluate_automations_for_event

            evaluate_automations_for_event(db, event_data)
        except Exception:
            db.rollback()
        return event_data


def _safe_record_event(
    db: Session,
    *,
    contact_id: int | None,
    event_type: str,
    payload_json: dict[str, Any],
    source: str,
) -> dict[str, Any] | None:
    try:
        return record_crm_event(
            db,
            contact_id=contact_id,
            event_type=event_type,
            payload_json=payload_json,
            source=source,
        )
    except Exception:
        db.rollback()
        return None


def upsert_contact_from_skin_quiz_lead(
    db: Session,
    *,
    payload: SkinQuizLeadCreate,
    lead_id: int | None = None,
) -> dict[str, Any]:
    first_name, last_name = _split_name(payload.name)
    now = datetime.now(timezone.utc)

    try:
        _ensure_crm_tables()
        contact = _find_db_contact(db, email=payload.email, whatsapp=payload.whatsapp)
        if not contact:
            contact = CRMContact(
                first_name=first_name,
                last_name=last_name,
                email=_normalize_email(payload.email),
                whatsapp=payload.whatsapp,
                source="skin_quiz",
                lifecycle_status=CRMLifecycleStatus.LEAD,
                skin_type=payload.answers.get("skinType"),
                main_goal=payload.answers.get("goal"),
                age_range=payload.answers.get("ageRange"),
                accepted_marketing=payload.accepted_marketing,
                first_seen_at=now,
                last_seen_at=now,
            )
        else:
            contact.first_name = contact.first_name or first_name
            contact.last_name = contact.last_name or last_name
            contact.email = _normalize_email(payload.email) or contact.email
            contact.whatsapp = payload.whatsapp or contact.whatsapp
            contact.source = "skin_quiz"
            if str(contact.lifecycle_status) not in {"customer", "repeat_customer"}:
                contact.lifecycle_status = CRMLifecycleStatus.LEAD
            contact.skin_type = payload.answers.get("skinType") or contact.skin_type
            contact.main_goal = payload.answers.get("goal") or contact.main_goal
            contact.age_range = payload.answers.get("ageRange") or contact.age_range
            contact.accepted_marketing = bool(contact.accepted_marketing or payload.accepted_marketing)
            contact.last_seen_at = now

        db.add(contact)
        db.commit()
        db.refresh(contact)

        quiz_event = _safe_record_event(
            db,
            contact_id=contact.id,
            event_type="skin_quiz_completed",
            payload_json={
                "lead_id": lead_id,
                "goal": payload.answers.get("goal"),
                "skin_type": payload.answers.get("skinType"),
                "age_range": payload.answers.get("ageRange"),
                "source": payload.source,
            },
            source="skin_quiz",
        )
        try:
            create_skin_quiz_followup_reminder(
                db,
                contact,
                related_event_id=quiz_event["id"] if quiz_event else None,
            )
        except Exception:
            db.rollback()
        return _serialize_contact_summary(_contact_to_dict(contact))
    except SQLAlchemyError:
        db.rollback()
        existing = find_mock_crm_contact(email=payload.email, whatsapp=payload.whatsapp)
        current_status = existing.get("lifecycle_status") if existing else None
        lifecycle_status = current_status if current_status in {"customer", "repeat_customer"} else "lead"
        contact = upsert_mock_crm_contact(
            {
                "first_name": first_name,
                "last_name": last_name,
                "email": _normalize_email(payload.email),
                "whatsapp": payload.whatsapp,
                "source": "skin_quiz",
                "lifecycle_status": lifecycle_status,
                "skin_type": payload.answers.get("skinType"),
                "main_goal": payload.answers.get("goal"),
                "age_range": payload.answers.get("ageRange"),
                "accepted_marketing": payload.accepted_marketing or bool(existing and existing.get("accepted_marketing")),
                "last_seen_at": now,
            }
        )
        _record_crm_event_fallback(
            contact_id=contact["id"],
            anonymous_id=None,
            event_type="skin_quiz_completed",
            payload_json={
                "lead_id": lead_id,
                "goal": payload.answers.get("goal"),
                "skin_type": payload.answers.get("skinType"),
                "age_range": payload.answers.get("ageRange"),
                "source": payload.source,
            },
            source="skin_quiz",
        )
        try:
            create_skin_quiz_followup_reminder(db, contact)
        except Exception:
            db.rollback()
        return _serialize_contact_summary(contact)


def upsert_contact_from_checkout(
    db: Session,
    *,
    payload: CheckoutRequest,
    order: dict[str, Any],
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)

    try:
        _ensure_crm_tables()
        contact = _find_db_contact(
            db,
            email=payload.customer.email,
            whatsapp=payload.customer.phone,
        )

        if not contact:
            lifecycle_status = CRMLifecycleStatus.CUSTOMER
            contact = CRMContact(
                first_name=payload.customer.first_name,
                last_name=payload.customer.last_name,
                email=_normalize_email(payload.customer.email),
                whatsapp=payload.customer.phone,
                source="checkout",
                lifecycle_status=lifecycle_status,
                accepted_marketing=False,
                first_seen_at=now,
                last_seen_at=now,
            )
        else:
            existing_status = str(contact.lifecycle_status)
            contact.first_name = payload.customer.first_name or contact.first_name
            contact.last_name = payload.customer.last_name or contact.last_name
            contact.email = _normalize_email(payload.customer.email) or contact.email
            contact.whatsapp = payload.customer.phone or contact.whatsapp
            contact.source = "checkout"
            contact.lifecycle_status = (
                CRMLifecycleStatus.REPEAT_CUSTOMER
                if existing_status in {"customer", "repeat_customer"}
                else CRMLifecycleStatus.CUSTOMER
            )
            contact.last_seen_at = now

        db.add(contact)
        db.commit()
        db.refresh(contact)

        event_payload = {
            "order_id": order.get("id"),
            "order_number": order.get("order_number"),
            "total": float(order.get("grand_total") or 0),
            "payment_provider": order.get("payment_provider"),
            "payment_status": order.get("payment_status") or "pending",
            "item_count": sum(int(item.get("quantity") or 0) for item in order.get("items", [])),
        }
        _safe_record_event(
            db,
            contact_id=contact.id,
            event_type="checkout_completed",
            payload_json=event_payload,
            source="checkout",
        )
        _safe_record_event(
            db,
            contact_id=contact.id,
            event_type="order_created",
            payload_json=event_payload,
            source="checkout",
        )
        try:
            create_post_purchase_reminder_from_order(db, contact, order)
            create_repurchase_reminder_from_order(db, contact, order)
        except Exception:
            db.rollback()
        return _serialize_contact_summary(_contact_to_dict(contact))
    except SQLAlchemyError:
        db.rollback()
        existing = find_mock_crm_contact(email=payload.customer.email, whatsapp=payload.customer.phone)
        lifecycle_status = (
            "repeat_customer"
            if existing and existing.get("lifecycle_status") in {"customer", "repeat_customer"}
            else "customer"
        )
        contact = upsert_mock_crm_contact(
            {
                "first_name": payload.customer.first_name,
                "last_name": payload.customer.last_name,
                "email": _normalize_email(payload.customer.email),
                "whatsapp": payload.customer.phone,
                "source": "checkout",
                "lifecycle_status": lifecycle_status,
                "accepted_marketing": bool(existing and existing.get("accepted_marketing")),
                "last_seen_at": now,
            }
        )
        event_payload = {
            "order_id": order.get("id"),
            "order_number": order.get("order_number"),
            "total": float(order.get("grand_total") or 0),
            "payment_provider": order.get("payment_provider"),
            "payment_status": order.get("payment_status") or "pending",
            "item_count": sum(int(item.get("quantity") or 0) for item in order.get("items", [])),
        }
        _record_crm_event_fallback(
            contact_id=contact["id"],
            anonymous_id=None,
            event_type="checkout_completed",
            payload_json=event_payload,
            source="checkout",
        )
        _record_crm_event_fallback(
            contact_id=contact["id"],
            anonymous_id=None,
            event_type="order_created",
            payload_json=event_payload,
            source="checkout",
        )
        try:
            create_post_purchase_reminder_from_order(db, contact, order)
            create_repurchase_reminder_from_order(db, contact, order)
        except Exception:
            db.rollback()
        return _serialize_contact_summary(contact)


def record_order_paid_event(
    db: Session,
    *,
    customer_email: str | None,
    customer_phone: str | None,
    order: dict[str, Any],
) -> dict[str, Any] | None:
    event_payload = {
        "order_id": order.get("id"),
        "order_number": order.get("order_number"),
        "total": float(order.get("grand_total") or 0),
        "payment_provider": order.get("payment_provider"),
        "payment_status": "paid",
        "item_count": sum(int(item.get("quantity") or 0) for item in order.get("items", [])),
    }

    try:
        _ensure_crm_tables()
        contact = _find_db_contact(db, email=customer_email, whatsapp=customer_phone)
        if contact:
            return _safe_record_event(
                db,
                contact_id=contact.id,
                event_type="order_paid",
                payload_json=event_payload,
                source="payments",
            )
    except SQLAlchemyError:
        db.rollback()

    contact = find_mock_crm_contact(email=customer_email, whatsapp=customer_phone)
    if contact:
        return _record_crm_event_fallback(
            contact_id=contact["id"],
            anonymous_id=None,
            event_type="order_paid",
            payload_json=event_payload,
            source="payments",
        )

    return None


def create_task(
    db: Session,
    *,
    contact_id: int,
    title: str,
    task_type: str,
    due_at: datetime | None = None,
    created_by_user_id: int | None = None,
) -> dict[str, Any] | None:
    payload = CRMTaskCreate(title=title, dueAt=due_at, taskType=task_type)
    return create_crm_task_entry(
        db,
        contact_id=contact_id,
        payload=payload,
        created_by_user_id=created_by_user_id,
    )


def _apply_crm_contact_sort(query, *, sort_by: str, sort_dir: str):
    if sort_by == "contact":
        if sort_dir == "asc":
            return query.order_by(
                func.lower(CRMContact.first_name).asc(),
                func.lower(func.coalesce(CRMContact.last_name, "")).asc(),
            )
        return query.order_by(
            func.lower(CRMContact.first_name).desc(),
            func.lower(func.coalesce(CRMContact.last_name, "")).desc(),
        )
    if sort_by == "createdAt":
        return query.order_by(CRMContact.created_at.asc() if sort_dir == "asc" else CRMContact.created_at.desc())
    if sort_by == "lifecycleStatus":
        return query.order_by(
            CRMContact.lifecycle_status.asc() if sort_dir == "asc" else CRMContact.lifecycle_status.desc()
        )
    return query.order_by(CRMContact.last_seen_at.asc() if sort_dir == "asc" else CRMContact.last_seen_at.desc())


def list_crm_contact_summaries(
    db: Session,
    *,
    accepted_marketing: bool | None = None,
    has_orders: bool | None = None,
    lifecycle_status: str | None = None,
    main_goal: str | None = None,
    page: int = 1,
    page_size: int = 25,
    search: str | None = None,
    sort_by: str = "lastSeenAt",
    sort_dir: str = "desc",
    skin_type: str | None = None,
) -> dict[str, Any]:
    try:
        _ensure_crm_tables()
        normalized_search = search.strip().lower() if search else None
        base_query = db.query(CRMContact)

        if accepted_marketing is not None:
            base_query = base_query.filter(CRMContact.accepted_marketing == accepted_marketing)
        if lifecycle_status:
            base_query = base_query.filter(CRMContact.lifecycle_status == lifecycle_status)
        if skin_type:
            base_query = base_query.filter(CRMContact.skin_type == skin_type)
        if main_goal:
            base_query = base_query.filter(CRMContact.main_goal == main_goal)
        if normalized_search:
            like_value = f"%{normalized_search}%"
            base_query = base_query.filter(
                or_(
                    func.lower(CRMContact.first_name).like(like_value),
                    func.lower(func.coalesce(CRMContact.last_name, "")).like(like_value),
                    func.lower(func.coalesce(CRMContact.email, "")).like(like_value),
                    func.lower(func.coalesce(CRMContact.whatsapp, "")).like(like_value),
                )
            )

        direction = sort_dir if sort_dir in {"asc", "desc"} else "desc"
        sort_key = sort_by or "lastSeenAt"
        contacts: list[CRMContact]
        total = 0
        fallback_has_orders_by_contact_id: dict[int, bool] = {}

        if has_orders is None:
            total = base_query.order_by(None).count()
            contacts = (
                _apply_crm_contact_sort(base_query, sort_by=sort_key, sort_dir=direction)
                .offset((page - 1) * page_size)
                .limit(page_size)
                .all()
            )
        else:
            try:
                contact_has_orders = (
                    db.query(Order.id)
                    .join(Customer, Customer.id == Order.customer_id)
                    .filter(
                        or_(
                            and_(
                                CRMContact.email.is_not(None),
                                Customer.email.is_not(None),
                                func.lower(Customer.email) == func.lower(CRMContact.email),
                            ),
                            and_(
                                CRMContact.whatsapp.is_not(None),
                                Customer.phone.is_not(None),
                                Customer.phone == CRMContact.whatsapp,
                            ),
                        )
                    )
                    .exists()
                )
                filtered_query = base_query.filter(contact_has_orders if has_orders else ~contact_has_orders)
                total = filtered_query.order_by(None).count()
                contacts = (
                    _apply_crm_contact_sort(filtered_query, sort_by=sort_key, sort_dir=direction)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                    .all()
                )
            except SQLAlchemyError:
                db.rollback()
                all_contacts = _apply_crm_contact_sort(base_query, sort_by=sort_key, sort_dir=direction).all()
                matching_contacts: list[CRMContact] = []
                for contact in all_contacts:
                    purchase_summary = _serialize_purchase_summary(_contact_to_dict(contact))
                    contact_has_orders = int(purchase_summary.get("order_count") or 0) > 0
                    fallback_has_orders_by_contact_id[contact.id] = contact_has_orders
                    if contact_has_orders == has_orders:
                        matching_contacts.append(contact)

                total = len(matching_contacts)
                start = (page - 1) * page_size
                contacts = matching_contacts[start : start + page_size]

        contact_ids = [contact.id for contact in contacts]

        next_tasks_by_contact_id: dict[int, dict[str, Any]] = {}
        if contact_ids:
            pending_tasks = (
                db.query(CRMTask)
                .filter(CRMTask.contact_id.in_(contact_ids), CRMTask.status == CRMTaskStatus.PENDING)
                .order_by(CRMTask.contact_id.asc(), CRMTask.due_at.asc().nullsfirst(), CRMTask.created_at.asc())
                .all()
            )
            for task in pending_tasks:
                if task.contact_id not in next_tasks_by_contact_id:
                    next_tasks_by_contact_id[task.contact_id] = {
                        "id": task.id,
                        "title": task.title,
                        "due_at": task.due_at,
                        "status": str(task.status),
                        "task_type": str(task.task_type),
                    }

        has_orders_by_contact_id = dict(fallback_has_orders_by_contact_id)

        try:
            customer_ids_by_contact_id: dict[int, set[int]] = {contact_id: set() for contact_id in contact_ids}
            normalized_emails = sorted(
                {
                    normalized
                    for normalized in (_normalize_email(contact.email) for contact in contacts)
                    if normalized
                }
            )
            raw_phones = sorted({contact.whatsapp for contact in contacts if contact.whatsapp})

            customers: list[Customer] = []
            if normalized_emails or raw_phones:
                customer_filters = []
                if normalized_emails:
                    customer_filters.append(func.lower(Customer.email).in_(normalized_emails))
                if raw_phones:
                    customer_filters.append(Customer.phone.in_(raw_phones))
                customers = db.query(Customer).filter(or_(*customer_filters)).all()

            order_count_by_customer_id: dict[int, int] = {}
            if customers:
                customer_ids = [customer.id for customer in customers]
                order_counts = (
                    db.query(Order.customer_id, func.count(Order.id))
                    .filter(Order.customer_id.in_(customer_ids))
                    .group_by(Order.customer_id)
                    .all()
                )
                order_count_by_customer_id = {
                    int(customer_id): int(order_count or 0)
                    for customer_id, order_count in order_counts
                }

                for customer in customers:
                    matched_contact_ids: set[int] = set()
                    normalized_email = _normalize_email(customer.email)
                    normalized_phone = _normalize_phone(customer.phone)
                    for contact in contacts:
                        if normalized_email and _normalize_email(contact.email) == normalized_email:
                            matched_contact_ids.add(contact.id)
                        elif normalized_phone and _normalize_phone(contact.whatsapp) == normalized_phone:
                            matched_contact_ids.add(contact.id)
                    for matched_contact_id in matched_contact_ids:
                        customer_ids_by_contact_id.setdefault(matched_contact_id, set()).add(customer.id)

            for contact in contacts:
                customer_ids = customer_ids_by_contact_id.get(contact.id, set())
                has_orders_by_contact_id[contact.id] = any(
                    order_count_by_customer_id.get(customer_id, 0) > 0 for customer_id in customer_ids
                )
        except SQLAlchemyError:
            db.rollback()
            for contact in contacts:
                purchase_summary = _serialize_purchase_summary(_contact_to_dict(contact))
                has_orders_by_contact_id[contact.id] = int(purchase_summary.get("order_count") or 0) > 0

        items: list[dict[str, Any]] = []
        for contact in contacts:
            summary = _serialize_contact_summary(_contact_to_dict(contact))
            summary.update(
                {
                    "preferred_channel": "whatsapp" if contact.whatsapp else "email" if contact.email else None,
                    "has_orders": has_orders_by_contact_id.get(contact.id, False),
                    "next_task": next_tasks_by_contact_id.get(contact.id),
                }
            )
            items.append(summary)

        total_pages = max(1, math.ceil(total / page_size)) if page_size > 0 else 1
        return {
            "items": items,
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        }
    except SQLAlchemyError:
        db.rollback()
        contacts = [
            _serialize_contact_summary(contact)
            for contact in list_mock_crm_contacts(
                accepted_marketing=accepted_marketing,
                lifecycle_status=lifecycle_status,
                main_goal=main_goal,
                search=search,
                skin_type=skin_type,
            )
        ]

        def contact_has_orders(contact: dict[str, Any]) -> bool:
            purchase_summary = _serialize_purchase_summary(contact)
            return int(purchase_summary.get("order_count") or 0) > 0

        if has_orders is True:
            contacts = [contact for contact in contacts if contact_has_orders(contact)]
        elif has_orders is False:
            contacts = [contact for contact in contacts if not contact_has_orders(contact)]

        tasks_by_contact_id: dict[int, dict[str, Any]] = {}
        for task in sorted(
            [task for task in CRM_TASKS if task.get("status") == "pending"],
            key=lambda task: (
                int(task.get("contact_id") or 0),
                _normalize_datetime(task.get("due_at")) or datetime.min.replace(tzinfo=timezone.utc),
                _normalize_datetime(task.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc),
            ),
        ):
            contact_id = int(task.get("contact_id") or 0)
            if contact_id not in tasks_by_contact_id:
                tasks_by_contact_id[contact_id] = {
                    "id": int(task["id"]),
                    "title": str(task.get("title") or ""),
                    "due_at": _normalize_datetime(task.get("due_at")),
                    "status": str(task.get("status") or "pending"),
                    "task_type": str(task.get("task_type") or "manual"),
                }

        for contact in contacts:
            contact["preferred_channel"] = "whatsapp" if contact.get("whatsapp") else "email" if contact.get("email") else None
            contact["has_orders"] = contact_has_orders(contact)
            contact["next_task"] = tasks_by_contact_id.get(int(contact["id"]))

        reverse = sort_dir == "desc"
        if sort_by == "contact":
            contacts.sort(
                key=lambda contact: (
                    str(contact.get("first_name") or "").lower(),
                    str(contact.get("last_name") or "").lower(),
                ),
                reverse=reverse,
            )
        elif sort_by == "createdAt":
            contacts.sort(
                key=lambda contact: contact.get("created_at") or datetime.min.replace(tzinfo=timezone.utc),
                reverse=reverse,
            )
        elif sort_by == "lifecycleStatus":
            contacts.sort(key=lambda contact: str(contact.get("lifecycle_status") or ""), reverse=reverse)
        else:
            contacts.sort(
                key=lambda contact: contact.get("last_seen_at") or datetime.min.replace(tzinfo=timezone.utc),
                reverse=reverse,
            )

        total = len(contacts)
        total_pages = max(1, math.ceil(total / page_size)) if page_size > 0 else 1
        start = (page - 1) * page_size
        return {
            "items": contacts[start : start + page_size],
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        }


def get_crm_contact_detail(db: Session, contact_id: int) -> dict[str, Any] | None:
    try:
        _ensure_crm_tables()
        contact = db.query(CRMContact).filter(CRMContact.id == contact_id).first()
        if not contact:
            return None

        events = [
            _event_to_dict(event)
            for event in db.query(CRMEvent)
            .filter(CRMEvent.contact_id == contact_id)
            .order_by(CRMEvent.created_at.desc())
            .limit(12)
            .all()
        ]
        notes = [
            _note_to_dict(note)
            for note in db.query(CRMNote)
            .filter(CRMNote.contact_id == contact_id)
            .order_by(CRMNote.created_at.desc())
            .all()
        ]
        tasks = [
            _task_to_dict(task)
            for task in db.query(CRMTask)
            .filter(CRMTask.contact_id == contact_id)
            .order_by(CRMTask.created_at.desc())
            .all()
        ]
        return _serialize_contact_detail(
            _contact_to_dict(contact),
            events=events,
            notes=notes,
            reminders=list_contact_reminders(db, contact_id),
            tasks=tasks,
            purchase_summary=_serialize_purchase_summary_from_db(db, contact),
        )
    except SQLAlchemyError:
        db.rollback()
        contact = get_mock_crm_contact(contact_id)
        if not contact:
            return None
        return _serialize_contact_detail(
            contact,
            events=list_mock_crm_events(contact_id, 12),
            notes=list_mock_crm_notes(contact_id),
            reminders=list_contact_reminders(db, contact_id),
            tasks=list_mock_crm_tasks(contact_id),
        )


def update_crm_contact_profile(
    db: Session,
    contact_id: int,
    payload: CRMContactUpdate,
) -> dict[str, Any] | None:
    changes: dict[str, Any] = {}
    if "lifecycle_status" in payload.model_fields_set:
        changes["lifecycle_status"] = payload.lifecycle_status
    if "skin_type" in payload.model_fields_set:
        changes["skin_type"] = payload.skin_type
    if "main_goal" in payload.model_fields_set:
        changes["main_goal"] = payload.main_goal
    if "accepted_marketing" in payload.model_fields_set:
        changes["accepted_marketing"] = payload.accepted_marketing

    try:
        _ensure_crm_tables()
        contact = db.query(CRMContact).filter(CRMContact.id == contact_id).first()
        if not contact:
            return None

        for field_name, field_value in changes.items():
            setattr(contact, field_name, field_value)

        db.add(contact)
        db.commit()
        db.refresh(contact)
        return _serialize_contact_detail(
            _contact_to_dict(contact),
            events=[
                _event_to_dict(event)
                for event in db.query(CRMEvent)
                .filter(CRMEvent.contact_id == contact_id)
                .order_by(CRMEvent.created_at.desc())
                .limit(12)
                .all()
            ],
            notes=[
                _note_to_dict(note)
                for note in db.query(CRMNote)
                .filter(CRMNote.contact_id == contact_id)
                .order_by(CRMNote.created_at.desc())
                .all()
            ],
            reminders=list_contact_reminders(db, contact_id),
            tasks=[
                _task_to_dict(task)
                for task in db.query(CRMTask)
                .filter(CRMTask.contact_id == contact_id)
                .order_by(CRMTask.created_at.desc())
                .all()
            ],
            purchase_summary=_serialize_purchase_summary_from_db(db, contact),
        )
    except SQLAlchemyError:
        db.rollback()
        contact = update_mock_crm_contact(contact_id, changes)
        if not contact:
            return None
        return _serialize_contact_detail(
            contact,
            events=list_mock_crm_events(contact_id, 12),
            notes=list_mock_crm_notes(contact_id),
            reminders=list_contact_reminders(db, contact_id),
            tasks=list_mock_crm_tasks(contact_id),
        )


def create_crm_note_entry(
    db: Session,
    *,
    contact_id: int,
    payload: CRMNoteCreate,
    created_by_user_id: int | None = None,
) -> dict[str, Any] | None:
    try:
        _ensure_crm_tables()
        contact = db.query(CRMContact).filter(CRMContact.id == contact_id).first()
        if not contact:
            return None

        note = CRMNote(
            contact_id=contact_id,
            note=payload.note,
            created_by_user_id=created_by_user_id,
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return _note_to_dict(note)
    except SQLAlchemyError:
        db.rollback()
        if not get_mock_crm_contact(contact_id):
            return None
        return create_mock_crm_note(
            {
                "contact_id": contact_id,
                "note": payload.note,
                "created_by_user_id": created_by_user_id,
            }
        )


def create_crm_task_entry(
    db: Session,
    *,
    contact_id: int,
    payload: CRMTaskCreate,
    created_by_user_id: int | None = None,
) -> dict[str, Any] | None:
    try:
        _ensure_crm_tables()
        contact = db.query(CRMContact).filter(CRMContact.id == contact_id).first()
        if not contact:
            return None

        task = CRMTask(
            contact_id=contact_id,
            title=payload.title,
            due_at=payload.due_at,
            status=CRMTaskStatus.PENDING,
            task_type=payload.task_type,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return _task_to_dict(task)
    except SQLAlchemyError:
        db.rollback()
        if not get_mock_crm_contact(contact_id):
            return None
        return create_mock_crm_task(
            {
                "contact_id": contact_id,
                "title": payload.title,
                "due_at": payload.due_at,
                "status": "pending",
                "task_type": payload.task_type,
                "created_by_user_id": created_by_user_id,
            }
        )


def update_crm_task_entry(
    db: Session,
    task_id: int,
    payload: CRMTaskUpdate,
) -> dict[str, Any] | None:
    completed_at = datetime.now(timezone.utc) if payload.status in {"done", "cancelled"} else None
    try:
        _ensure_crm_tables()
        task = db.query(CRMTask).filter(CRMTask.id == task_id).first()
        if not task:
            return None

        task.status = payload.status
        task.completed_at = completed_at
        db.add(task)
        db.commit()
        db.refresh(task)
        return _task_to_dict(task)
    except SQLAlchemyError:
        db.rollback()
        task = get_mock_crm_task(task_id)
        if not task:
            return None
        return update_mock_crm_task(
            task_id,
            {
                "status": payload.status,
                "completed_at": completed_at,
            },
        )
