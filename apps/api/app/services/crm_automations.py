from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import (
    Base,
    CRMAutomationRule,
    CRMAutomationRun,
    CRMContact,
    CRMEvent,
    CRMTask,
)
from app.models.enums import CRMAutomationRunStatus, CRMTaskStatus
from app.schemas.crm import CRMAutomationRuleUpdate
from app.services.mock_store import (
    create_crm_automation_rule as create_mock_crm_automation_rule,
    create_crm_automation_run as create_mock_crm_automation_run,
    create_crm_task as create_mock_crm_task,
    get_crm_automation_rule as get_mock_crm_automation_rule,
    get_crm_automation_rule_by_name as get_mock_crm_automation_rule_by_name,
    get_crm_contact as get_mock_crm_contact,
    list_crm_automation_rules as list_mock_crm_automation_rules,
    list_crm_automation_runs as list_mock_crm_automation_runs,
    list_crm_contacts as list_mock_crm_contacts,
    update_crm_automation_rule as update_mock_crm_automation_rule,
    update_crm_automation_run as update_mock_crm_automation_run,
)

_crm_automation_tables_initialized = False

DEFAULT_AUTOMATION_RULES: list[dict[str, Any]] = [
    {
        "name": "Skin Quiz follow-up",
        "trigger_type": "skin_quiz_completed",
        "delay_hours": 1,
        "task_type": "follow_up",
        "task_title_template": "Dar seguimiento a {{first_name}} por su rutina recomendada",
        "is_active": True,
    },
    {
        "name": "Checkout follow-up",
        "trigger_type": "checkout_completed",
        "delay_hours": 24,
        "task_type": "post_purchase",
        "task_title_template": "Confirmar satisfaccion de {{first_name}} despues de su compra",
        "is_active": True,
    },
    {
        "name": "Recompra",
        "trigger_type": "checkout_completed",
        "delay_hours": 24 * 30,
        "task_type": "repurchase",
        "task_title_template": "Sugerir recompra de rutina a {{first_name}}",
        "is_active": True,
    },
    {
        "name": "Cliente inactivo",
        "trigger_type": "customer_inactive",
        "delay_hours": 24 * 45,
        "task_type": "follow_up",
        "task_title_template": "Reactivar cliente {{first_name}}",
        "is_active": True,
    },
]


def _ensure_crm_automation_tables() -> None:
    global _crm_automation_tables_initialized

    if _crm_automation_tables_initialized:
        return

    Base.metadata.create_all(
        bind=engine,
        tables=[
            CRMContact.__table__,
            CRMEvent.__table__,
            CRMTask.__table__,
            CRMAutomationRule.__table__,
            CRMAutomationRun.__table__,
        ],
    )
    _crm_automation_tables_initialized = True


def _normalize_datetime(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _contact_name(first_name: str | None, last_name: str | None) -> str:
    return " ".join([part for part in [first_name or "Contacto", last_name] if part]).strip()


def _render_task_title(template: str, contact: dict[str, Any]) -> str:
    return (
        template.replace("{{first_name}}", str(contact.get("first_name") or "Contacto"))
        .replace("{{last_name}}", str(contact.get("last_name") or ""))
        .replace("{{name}}", _contact_name(contact.get("first_name"), contact.get("last_name")))
        .strip()
    )


def _rule_to_dict(rule: CRMAutomationRule) -> dict[str, Any]:
    return {
        "id": rule.id,
        "name": rule.name,
        "trigger_type": str(rule.trigger_type),
        "delay_hours": int(rule.delay_hours),
        "task_type": str(rule.task_type),
        "task_title_template": rule.task_title_template,
        "is_active": bool(rule.is_active),
        "created_at": rule.created_at,
        "updated_at": rule.updated_at,
    }


def _serialize_rule(rule: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": int(rule["id"]),
        "name": str(rule["name"]),
        "trigger_type": str(rule["trigger_type"]),
        "delay_hours": int(rule["delay_hours"]),
        "task_type": str(rule["task_type"]),
        "task_title_template": str(rule["task_title_template"]),
        "is_active": bool(rule.get("is_active", True)),
        "created_at": _normalize_datetime(rule.get("created_at")),
        "updated_at": _normalize_datetime(rule.get("updated_at")),
    }


def _serialize_run(
    run: dict[str, Any],
    *,
    contact: dict[str, Any],
    rule: dict[str, Any],
) -> dict[str, Any]:
    created_at = _normalize_datetime(run.get("created_at"))
    due_at = created_at + timedelta(hours=int(rule.get("delay_hours") or 0))
    return {
        "id": int(run["id"]),
        "rule_id": int(rule["id"]),
        "rule_name": str(rule["name"]),
        "contact_id": int(contact["id"]),
        "contact_name": _contact_name(contact.get("first_name"), contact.get("last_name")),
        "source_event_id": run.get("source_event_id"),
        "trigger_type": str(rule["trigger_type"]),
        "task_type": str(rule["task_type"]),
        "due_at": due_at,
        "status": str(run.get("status") or "pending"),
        "executed_at": _normalize_datetime(run.get("executed_at")) if run.get("executed_at") else None,
        "error_message": run.get("error_message"),
        "created_at": created_at,
    }


def _find_db_rule_by_name(db: Session, name: str) -> CRMAutomationRule | None:
    return db.query(CRMAutomationRule).filter(CRMAutomationRule.name == name).first()


def _find_db_run(
    db: Session,
    *,
    contact_id: int,
    rule_id: int,
    source_event_id: int | None,
) -> CRMAutomationRun | None:
    return (
        db.query(CRMAutomationRun)
        .filter(
            CRMAutomationRun.contact_id == contact_id,
            CRMAutomationRun.rule_id == rule_id,
            CRMAutomationRun.source_event_id == source_event_id,
        )
        .first()
    )


def create_default_automation_rules_if_missing(db: Session) -> list[dict[str, Any]]:
    try:
        _ensure_crm_automation_tables()
        changed = False

        for rule_data in DEFAULT_AUTOMATION_RULES:
            if _find_db_rule_by_name(db, rule_data["name"]):
                continue

            db.add(CRMAutomationRule(**rule_data))
            changed = True

        if changed:
            db.commit()

        rules = db.query(CRMAutomationRule).order_by(CRMAutomationRule.created_at.asc()).all()
        return [_serialize_rule(_rule_to_dict(rule)) for rule in rules]
    except SQLAlchemyError:
        db.rollback()
        for rule_data in DEFAULT_AUTOMATION_RULES:
            if get_mock_crm_automation_rule_by_name(rule_data["name"]):
                continue
            create_mock_crm_automation_rule(rule_data)
        return [_serialize_rule(rule) for rule in list_mock_crm_automation_rules()]


def evaluate_automations_for_event(db: Session, event: dict[str, Any]) -> list[dict[str, Any]]:
    contact_id = event.get("contact_id")
    event_type = event.get("event_type")
    event_id = event.get("id")

    if not contact_id or not event_type:
        return []

    create_default_automation_rules_if_missing(db)
    event_created_at = _normalize_datetime(event.get("created_at"))
    created_runs: list[dict[str, Any]] = []

    try:
        _ensure_crm_automation_tables()
        contact = db.query(CRMContact).filter(CRMContact.id == contact_id).first()
        if not contact:
            return []

        rules = (
            db.query(CRMAutomationRule)
            .filter(
                CRMAutomationRule.is_active.is_(True),
                CRMAutomationRule.trigger_type == event_type,
            )
            .order_by(CRMAutomationRule.id.asc())
            .all()
        )

        if not rules:
            return []

        for rule in rules:
            if _find_db_run(db, contact_id=contact.id, rule_id=rule.id, source_event_id=event_id):
                continue

            task_due_at = event_created_at + timedelta(hours=int(rule.delay_hours or 0))
            task = CRMTask(
                contact_id=contact.id,
                title=_render_task_title(rule.task_title_template, {"first_name": contact.first_name, "last_name": contact.last_name}),
                due_at=task_due_at,
                status=CRMTaskStatus.PENDING,
                task_type=rule.task_type,
            )
            run = CRMAutomationRun(
                rule_id=rule.id,
                contact_id=contact.id,
                source_event_id=event_id,
                status=CRMAutomationRunStatus.PENDING,
                created_at=event_created_at,
            )
            db.add(task)
            db.add(run)
            db.flush()
            created_runs.append(
                _serialize_run(
                    {
                        "id": run.id,
                        "source_event_id": run.source_event_id,
                        "status": str(run.status),
                        "executed_at": run.executed_at,
                        "error_message": run.error_message,
                        "created_at": run.created_at,
                    },
                    contact={
                        "id": contact.id,
                        "first_name": contact.first_name,
                        "last_name": contact.last_name,
                    },
                    rule=_rule_to_dict(rule),
                )
            )

        if created_runs:
            db.commit()
        else:
            db.rollback()

        return created_runs
    except SQLAlchemyError:
        db.rollback()
        contact = get_mock_crm_contact(int(contact_id))
        if not contact:
            return []

        rules = [
            rule
            for rule in list_mock_crm_automation_rules()
            if bool(rule.get("is_active", True)) and str(rule.get("trigger_type")) == str(event_type)
        ]
        for rule in rules:
            if get_mock_crm_automation_rule(rule["id"]) is None:
                continue
            if any(
                run["contact_id"] == contact["id"]
                and run["rule_id"] == rule["id"]
                and run.get("source_event_id") == event_id
                for run in list_mock_crm_automation_runs()
            ):
                continue

            task_due_at = event_created_at + timedelta(hours=int(rule.get("delay_hours") or 0))
            create_mock_crm_task(
                {
                    "contact_id": contact["id"],
                    "title": _render_task_title(rule["task_title_template"], contact),
                    "due_at": task_due_at,
                    "status": "pending",
                    "task_type": rule["task_type"],
                }
            )
            run = create_mock_crm_automation_run(
                {
                    "rule_id": rule["id"],
                    "contact_id": contact["id"],
                    "source_event_id": event_id,
                    "status": "pending",
                    "created_at": event_created_at,
                }
            )
            created_runs.append(_serialize_run(run, contact=contact, rule=rule))

        return created_runs


def _ensure_customer_inactive_runs_db(db: Session, now: datetime) -> None:
    inactive_rules = (
        db.query(CRMAutomationRule)
        .filter(
            CRMAutomationRule.is_active.is_(True),
            CRMAutomationRule.trigger_type == "customer_inactive",
        )
        .all()
    )
    if not inactive_rules:
        return

    contacts = db.query(CRMContact).all()
    for rule in inactive_rules:
        for contact in contacts:
            if not contact.last_seen_at:
                continue

            due_at = _normalize_datetime(contact.last_seen_at) + timedelta(hours=int(rule.delay_hours or 0))
            if due_at > now:
                continue

            existing_run = (
                db.query(CRMAutomationRun)
                .filter(
                    CRMAutomationRun.rule_id == rule.id,
                    CRMAutomationRun.contact_id == contact.id,
                    CRMAutomationRun.source_event_id.is_(None),
                    CRMAutomationRun.created_at >= contact.last_seen_at,
                )
                .first()
            )
            if existing_run:
                continue

            task = CRMTask(
                contact_id=contact.id,
                title=_render_task_title(rule.task_title_template, {"first_name": contact.first_name, "last_name": contact.last_name}),
                due_at=due_at,
                status=CRMTaskStatus.PENDING,
                task_type=rule.task_type,
            )
            run = CRMAutomationRun(
                rule_id=rule.id,
                contact_id=contact.id,
                source_event_id=None,
                status=CRMAutomationRunStatus.PENDING,
                created_at=_normalize_datetime(contact.last_seen_at),
            )
            db.add(task)
            db.add(run)


def _ensure_customer_inactive_runs_mock(now: datetime) -> None:
    rules = [
        rule
        for rule in list_mock_crm_automation_rules()
        if bool(rule.get("is_active", True)) and str(rule.get("trigger_type")) == "customer_inactive"
    ]
    if not rules:
        return

    contacts = list_mock_crm_contacts()
    runs = list_mock_crm_automation_runs()
    for rule in rules:
        for contact in contacts:
            last_seen_at = contact.get("last_seen_at")
            if not last_seen_at:
                continue

            due_at = _normalize_datetime(last_seen_at) + timedelta(hours=int(rule.get("delay_hours") or 0))
            if due_at > now:
                continue

            existing_run = next(
                (
                    run
                    for run in runs
                    if run["rule_id"] == rule["id"]
                    and run["contact_id"] == contact["id"]
                    and run.get("source_event_id") is None
                    and _normalize_datetime(run.get("created_at")) >= _normalize_datetime(last_seen_at)
                ),
                None,
            )
            if existing_run:
                continue

            create_mock_crm_task(
                {
                    "contact_id": contact["id"],
                    "title": _render_task_title(rule["task_title_template"], contact),
                    "due_at": due_at,
                    "status": "pending",
                    "task_type": rule["task_type"],
                }
            )
            create_mock_crm_automation_run(
                {
                    "rule_id": rule["id"],
                    "contact_id": contact["id"],
                    "source_event_id": None,
                    "status": "pending",
                    "created_at": _normalize_datetime(last_seen_at),
                }
            )


def run_due_automation_tasks(db: Session, now: datetime | None = None) -> list[dict[str, Any]]:
    run_time = _normalize_datetime(now)
    create_default_automation_rules_if_missing(db)

    try:
        _ensure_crm_automation_tables()
        _ensure_customer_inactive_runs_db(db, run_time)
        db.flush()

        pending_runs = (
            db.query(CRMAutomationRun, CRMAutomationRule, CRMContact)
            .join(CRMAutomationRule, CRMAutomationRule.id == CRMAutomationRun.rule_id)
            .join(CRMContact, CRMContact.id == CRMAutomationRun.contact_id)
            .filter(CRMAutomationRun.status == CRMAutomationRunStatus.PENDING)
            .all()
        )

        updated_runs: list[dict[str, Any]] = []
        for run, rule, contact in pending_runs:
            due_at = _normalize_datetime(run.created_at) + timedelta(hours=int(rule.delay_hours or 0))
            if due_at > run_time:
                continue

            run.status = CRMAutomationRunStatus.EXECUTED
            run.executed_at = run_time
            db.add(run)
            updated_runs.append(
                _serialize_run(
                    {
                        "id": run.id,
                        "source_event_id": run.source_event_id,
                        "status": str(run.status),
                        "executed_at": run.executed_at,
                        "error_message": run.error_message,
                        "created_at": run.created_at,
                    },
                    contact={"id": contact.id, "first_name": contact.first_name, "last_name": contact.last_name},
                    rule=_rule_to_dict(rule),
                )
            )

        db.commit()
        return updated_runs
    except SQLAlchemyError:
        db.rollback()
        _ensure_customer_inactive_runs_mock(run_time)

        rules_by_id = {rule["id"]: rule for rule in list_mock_crm_automation_rules()}
        contacts_by_id = {contact["id"]: contact for contact in list_mock_crm_contacts()}
        updated_runs: list[dict[str, Any]] = []

        for run in list_mock_crm_automation_runs():
            if str(run.get("status") or "pending") != "pending":
                continue

            rule = rules_by_id.get(run["rule_id"])
            contact = contacts_by_id.get(run["contact_id"])
            if not rule or not contact:
                continue

            due_at = _normalize_datetime(run.get("created_at")) + timedelta(hours=int(rule.get("delay_hours") or 0))
            if due_at > run_time:
                continue

            updated_run = update_mock_crm_automation_run(
                run["id"],
                {
                    "status": "executed",
                    "executed_at": run_time,
                },
            )
            if updated_run:
                updated_runs.append(_serialize_run(updated_run, contact=contact, rule=rule))

        return updated_runs


def list_crm_automation_rules(db: Session) -> list[dict[str, Any]]:
    create_default_automation_rules_if_missing(db)
    try:
        _ensure_crm_automation_tables()
        rules = db.query(CRMAutomationRule).order_by(CRMAutomationRule.created_at.asc()).all()
        return [_serialize_rule(_rule_to_dict(rule)) for rule in rules]
    except SQLAlchemyError:
        db.rollback()
        return [_serialize_rule(rule) for rule in list_mock_crm_automation_rules()]


def update_crm_automation_rule_entry(
    db: Session,
    rule_id: int,
    payload: CRMAutomationRuleUpdate,
) -> dict[str, Any] | None:
    changes: dict[str, Any] = {}
    if "delay_hours" in payload.model_fields_set:
        changes["delay_hours"] = payload.delay_hours
    if "task_title_template" in payload.model_fields_set:
        changes["task_title_template"] = payload.task_title_template
    if "is_active" in payload.model_fields_set:
        changes["is_active"] = payload.is_active

    try:
        _ensure_crm_automation_tables()
        rule = db.query(CRMAutomationRule).filter(CRMAutomationRule.id == rule_id).first()
        if not rule:
            return None

        for field_name, field_value in changes.items():
            setattr(rule, field_name, field_value)

        db.add(rule)
        db.commit()
        db.refresh(rule)
        return _serialize_rule(_rule_to_dict(rule))
    except SQLAlchemyError:
        db.rollback()
        rule = update_mock_crm_automation_rule(rule_id, changes)
        if not rule:
            return None
        return _serialize_rule(rule)


def list_crm_automation_runs(db: Session, limit: int = 50) -> list[dict[str, Any]]:
    run_due_automation_tasks(db, datetime.now(timezone.utc))
    try:
        _ensure_crm_automation_tables()
        rows = (
            db.query(CRMAutomationRun, CRMAutomationRule, CRMContact)
            .join(CRMAutomationRule, CRMAutomationRule.id == CRMAutomationRun.rule_id)
            .join(CRMContact, CRMContact.id == CRMAutomationRun.contact_id)
            .order_by(CRMAutomationRun.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            _serialize_run(
                {
                    "id": run.id,
                    "source_event_id": run.source_event_id,
                    "status": str(run.status),
                    "executed_at": run.executed_at,
                    "error_message": run.error_message,
                    "created_at": run.created_at,
                },
                contact={"id": contact.id, "first_name": contact.first_name, "last_name": contact.last_name},
                rule=_rule_to_dict(rule),
            )
            for run, rule, contact in rows
        ]
    except SQLAlchemyError:
        db.rollback()
        rules_by_id = {rule["id"]: rule for rule in list_mock_crm_automation_rules()}
        contacts_by_id = {contact["id"]: contact for contact in list_mock_crm_contacts()}
        results: list[dict[str, Any]] = []

        for run in list_mock_crm_automation_runs(limit=limit):
            rule = rules_by_id.get(run["rule_id"])
            contact = contacts_by_id.get(run["contact_id"])
            if not rule or not contact:
                continue
            results.append(_serialize_run(run, contact=contact, rule=rule))

        return results
