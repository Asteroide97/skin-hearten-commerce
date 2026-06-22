from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from sqlalchemy import asc, desc
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import Base, CRMContact, CRMMessageTemplate, CRMReminder
from app.models.enums import CRMReminderStatus, CRMReminderType
from app.schemas.crm import (
    CRMMessageTemplatePreviewRequest,
    CRMMessageTemplateUpdate,
    CRMReminderCreate,
    CRMReminderUpdate,
)
from app.services.mock_store import (
    create_crm_message_template as create_mock_crm_message_template,
    create_crm_reminder as create_mock_crm_reminder,
    find_crm_reminder as find_mock_crm_reminder,
    get_crm_contact as get_mock_crm_contact,
    get_crm_message_template as get_mock_crm_message_template,
    get_crm_message_template_by_name as get_mock_crm_message_template_by_name,
    get_crm_reminder as get_mock_crm_reminder,
    list_crm_message_templates as list_mock_crm_message_templates,
    list_crm_reminders as list_mock_crm_reminders,
    update_crm_message_template as update_mock_crm_message_template,
    update_crm_reminder as update_mock_crm_reminder,
)

_crm_reminder_tables_initialized = False
_TEMPLATE_VARIABLES = [
    "{{first_name}}",
    "{{main_goal}}",
    "{{skin_type}}",
    "{{order_number}}",
    "{{last_order_date}}",
    "{{store_name}}",
]

DEFAULT_MESSAGE_TEMPLATES: list[dict[str, Any]] = [
    {
        "name": "WhatsApp - Skin Quiz follow-up",
        "channel": "whatsapp",
        "reminder_type": "skin_quiz_follow_up",
        "subject": None,
        "body": "Hola {{first_name}}, vi que hiciste el Skin Quiz de Skin Hearten. Por tu objetivo de {{main_goal}}, puedo ayudarte a completar tu rutina. ¿Te gustaría que te mande opciones?",
        "is_active": True,
    },
    {
        "name": "WhatsApp - Recompra 30 días",
        "channel": "whatsapp",
        "reminder_type": "repurchase_30_days",
        "subject": None,
        "body": "Hola {{first_name}}, hace aproximadamente 30 días compraste en Skin Hearten. Tu rutina podría estar por terminarse. ¿Quieres que te ayudemos a reponer tus productos?",
        "is_active": True,
    },
    {
        "name": "WhatsApp - Post-compra",
        "channel": "whatsapp",
        "reminder_type": "post_purchase",
        "subject": None,
        "body": "Hola {{first_name}}, queremos saber cómo te fue con tu compra en Skin Hearten. ¿Todo llegó bien?",
        "is_active": True,
    },
    {
        "name": "WhatsApp - Cliente inactivo",
        "channel": "whatsapp",
        "reminder_type": "customer_inactive",
        "subject": None,
        "body": "Hola {{first_name}}, hace tiempo no te vemos por Skin Hearten. Tenemos recomendaciones nuevas según tu tipo de piel.",
        "is_active": True,
    },
    {
        "name": "Email - Recompra 30 días",
        "channel": "email",
        "reminder_type": "repurchase_30_days",
        "subject": "Tu rutina Skin Hearten puede estar por terminarse",
        "body": "Hola {{first_name}}, hace 30 días compraste en Skin Hearten. Te ayudamos a reponer tu rutina...",
        "is_active": True,
    },
    {
        "name": "Email - Post-compra",
        "channel": "email",
        "reminder_type": "post_purchase",
        "subject": "¿Cómo te fue con tu compra?",
        "body": "Hola {{first_name}}, queremos saber si todo llegó bien...",
        "is_active": True,
    },
]


def _ensure_crm_reminder_tables() -> None:
    global _crm_reminder_tables_initialized

    if _crm_reminder_tables_initialized:
        return

    Base.metadata.create_all(
        bind=engine,
        tables=[
            CRMContact.__table__,
            CRMMessageTemplate.__table__,
            CRMReminder.__table__,
        ],
    )
    _crm_reminder_tables_initialized = True


def _normalize_datetime(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
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


def _humanize_goal(value: str | None) -> str:
    labels = {
        "manchas": "manchas",
        "acne": "acné",
        "lineas_expresion": "líneas de expresión",
        "hidratacion": "hidratación",
        "luminosidad": "luminosidad",
        "proteccion_solar": "protección solar",
    }
    return labels.get(value or "", value.replace("_", " ") if value else "tu piel")


def _humanize_skin_type(value: str | None) -> str:
    labels = {
        "seca": "piel seca",
        "mixta": "piel mixta",
        "grasa": "piel grasa",
        "sensible": "piel sensible",
        "no_segura": "piel por definir",
    }
    return labels.get(value or "", value.replace("_", " ") if value else "tu tipo de piel")


def _contact_to_dict(contact: CRMContact | dict[str, Any]) -> dict[str, Any]:
    if isinstance(contact, dict):
        return {
            "id": int(contact["id"]),
            "first_name": contact.get("first_name") or "Contacto",
            "last_name": contact.get("last_name"),
            "email": contact.get("email"),
            "whatsapp": contact.get("whatsapp"),
            "main_goal": contact.get("main_goal"),
            "skin_type": contact.get("skin_type"),
            "accepted_marketing": bool(contact.get("accepted_marketing")),
        }

    return {
        "id": int(contact.id),
        "first_name": contact.first_name or "Contacto",
        "last_name": contact.last_name,
        "email": contact.email,
        "whatsapp": contact.whatsapp,
        "main_goal": contact.main_goal,
        "skin_type": contact.skin_type,
        "accepted_marketing": bool(contact.accepted_marketing),
    }


def _template_to_dict(template: CRMMessageTemplate) -> dict[str, Any]:
    return {
        "id": template.id,
        "name": template.name,
        "channel": str(template.channel),
        "reminder_type": str(template.reminder_type),
        "subject": template.subject,
        "body": template.body,
        "is_active": bool(template.is_active),
        "created_at": template.created_at,
        "updated_at": template.updated_at,
    }


def _serialize_contact(contact: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": int(contact["id"]),
        "first_name": str(contact.get("first_name") or "Contacto"),
        "last_name": contact.get("last_name"),
        "email": contact.get("email"),
        "whatsapp": contact.get("whatsapp"),
        "main_goal": contact.get("main_goal"),
        "skin_type": contact.get("skin_type"),
        "accepted_marketing": bool(contact.get("accepted_marketing")),
    }


def _serialize_template(template: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": int(template["id"]),
        "name": str(template["name"]),
        "channel": str(template["channel"]),
        "reminder_type": str(template["reminder_type"]),
        "subject": template.get("subject"),
        "body": str(template["body"]),
        "is_active": bool(template.get("is_active", True)),
        "created_at": _normalize_datetime(template.get("created_at")),
        "updated_at": _normalize_datetime(template.get("updated_at")),
    }


def _reminder_reason(reminder_type: str) -> str:
    labels = {
        "skin_quiz_follow_up": "Seguimiento al Skin Quiz",
        "abandoned_cart": "Checkout abandonado",
        "post_purchase": "Seguimiento post-compra",
        "repurchase_30_days": "Posible recompra a 30 días",
        "customer_inactive": "Cliente inactivo",
        "manual": "Recordatorio manual",
    }
    return labels.get(reminder_type, reminder_type.replace("_", " "))


def _serialize_reminder(
    reminder: dict[str, Any],
    *,
    contact: dict[str, Any],
    template: dict[str, Any] | None = None,
) -> dict[str, Any]:
    reminder_type = str(reminder["reminder_type"])
    return {
        "id": int(reminder["id"]),
        "channel": str(reminder["channel"]),
        "reminder_type": reminder_type,
        "status": str(reminder["status"]),
        "scheduled_for": _normalize_datetime(reminder.get("scheduled_for")),
        "template_id": reminder.get("template_id"),
        "template_name": template.get("name") if template else None,
        "rendered_subject": reminder.get("rendered_subject"),
        "rendered_body": str(reminder.get("rendered_body") or ""),
        "related_order_id": reminder.get("related_order_id"),
        "related_event_id": reminder.get("related_event_id"),
        "sent_manually_at": _normalize_datetime(reminder.get("sent_manually_at")) if reminder.get("sent_manually_at") else None,
        "skipped_at": _normalize_datetime(reminder.get("skipped_at")) if reminder.get("skipped_at") else None,
        "created_at": _normalize_datetime(reminder.get("created_at")),
        "updated_at": _normalize_datetime(reminder.get("updated_at")),
        "contact": _serialize_contact(contact),
        "reminder_reason": _reminder_reason(reminder_type),
    }


def _find_db_template_by_name(db: Session, name: str) -> CRMMessageTemplate | None:
    return db.query(CRMMessageTemplate).filter(CRMMessageTemplate.name == name).first()


def _find_db_template_for_type(db: Session, *, channel: str, reminder_type: str) -> CRMMessageTemplate | None:
    return (
        db.query(CRMMessageTemplate)
        .filter(
            CRMMessageTemplate.channel == channel,
            CRMMessageTemplate.reminder_type == reminder_type,
            CRMMessageTemplate.is_active.is_(True),
        )
        .order_by(CRMMessageTemplate.id.asc())
        .first()
    )


def _find_db_reminder(
    db: Session,
    *,
    channel: str,
    contact_id: int,
    reminder_type: str,
    related_event_id: int | None = None,
    related_order_id: int | None = None,
) -> CRMReminder | None:
    return (
        db.query(CRMReminder)
        .filter(
            CRMReminder.contact_id == contact_id,
            CRMReminder.channel == channel,
            CRMReminder.reminder_type == reminder_type,
            CRMReminder.related_event_id == related_event_id,
            CRMReminder.related_order_id == related_order_id,
        )
        .order_by(CRMReminder.id.desc())
        .first()
    )


def _ensure_ready_status_db(db: Session, now: datetime) -> None:
    pending_reminders = (
        db.query(CRMReminder)
        .filter(
            CRMReminder.status == CRMReminderStatus.PENDING,
            CRMReminder.scheduled_for <= now,
        )
        .all()
    )
    if not pending_reminders:
        return

    for reminder in pending_reminders:
        reminder.status = CRMReminderStatus.READY
        db.add(reminder)
    db.commit()


def _ensure_ready_status_mock(now: datetime) -> None:
    for reminder in list_mock_crm_reminders():
        if reminder.get("status") != "pending":
            continue
        if _normalize_datetime(reminder.get("scheduled_for")) > now:
            continue
        update_mock_crm_reminder(reminder["id"], {"status": "ready"})


def create_default_message_templates_if_missing(db: Session) -> list[dict[str, Any]]:
    try:
        _ensure_crm_reminder_tables()
        changed = False

        for template_data in DEFAULT_MESSAGE_TEMPLATES:
            if _find_db_template_by_name(db, template_data["name"]):
                continue

            db.add(CRMMessageTemplate(**template_data))
            changed = True

        if changed:
            db.commit()

        templates = db.query(CRMMessageTemplate).order_by(CRMMessageTemplate.created_at.asc()).all()
        return [_serialize_template(_template_to_dict(template)) for template in templates]
    except SQLAlchemyError:
        db.rollback()
        for template_data in DEFAULT_MESSAGE_TEMPLATES:
            if get_mock_crm_message_template_by_name(template_data["name"]):
                continue
            create_mock_crm_message_template(template_data)
        return [_serialize_template(template) for template in list_mock_crm_message_templates()]


def render_message_template(
    template: dict[str, Any],
    contact: CRMContact | dict[str, Any],
    context: dict[str, Any] | None = None,
) -> dict[str, str | None]:
    contact_data = _contact_to_dict(contact)
    render_context = {
        "first_name": contact_data.get("first_name") or "Contacto",
        "main_goal": _humanize_goal(contact_data.get("main_goal")),
        "skin_type": _humanize_skin_type(contact_data.get("skin_type")),
        "order_number": "",
        "last_order_date": "",
        "store_name": "Skin Hearten",
    }
    render_context.update(context or {})

    def _replace_tokens(value: str | None) -> str | None:
        if value is None:
            return None

        rendered = value
        for key, replacement in render_context.items():
            rendered = rendered.replace(f"{{{{{key}}}}}", str(replacement or ""))
        return rendered

    return {
        "rendered_subject": _replace_tokens(template.get("subject")),
        "rendered_body": _replace_tokens(template.get("body")) or "",
    }


def create_reminder(
    db: Session,
    *,
    contact: CRMContact | dict[str, Any],
    reminder_type: str,
    channel: str,
    scheduled_for: datetime,
    template_id: int | None = None,
    context: dict[str, Any] | None = None,
    related_order_id: int | None = None,
    related_event_id: int | None = None,
    allow_duplicate: bool = False,
    rendered_body: str | None = None,
    rendered_subject: str | None = None,
) -> dict[str, Any] | None:
    create_default_message_templates_if_missing(db)
    contact_data = _contact_to_dict(contact)
    scheduled_at = _normalize_datetime(scheduled_for)

    try:
        _ensure_crm_reminder_tables()
        if not allow_duplicate:
            existing = _find_db_reminder(
                db,
                channel=channel,
                contact_id=contact_data["id"],
                reminder_type=reminder_type,
                related_event_id=related_event_id,
                related_order_id=related_order_id,
            )
            if existing:
                template = db.query(CRMMessageTemplate).filter(CRMMessageTemplate.id == existing.template_id).first() if existing.template_id else None
                return _serialize_reminder(
                    {
                        "id": existing.id,
                        "channel": str(existing.channel),
                        "reminder_type": str(existing.reminder_type),
                        "status": str(existing.status),
                        "scheduled_for": existing.scheduled_for,
                        "template_id": existing.template_id,
                        "rendered_subject": existing.rendered_subject,
                        "rendered_body": existing.rendered_body,
                        "related_order_id": existing.related_order_id,
                        "related_event_id": existing.related_event_id,
                        "sent_manually_at": existing.sent_manually_at,
                        "skipped_at": existing.skipped_at,
                        "created_at": existing.created_at,
                        "updated_at": existing.updated_at,
                    },
                    contact=contact_data,
                    template=_template_to_dict(template) if template else None,
                )

        template = None
        if template_id is not None:
            template = db.query(CRMMessageTemplate).filter(CRMMessageTemplate.id == template_id).first()
        if template is None:
            template = _find_db_template_for_type(db, channel=channel, reminder_type=reminder_type)

        template_dict = _template_to_dict(template) if template else None
        rendered = (
            render_message_template(template_dict, contact_data, context) if template_dict else {"rendered_subject": rendered_subject, "rendered_body": rendered_body}
        )

        reminder = CRMReminder(
            contact_id=contact_data["id"],
            channel=channel,
            reminder_type=reminder_type,
            status=CRMReminderStatus.READY if scheduled_at <= datetime.now(timezone.utc) else CRMReminderStatus.PENDING,
            scheduled_for=scheduled_at,
            template_id=template.id if template else template_id,
            rendered_subject=rendered_subject if template is None else rendered["rendered_subject"],
            rendered_body=rendered_body if template is None and rendered_body is not None else str(rendered["rendered_body"] or ""),
            related_order_id=related_order_id,
            related_event_id=related_event_id,
        )
        db.add(reminder)
        db.commit()
        db.refresh(reminder)

        return _serialize_reminder(
            {
                "id": reminder.id,
                "channel": str(reminder.channel),
                "reminder_type": str(reminder.reminder_type),
                "status": str(reminder.status),
                "scheduled_for": reminder.scheduled_for,
                "template_id": reminder.template_id,
                "rendered_subject": reminder.rendered_subject,
                "rendered_body": reminder.rendered_body,
                "related_order_id": reminder.related_order_id,
                "related_event_id": reminder.related_event_id,
                "sent_manually_at": reminder.sent_manually_at,
                "skipped_at": reminder.skipped_at,
                "created_at": reminder.created_at,
                "updated_at": reminder.updated_at,
            },
            contact=contact_data,
            template=template_dict,
        )
    except SQLAlchemyError:
        db.rollback()

        if not allow_duplicate:
            existing = find_mock_crm_reminder(
                channel=channel,
                contact_id=contact_data["id"],
                reminder_type=reminder_type,
                related_event_id=related_event_id,
                related_order_id=related_order_id,
            )
            if existing:
                template = get_mock_crm_message_template(existing["template_id"]) if existing.get("template_id") else None
                return _serialize_reminder(existing, contact=contact_data, template=template)

        template = get_mock_crm_message_template(template_id) if template_id is not None else None
        if template is None:
            template = next(
                (
                    entry
                    for entry in list_mock_crm_message_templates()
                    if entry["channel"] == channel
                    and entry["reminder_type"] == reminder_type
                    and bool(entry.get("is_active", True))
                ),
                None,
            )
        rendered = (
            render_message_template(template, contact_data, context)
            if template
            else {"rendered_subject": rendered_subject, "rendered_body": rendered_body}
        )

        reminder = create_mock_crm_reminder(
            {
                "contact_id": contact_data["id"],
                "channel": channel,
                "reminder_type": reminder_type,
                "status": "ready" if scheduled_at <= datetime.now(timezone.utc) else "pending",
                "scheduled_for": scheduled_at,
                "template_id": template["id"] if template else template_id,
                "rendered_subject": rendered_subject if template is None else rendered["rendered_subject"],
                "rendered_body": rendered_body if template is None and rendered_body is not None else str(rendered["rendered_body"] or ""),
                "related_order_id": related_order_id,
                "related_event_id": related_event_id,
            }
        )
        return _serialize_reminder(reminder, contact=contact_data, template=template)


def create_skin_quiz_followup_reminder(
    db: Session,
    contact: CRMContact | dict[str, Any],
    *,
    hours: int = 1,
    related_event_id: int | None = None,
    scheduled_from: datetime | None = None,
) -> dict[str, Any] | None:
    contact_data = _contact_to_dict(contact)
    if not contact_data.get("accepted_marketing") or not contact_data.get("whatsapp"):
        return None

    base_time = _normalize_datetime(scheduled_from)
    return create_reminder(
        db,
        contact=contact_data,
        reminder_type="skin_quiz_follow_up",
        channel="whatsapp",
        scheduled_for=base_time + timedelta(hours=hours),
        related_event_id=related_event_id,
        context={"store_name": "Skin Hearten"},
    )


def create_post_purchase_reminder_from_order(
    db: Session,
    contact: CRMContact | dict[str, Any],
    order: dict[str, Any],
    *,
    hours: int = 48,
) -> list[dict[str, Any]]:
    contact_data = _contact_to_dict(contact)
    if not contact_data.get("accepted_marketing") or not contact_data.get("whatsapp"):
        return []

    order_created_at = _normalize_datetime(order.get("created_at"))
    reminder = create_reminder(
        db,
        contact=contact_data,
        reminder_type="post_purchase",
        channel="whatsapp",
        scheduled_for=order_created_at + timedelta(hours=hours),
        related_order_id=order.get("id"),
        context={
            "order_number": order.get("order_number") or "",
            "last_order_date": order_created_at.date().isoformat(),
            "store_name": "Skin Hearten",
        },
    )
    return [reminder] if reminder else []


def create_repurchase_reminder_from_order(
    db: Session,
    contact: CRMContact | dict[str, Any],
    order: dict[str, Any],
    *,
    days: int = 30,
) -> list[dict[str, Any]]:
    contact_data = _contact_to_dict(contact)
    if not contact_data.get("accepted_marketing"):
        return []

    order_created_at = _normalize_datetime(order.get("created_at"))
    reminders: list[dict[str, Any]] = []
    context = {
        "order_number": order.get("order_number") or "",
        "last_order_date": order_created_at.date().isoformat(),
        "store_name": "Skin Hearten",
    }

    if contact_data.get("whatsapp"):
        whatsapp_reminder = create_reminder(
            db,
            contact=contact_data,
            reminder_type="repurchase_30_days",
            channel="whatsapp",
            scheduled_for=order_created_at + timedelta(days=days),
            related_order_id=order.get("id"),
            context=context,
        )
        if whatsapp_reminder:
            reminders.append(whatsapp_reminder)

    if contact_data.get("email"):
        email_reminder = create_reminder(
            db,
            contact=contact_data,
            reminder_type="repurchase_30_days",
            channel="email",
            scheduled_for=order_created_at + timedelta(days=days),
            related_order_id=order.get("id"),
            context=context,
        )
        if email_reminder:
            reminders.append(email_reminder)

    return reminders


def list_contact_reminders(
    db: Session,
    contact_id: int,
    *,
    limit: int = 8,
) -> list[dict[str, Any]]:
    reminders = list_crm_reminders(db, contact_id=contact_id)
    return reminders[:limit]


def list_crm_reminders(
    db: Session,
    *,
    channel: str | None = None,
    contact_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    reminder_type: str | None = None,
    search: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    create_default_message_templates_if_missing(db)
    now = datetime.now(timezone.utc)
    start, end = _build_date_range(date_from, date_to)

    try:
        _ensure_crm_reminder_tables()
        _ensure_ready_status_db(db, now)
        query = db.query(CRMReminder).order_by(asc(CRMReminder.scheduled_for))

        if channel:
            query = query.filter(CRMReminder.channel == channel)
        if contact_id is not None:
            query = query.filter(CRMReminder.contact_id == contact_id)
        if reminder_type:
            query = query.filter(CRMReminder.reminder_type == reminder_type)
        if status:
            query = query.filter(CRMReminder.status == status)
        if start:
            query = query.filter(CRMReminder.scheduled_for >= start)
        if end:
            query = query.filter(CRMReminder.scheduled_for < end)

        reminders = query.all()
        serialized: list[dict[str, Any]] = []
        normalized_search = search.strip().lower() if search else None
        for reminder in reminders:
            contact = db.query(CRMContact).filter(CRMContact.id == reminder.contact_id).first()
            if not contact:
                continue
            template = db.query(CRMMessageTemplate).filter(CRMMessageTemplate.id == reminder.template_id).first() if reminder.template_id else None
            reminder_data = _serialize_reminder(
                {
                    "id": reminder.id,
                    "channel": str(reminder.channel),
                    "reminder_type": str(reminder.reminder_type),
                    "status": str(reminder.status),
                    "scheduled_for": reminder.scheduled_for,
                    "template_id": reminder.template_id,
                    "rendered_subject": reminder.rendered_subject,
                    "rendered_body": reminder.rendered_body,
                    "related_order_id": reminder.related_order_id,
                    "related_event_id": reminder.related_event_id,
                    "sent_manually_at": reminder.sent_manually_at,
                    "skipped_at": reminder.skipped_at,
                    "created_at": reminder.created_at,
                    "updated_at": reminder.updated_at,
                },
                contact=_contact_to_dict(contact),
                template=_template_to_dict(template) if template else None,
            )
            if normalized_search:
                haystack = " ".join(
                    [
                        reminder_data["contact"]["first_name"],
                        reminder_data["contact"].get("last_name") or "",
                        reminder_data["contact"].get("email") or "",
                        reminder_data["contact"].get("whatsapp") or "",
                        reminder_data["rendered_body"],
                    ]
                ).lower()
                if normalized_search not in haystack:
                    continue
            serialized.append(reminder_data)

        return serialized
    except SQLAlchemyError:
        db.rollback()
        _ensure_ready_status_mock(now)
        reminders = list_mock_crm_reminders(
            channel=channel,
            contact_id=contact_id,
            date_from=start,
            date_to=end,
            reminder_type=reminder_type,
            search=search,
            status=status,
        )
        serialized: list[dict[str, Any]] = []
        for reminder in reminders:
            contact = get_mock_crm_contact(reminder["contact_id"])
            if not contact:
                continue
            template = get_mock_crm_message_template(reminder["template_id"]) if reminder.get("template_id") else None
            serialized.append(_serialize_reminder(reminder, contact=contact, template=template))
        return serialized


def get_crm_reminder_detail(db: Session, reminder_id: int) -> dict[str, Any] | None:
    reminders = list_crm_reminders(db)
    return next((reminder for reminder in reminders if reminder["id"] == reminder_id), None)


def update_crm_reminder_entry(
    db: Session,
    reminder_id: int,
    payload: CRMReminderUpdate,
) -> dict[str, Any] | None:
    changes: dict[str, Any] = {}
    if "rendered_subject" in payload.model_fields_set:
        changes["rendered_subject"] = payload.rendered_subject
    if "rendered_body" in payload.model_fields_set:
        changes["rendered_body"] = payload.rendered_body
    if "scheduled_for" in payload.model_fields_set:
        changes["scheduled_for"] = payload.scheduled_for
    if "status" in payload.model_fields_set:
        changes["status"] = payload.status

    try:
        _ensure_crm_reminder_tables()
        reminder = db.query(CRMReminder).filter(CRMReminder.id == reminder_id).first()
        if not reminder:
            return None

        for field_name, field_value in changes.items():
            setattr(reminder, field_name, field_value)

        if "scheduled_for" in changes and "status" not in changes:
            reminder.status = (
                CRMReminderStatus.READY
                if _normalize_datetime(reminder.scheduled_for) <= datetime.now(timezone.utc)
                else CRMReminderStatus.PENDING
            )

        db.add(reminder)
        db.commit()
        return get_crm_reminder_detail(db, reminder_id)
    except SQLAlchemyError:
        db.rollback()
        reminder = get_mock_crm_reminder(reminder_id)
        if not reminder:
            return None

        scheduled_for = changes.get("scheduled_for") or reminder.get("scheduled_for")
        if "scheduled_for" in changes and "status" not in changes:
            changes["status"] = "ready" if _normalize_datetime(scheduled_for) <= datetime.now(timezone.utc) else "pending"

        update_mock_crm_reminder(reminder_id, changes)
        return get_crm_reminder_detail(db, reminder_id)


def mark_reminder_sent_manual(db: Session, reminder_id: int) -> dict[str, Any] | None:
    now = datetime.now(timezone.utc)
    payload = CRMReminderUpdate(status="sent_manual")
    updated = update_crm_reminder_entry(db, reminder_id, payload)
    if not updated:
        return None

    try:
        _ensure_crm_reminder_tables()
        reminder = db.query(CRMReminder).filter(CRMReminder.id == reminder_id).first()
        if reminder:
            reminder.sent_manually_at = now
            db.add(reminder)
            db.commit()
        return get_crm_reminder_detail(db, reminder_id)
    except SQLAlchemyError:
        db.rollback()
        update_mock_crm_reminder(reminder_id, {"sent_manually_at": now, "status": "sent_manual"})
        return get_crm_reminder_detail(db, reminder_id)


def skip_reminder(db: Session, reminder_id: int) -> dict[str, Any] | None:
    now = datetime.now(timezone.utc)
    payload = CRMReminderUpdate(status="skipped")
    updated = update_crm_reminder_entry(db, reminder_id, payload)
    if not updated:
        return None

    try:
        _ensure_crm_reminder_tables()
        reminder = db.query(CRMReminder).filter(CRMReminder.id == reminder_id).first()
        if reminder:
            reminder.skipped_at = now
            db.add(reminder)
            db.commit()
        return get_crm_reminder_detail(db, reminder_id)
    except SQLAlchemyError:
        db.rollback()
        update_mock_crm_reminder(reminder_id, {"skipped_at": now, "status": "skipped"})
        return get_crm_reminder_detail(db, reminder_id)


def list_crm_message_templates(db: Session) -> list[dict[str, Any]]:
    create_default_message_templates_if_missing(db)
    try:
        _ensure_crm_reminder_tables()
        templates = db.query(CRMMessageTemplate).order_by(CRMMessageTemplate.created_at.asc()).all()
        return [_serialize_template(_template_to_dict(template)) for template in templates]
    except SQLAlchemyError:
        db.rollback()
        return [_serialize_template(template) for template in list_mock_crm_message_templates()]


def update_crm_message_template_entry(
    db: Session,
    template_id: int,
    payload: CRMMessageTemplateUpdate,
) -> dict[str, Any] | None:
    changes: dict[str, Any] = {}
    if "subject" in payload.model_fields_set:
        changes["subject"] = payload.subject
    if "body" in payload.model_fields_set:
        changes["body"] = payload.body
    if "is_active" in payload.model_fields_set:
        changes["is_active"] = payload.is_active

    try:
        _ensure_crm_reminder_tables()
        template = db.query(CRMMessageTemplate).filter(CRMMessageTemplate.id == template_id).first()
        if not template:
            return None

        for field_name, field_value in changes.items():
            setattr(template, field_name, field_value)

        db.add(template)
        db.commit()
        db.refresh(template)
        return _serialize_template(_template_to_dict(template))
    except SQLAlchemyError:
        db.rollback()
        template = update_mock_crm_message_template(template_id, changes)
        if not template:
            return None
        return _serialize_template(template)


def preview_message_template(
    db: Session,
    template_id: int,
    payload: CRMMessageTemplatePreviewRequest | None = None,
) -> dict[str, Any] | None:
    payload = payload or CRMMessageTemplatePreviewRequest()
    templates = list_crm_message_templates(db)
    template = next((entry for entry in templates if entry["id"] == template_id), None)
    if not template:
        return None

    contact: dict[str, Any]
    if payload.contact_id is not None:
        try:
            contact_model = db.query(CRMContact).filter(CRMContact.id == payload.contact_id).first()
            contact = _contact_to_dict(contact_model) if contact_model else _contact_to_dict(get_mock_crm_contact(payload.contact_id) or {"id": 0})
        except SQLAlchemyError:
            db.rollback()
            contact = _contact_to_dict(get_mock_crm_contact(payload.contact_id) or {"id": 0})
    else:
        contact = {
            "id": 0,
            "first_name": "Ana",
            "last_name": "Demo",
            "email": "ana@example.com",
            "whatsapp": "5512345678",
            "main_goal": "manchas",
            "skin_type": "seca",
            "accepted_marketing": True,
        }

    preview_template = {
        **template,
        "subject": payload.subject if "subject" in payload.model_fields_set else template.get("subject"),
        "body": payload.body if "body" in payload.model_fields_set else template.get("body"),
    }
    rendered = render_message_template(
        preview_template,
        contact,
        {
            "order_number": payload.context.get("order_number") if payload.context else "SH-1043",
            "last_order_date": payload.context.get("last_order_date") if payload.context else "2026-06-22",
            "store_name": payload.context.get("store_name") if payload.context else "Skin Hearten",
            **(payload.context or {}),
        },
    )
    return {
        "rendered_subject": rendered["rendered_subject"],
        "rendered_body": rendered["rendered_body"],
        "variables": list(_TEMPLATE_VARIABLES),
    }


def create_manual_reminder_for_contact(
    db: Session,
    contact_id: int,
    payload: CRMReminderCreate,
) -> dict[str, Any] | None:
    try:
        contact_model = db.query(CRMContact).filter(CRMContact.id == contact_id).first()
        contact = _contact_to_dict(contact_model) if contact_model else None
    except SQLAlchemyError:
        db.rollback()
        contact = get_mock_crm_contact(contact_id)

    if not contact:
        return None

    return create_reminder(
        db,
        contact=contact,
        reminder_type="manual",
        channel=payload.channel,
        scheduled_for=payload.scheduled_for,
        allow_duplicate=True,
        rendered_subject=payload.rendered_subject,
        rendered_body=payload.rendered_body,
    )
