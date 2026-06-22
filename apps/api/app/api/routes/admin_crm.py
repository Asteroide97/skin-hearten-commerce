from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db.session import get_db
from app.schemas.crm import (
    CRMAutomationRuleRead,
    CRMAutomationRuleUpdate,
    CRMAutomationRunRead,
    CRMContactDetailRead,
    CRMContactSummaryRead,
    CRMContactUpdate,
    CRMLifecycleStatus,
    CRMMessageTemplatePreviewRequest,
    CRMMessageTemplatePreviewResponse,
    CRMMessageTemplateRead,
    CRMMessageTemplateUpdate,
    CRMNoteCreate,
    CRMNoteRead,
    CRMReminderChannel,
    CRMReminderCreate,
    CRMReminderDetailRead,
    CRMReminderStatus,
    CRMReminderSummaryRead,
    CRMReminderType,
    CRMReminderUpdate,
    CRMTaskCreate,
    CRMTaskRead,
    CRMTaskUpdate,
)
from app.services.crm import (
    create_crm_note_entry,
    create_crm_task_entry,
    get_crm_contact_detail,
    list_crm_contact_summaries,
    update_crm_contact_profile,
    update_crm_task_entry,
)
from app.services.crm_automations import (
    list_crm_automation_rules,
    list_crm_automation_runs,
    update_crm_automation_rule_entry,
)
from app.services.crm_reminders import (
    create_manual_reminder_for_contact,
    get_crm_reminder_detail,
    list_crm_message_templates,
    list_crm_reminders,
    mark_reminder_sent_manual,
    preview_message_template,
    skip_reminder,
    update_crm_message_template_entry,
    update_crm_reminder_entry,
)

router = APIRouter(prefix="/admin/crm")


def _parse_optional_date(value: str | None, field_name: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name} format. Use YYYY-MM-DD.",
        ) from exc


@router.get("/contacts", response_model=list[CRMContactSummaryRead])
def list_admin_crm_contacts(
    search: str | None = Query(default=None),
    lifecycle_status: CRMLifecycleStatus | None = Query(default=None, alias="lifecycle_status"),
    skin_type: str | None = Query(default=None),
    main_goal: str | None = Query(default=None),
    accepted_marketing: bool | None = Query(default=None),
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[CRMContactSummaryRead]:
    contacts = list_crm_contact_summaries(
        db,
        accepted_marketing=accepted_marketing,
        lifecycle_status=lifecycle_status,
        main_goal=main_goal,
        search=search,
        skin_type=skin_type,
    )
    return [CRMContactSummaryRead.model_validate(contact) for contact in contacts]


@router.get("/contacts/{contact_id}", response_model=CRMContactDetailRead)
def get_admin_crm_contact(
    contact_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMContactDetailRead:
    contact = get_crm_contact_detail(db, contact_id)
    if not contact:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM contact not found")
    return CRMContactDetailRead.model_validate(contact)


@router.patch("/contacts/{contact_id}", response_model=CRMContactDetailRead)
def update_admin_crm_contact(
    contact_id: int,
    payload: CRMContactUpdate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMContactDetailRead:
    contact = update_crm_contact_profile(db, contact_id, payload)
    if not contact:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM contact not found")
    return CRMContactDetailRead.model_validate(contact)


@router.post(
    "/contacts/{contact_id}/notes",
    response_model=CRMNoteRead,
    status_code=http_status.HTTP_201_CREATED,
)
def create_admin_crm_note(
    contact_id: int,
    payload: CRMNoteCreate,
    admin_user: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMNoteRead:
    note = create_crm_note_entry(
        db,
        contact_id=contact_id,
        payload=payload,
        created_by_user_id=admin_user.get("id"),
    )
    if not note:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM contact not found")
    return CRMNoteRead.model_validate(note)


@router.post(
    "/contacts/{contact_id}/tasks",
    response_model=CRMTaskRead,
    status_code=http_status.HTTP_201_CREATED,
)
def create_admin_crm_task(
    contact_id: int,
    payload: CRMTaskCreate,
    admin_user: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMTaskRead:
    task = create_crm_task_entry(
        db,
        contact_id=contact_id,
        payload=payload,
        created_by_user_id=admin_user.get("id"),
    )
    if not task:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM contact not found")
    return CRMTaskRead.model_validate(task)


@router.post(
    "/contacts/{contact_id}/reminders",
    response_model=CRMReminderDetailRead,
    status_code=http_status.HTTP_201_CREATED,
)
def create_admin_crm_reminder(
    contact_id: int,
    payload: CRMReminderCreate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMReminderDetailRead:
    reminder = create_manual_reminder_for_contact(db, contact_id, payload)
    if not reminder:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM contact not found")
    detail = get_crm_reminder_detail(db, reminder["id"])
    return CRMReminderDetailRead.model_validate(detail or reminder)


@router.patch("/tasks/{task_id}", response_model=CRMTaskRead)
def update_admin_crm_task(
    task_id: int,
    payload: CRMTaskUpdate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMTaskRead:
    task = update_crm_task_entry(db, task_id, payload)
    if not task:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM task not found")
    return CRMTaskRead.model_validate(task)


@router.get("/automations/rules", response_model=list[CRMAutomationRuleRead])
def list_admin_crm_automation_rules(
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[CRMAutomationRuleRead]:
    rules = list_crm_automation_rules(db)
    return [CRMAutomationRuleRead.model_validate(rule) for rule in rules]


@router.patch("/automations/rules/{rule_id}", response_model=CRMAutomationRuleRead)
def update_admin_crm_automation_rule(
    rule_id: int,
    payload: CRMAutomationRuleUpdate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMAutomationRuleRead:
    rule = update_crm_automation_rule_entry(db, rule_id, payload)
    if not rule:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM automation rule not found")
    return CRMAutomationRuleRead.model_validate(rule)


@router.get("/automations/runs", response_model=list[CRMAutomationRunRead])
def list_admin_crm_automation_runs(
    limit: int = Query(default=50, ge=1, le=200),
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[CRMAutomationRunRead]:
    runs = list_crm_automation_runs(db, limit=limit)
    return [CRMAutomationRunRead.model_validate(run) for run in runs]


@router.get("/reminders", response_model=list[CRMReminderSummaryRead])
def list_admin_crm_reminders_endpoint(
    search: str | None = Query(default=None),
    status: CRMReminderStatus | None = Query(default=None),
    channel: CRMReminderChannel | None = Query(default=None),
    reminder_type: CRMReminderType | None = Query(default=None, alias="reminder_type"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[CRMReminderSummaryRead]:
    reminders = list_crm_reminders(
        db,
        channel=channel,
        date_from=_parse_optional_date(date_from, "date_from"),
        date_to=_parse_optional_date(date_to, "date_to"),
        reminder_type=reminder_type,
        search=search,
        status=status,
    )
    return [CRMReminderSummaryRead.model_validate(reminder) for reminder in reminders]


@router.get("/reminders/{reminder_id}", response_model=CRMReminderDetailRead)
def get_admin_crm_reminder(
    reminder_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMReminderDetailRead:
    reminder = get_crm_reminder_detail(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM reminder not found")
    return CRMReminderDetailRead.model_validate(reminder)


@router.patch("/reminders/{reminder_id}", response_model=CRMReminderDetailRead)
def update_admin_crm_reminder(
    reminder_id: int,
    payload: CRMReminderUpdate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMReminderDetailRead:
    reminder = update_crm_reminder_entry(db, reminder_id, payload)
    if not reminder:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM reminder not found")
    return CRMReminderDetailRead.model_validate(reminder)


@router.post("/reminders/{reminder_id}/mark-sent-manual", response_model=CRMReminderDetailRead)
def mark_admin_crm_reminder_sent_manual(
    reminder_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMReminderDetailRead:
    reminder = mark_reminder_sent_manual(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM reminder not found")
    return CRMReminderDetailRead.model_validate(reminder)


@router.post("/reminders/{reminder_id}/skip", response_model=CRMReminderDetailRead)
def skip_admin_crm_reminder(
    reminder_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMReminderDetailRead:
    reminder = skip_reminder(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM reminder not found")
    return CRMReminderDetailRead.model_validate(reminder)


@router.get("/message-templates", response_model=list[CRMMessageTemplateRead])
def list_admin_crm_message_templates(
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[CRMMessageTemplateRead]:
    templates = list_crm_message_templates(db)
    return [CRMMessageTemplateRead.model_validate(template) for template in templates]


@router.patch("/message-templates/{template_id}", response_model=CRMMessageTemplateRead)
def update_admin_crm_message_template(
    template_id: int,
    payload: CRMMessageTemplateUpdate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMMessageTemplateRead:
    template = update_crm_message_template_entry(db, template_id, payload)
    if not template:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM message template not found")
    return CRMMessageTemplateRead.model_validate(template)


@router.post("/message-templates/{template_id}/preview", response_model=CRMMessageTemplatePreviewResponse)
def preview_admin_crm_message_template(
    template_id: int,
    payload: CRMMessageTemplatePreviewRequest,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> CRMMessageTemplatePreviewResponse:
    preview = preview_message_template(db, template_id, payload)
    if not preview:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="CRM message template not found")
    return CRMMessageTemplatePreviewResponse.model_validate(preview)
