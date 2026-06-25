from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db.session import get_db
from app.schemas.admin_customer import AdminCustomerDetailRead, AdminCustomerPageRead
from app.schemas.crm import CRMLifecycleStatus
from app.services.admin_customers import get_admin_customer_detail, list_admin_customer_summaries

router = APIRouter(prefix="/admin/customers")


@router.get("", response_model=AdminCustomerPageRead)
def list_admin_customers(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, alias="pageSize", ge=1, le=100),
    search: str | None = Query(default=None),
    sort_by: str = Query(default="lastPurchaseAt", alias="sortBy"),
    sort_dir: str = Query(default="desc", alias="sortDir", pattern="^(asc|desc)$"),
    lifecycle_status: CRMLifecycleStatus | None = Query(default=None, alias="lifecycle_status"),
    has_orders: bool | None = Query(default=None, alias="has_orders"),
    accepted_marketing: bool | None = Query(default=None, alias="accepted_marketing"),
    main_goal: str | None = Query(default=None),
    skin_type: str | None = Query(default=None),
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminCustomerPageRead:
    payload = list_admin_customer_summaries(
        db,
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
    return AdminCustomerPageRead.model_validate(payload)


@router.get("/{customer_id}", response_model=AdminCustomerDetailRead)
def get_admin_customer(
    customer_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminCustomerDetailRead:
    customer = get_admin_customer_detail(db, customer_id)
    if not customer:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return AdminCustomerDetailRead.model_validate(customer)
