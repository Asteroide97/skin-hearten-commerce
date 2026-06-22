from __future__ import annotations

from collections import Counter
from datetime import date, datetime, time, timedelta
from collections.abc import Mapping
from typing import Any

from sqlalchemy import desc, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import Base, SkinQuizLead
from app.schemas.skin_quiz import SkinQuizLeadCreate, SkinQuizLeadUpdate
from app.services.crm import upsert_contact_from_skin_quiz_lead
from app.services.mock_store import (
    create_skin_quiz_lead as create_mock_skin_quiz_lead,
    get_skin_quiz_lead as get_mock_skin_quiz_lead,
    list_skin_quiz_leads as list_mock_skin_quiz_leads,
    update_skin_quiz_lead as update_mock_skin_quiz_lead,
)

_skin_quiz_table_initialized = False
_goal_labels = {
    "manchas": "Manchas",
    "acne": "Acne",
    "lineas_expresion": "Lineas de expresion",
    "hidratacion": "Hidratacion",
    "luminosidad": "Luminosidad",
    "proteccion_solar": "Proteccion solar",
}
_skin_type_labels = {
    "seca": "Seca",
    "mixta": "Mixta",
    "grasa": "Grasa",
    "sensible": "Sensible",
    "no_segura": "No estoy segura",
}
_age_range_labels = {
    "18_24": "18 a 24",
    "25_34": "25 a 34",
    "35_44": "35 a 44",
    "45_plus": "45+",
}
_recent_leads_limit = 8


def _ensure_skin_quiz_table() -> None:
    global _skin_quiz_table_initialized

    if _skin_quiz_table_initialized:
        return

    Base.metadata.create_all(bind=engine, tables=[SkinQuizLead.__table__])
    _skin_quiz_table_initialized = True


def _build_date_range(
    date_from: date | None,
    date_to: date | None,
) -> tuple[datetime | None, datetime | None]:
    start = datetime.combine(date_from, time.min) if date_from else None
    end = datetime.combine(date_to + timedelta(days=1), time.min) if date_to else None
    return start, end


def _normalize_goal(goal: str | None) -> str:
    if not goal:
        return "Sin definir"
    return _goal_labels.get(goal, goal.replace("_", " ").title())


def _normalize_skin_type(skin_type: str | None) -> str:
    if not skin_type:
        return "Sin definir"
    return _skin_type_labels.get(skin_type, skin_type.replace("_", " ").title())


def _normalize_age_range(age_range: str | None) -> str:
    if not age_range:
        return "Sin definir"
    return _age_range_labels.get(age_range, age_range.replace("_", " ").title())


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=datetime.now().astimezone().tzinfo)
    return value.astimezone(datetime.now().astimezone().tzinfo)


def _serialize_counter(counter: Counter[str], key_name: str) -> list[dict[str, Any]]:
    return [
        {key_name: label, "count": count}
        for label, count in sorted(counter.items(), key=lambda item: (-item[1], item[0]))
    ]


def _summarize_result(summary: str | None, max_length: int = 160) -> str:
    normalized = " ".join((summary or "").split())
    if not normalized:
        return "Sin resumen disponible."
    if len(normalized) <= max_length:
        return normalized
    return f"{normalized[: max_length - 1].rstrip()}..."


def _lead_to_dict(lead: SkinQuizLead) -> dict[str, Any]:
    return {
        "id": lead.id,
        "name": lead.name,
        "whatsapp": lead.whatsapp,
        "email": lead.email,
        "accepted_marketing": lead.accepted_marketing,
        "status": lead.status,
        "internal_notes": lead.internal_notes,
        "last_contacted_at": lead.last_contacted_at,
        "answers_json": lead.answers_json or {},
        "result_json": lead.result_json or {},
        "source": lead.source,
        "user_agent": lead.user_agent,
        "created_at": lead.created_at,
    }


def _serialize_summary(lead: Mapping[str, Any]) -> dict[str, Any]:
    answers = lead.get("answers_json") or {}
    result = lead.get("result_json") or {}

    return {
        "id": lead["id"],
        "name": lead["name"],
        "whatsapp": lead["whatsapp"],
        "email": lead.get("email"),
        "accepted_marketing": bool(lead.get("accepted_marketing")),
        "status": lead.get("status") or "new",
        "internal_notes": lead.get("internal_notes"),
        "last_contacted_at": lead.get("last_contacted_at"),
        "source": lead.get("source") or "unknown",
        "created_at": lead["created_at"],
        "result_summary": _summarize_result(result.get("summary")),
        "primary_goal": _normalize_goal(answers.get("goal")),
        "skin_type": _normalize_skin_type(answers.get("skinType")),
    }


def _serialize_detail(lead: Mapping[str, Any]) -> dict[str, Any]:
    summary = _serialize_summary(lead)
    summary.update(
        {
            "answers_json": lead.get("answers_json") or {},
            "result_json": lead.get("result_json") or {},
            "user_agent": lead.get("user_agent"),
        }
    )
    return summary


def _build_skin_quiz_analytics(leads: list[Mapping[str, Any]]) -> dict[str, Any]:
    now = datetime.now().astimezone()
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_week = start_of_today - timedelta(days=start_of_today.weekday())
    start_of_month = start_of_today.replace(day=1)

    normalized_leads = sorted(
        [
            {
                **lead,
                "created_at": _normalize_datetime(lead["created_at"]),
            }
            for lead in leads
        ],
        key=lambda lead: lead["created_at"],
        reverse=True,
    )

    goal_counter: Counter[str] = Counter()
    skin_type_counter: Counter[str] = Counter()
    age_range_counter: Counter[str] = Counter()
    status_counter: Counter[str] = Counter()
    source_counter: Counter[str] = Counter()

    leads_today = 0
    leads_this_week = 0
    leads_this_month = 0

    for lead in normalized_leads:
        answers = lead.get("answers_json") or {}
        created_at = lead["created_at"]

        goal_counter[_normalize_goal(answers.get("goal"))] += 1
        skin_type_counter[_normalize_skin_type(answers.get("skinType"))] += 1
        age_range_counter[_normalize_age_range(answers.get("ageRange"))] += 1
        status_counter[str(lead.get("status") or "new")] += 1
        source_counter[str(lead.get("source") or "unknown")] += 1

        if created_at >= start_of_today:
            leads_today += 1
        if created_at >= start_of_week:
            leads_this_week += 1
        if created_at >= start_of_month:
            leads_this_month += 1

    recent_leads = [
        {
            "id": lead["id"],
            "name": lead["name"],
            "whatsapp": lead["whatsapp"],
            "goal": _normalize_goal((lead.get("answers_json") or {}).get("goal")),
            "skin_type": _normalize_skin_type((lead.get("answers_json") or {}).get("skinType")),
            "status": str(lead.get("status") or "new"),
            "created_at": lead["created_at"],
        }
        for lead in normalized_leads[:_recent_leads_limit]
    ]

    return {
        "total_leads": len(normalized_leads),
        "leads_today": leads_today,
        "leads_this_week": leads_this_week,
        "leads_this_month": leads_this_month,
        "completion_rate_estimate": None,
        "top_goals": _serialize_counter(goal_counter, "goal"),
        "top_skin_types": _serialize_counter(skin_type_counter, "skin_type"),
        "top_age_ranges": _serialize_counter(age_range_counter, "age_range"),
        "status_breakdown": _serialize_counter(status_counter, "status"),
        "source_breakdown": _serialize_counter(source_counter, "source"),
        "recent_leads": recent_leads,
    }


def create_skin_quiz_lead(
    db: Session,
    payload: SkinQuizLeadCreate,
    user_agent: str | None = None,
) -> Mapping[str, Any]:
    lead_response: Mapping[str, Any]
    try:
        _ensure_skin_quiz_table()
        lead = SkinQuizLead(
            name=payload.name,
            whatsapp=payload.whatsapp,
            email=payload.email,
            accepted_marketing=payload.accepted_marketing,
            status="new",
            answers_json=payload.answers,
            result_json=payload.quiz_result,
            source=payload.source,
            user_agent=user_agent,
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
        lead_response = {
            "id": lead.id,
            "created_at": lead.created_at,
        }
    except SQLAlchemyError:
        db.rollback()
        lead_response = create_mock_skin_quiz_lead(
            {
                "name": payload.name,
                "whatsapp": payload.whatsapp,
                "email": payload.email,
                "accepted_marketing": payload.accepted_marketing,
                "status": "new",
                "answers_json": payload.answers,
                "result_json": payload.quiz_result,
                "source": payload.source,
                "user_agent": user_agent,
            }
        )

    try:
        upsert_contact_from_skin_quiz_lead(
            db,
            payload=payload,
            lead_id=int(lead_response["id"]),
        )
    except Exception:
        db.rollback()

    return lead_response


def list_skin_quiz_lead_summaries(
    db: Session,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    status: str | None = None,
    source: str | None = None,
) -> list[dict[str, Any]]:
    start, end = _build_date_range(date_from, date_to)

    try:
        _ensure_skin_quiz_table()
        query = db.query(SkinQuizLead)

        if source:
            query = query.filter(SkinQuizLead.source == source)
        if status:
            query = query.filter(SkinQuizLead.status == status)
        if start:
            query = query.filter(SkinQuizLead.created_at >= start)
        if end:
            query = query.filter(SkinQuizLead.created_at < end)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    SkinQuizLead.name.ilike(pattern),
                    SkinQuizLead.whatsapp.ilike(pattern),
                    SkinQuizLead.email.ilike(pattern),
                )
            )

        leads = query.order_by(desc(SkinQuizLead.created_at)).all()
        return [_serialize_summary(_lead_to_dict(lead)) for lead in leads]
    except SQLAlchemyError:
        db.rollback()
        return [
            _serialize_summary(lead)
            for lead in list_mock_skin_quiz_leads(
                date_from=start,
                date_to=end,
                search=search,
                status=status,
                source=source,
            )
        ]


def get_skin_quiz_lead_detail(db: Session, lead_id: int) -> dict[str, Any] | None:
    try:
        _ensure_skin_quiz_table()
        lead = db.query(SkinQuizLead).filter(SkinQuizLead.id == lead_id).first()
        if not lead:
            return None
        return _serialize_detail(_lead_to_dict(lead))
    except SQLAlchemyError:
        db.rollback()
        lead = get_mock_skin_quiz_lead(lead_id)
        if not lead:
            return None
        return _serialize_detail(lead)


def update_skin_quiz_lead(
    db: Session,
    lead_id: int,
    payload: SkinQuizLeadUpdate,
) -> dict[str, Any] | None:
    changes: dict[str, Any] = {}
    if "status" in payload.model_fields_set:
        changes["status"] = payload.status
    if "internal_notes" in payload.model_fields_set:
        changes["internal_notes"] = payload.internal_notes
    if "last_contacted_at" in payload.model_fields_set:
        changes["last_contacted_at"] = payload.last_contacted_at

    try:
        _ensure_skin_quiz_table()
        lead = db.query(SkinQuizLead).filter(SkinQuizLead.id == lead_id).first()
        if not lead:
            return None

        for field_name, field_value in changes.items():
            setattr(lead, field_name, field_value)

        db.add(lead)
        db.commit()
        db.refresh(lead)
        return _serialize_detail(_lead_to_dict(lead))
    except SQLAlchemyError:
        db.rollback()
        lead = update_mock_skin_quiz_lead(lead_id, changes)
        if not lead:
            return None
        return _serialize_detail(lead)


def get_skin_quiz_analytics(db: Session) -> dict[str, Any]:
    try:
        _ensure_skin_quiz_table()
        leads = [
            _lead_to_dict(lead)
            for lead in db.query(SkinQuizLead).order_by(desc(SkinQuizLead.created_at)).all()
        ]
        return _build_skin_quiz_analytics(leads)
    except SQLAlchemyError:
        db.rollback()
        return _build_skin_quiz_analytics(list_mock_skin_quiz_leads())
