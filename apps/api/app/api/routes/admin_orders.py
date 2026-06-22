from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db.session import get_db
from app.schemas.order import AdminOrderDetailRead, AdminOrderSummaryRead, AdminOrderUpdate
from app.services.admin_orders import (
    get_admin_order_detail,
    list_admin_order_summaries,
    update_admin_order,
)

router = APIRouter(prefix="/admin/orders")


@router.get("", response_model=list[AdminOrderSummaryRead])
def list_orders_admin(
    search: str | None = Query(default=None),
    order_status: str | None = Query(default=None),
    payment_status: str | None = Query(default=None),
    payment_provider: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[AdminOrderSummaryRead]:
    orders = list_admin_order_summaries(
        db,
        search=search,
        order_status=order_status,
        payment_status=payment_status,
        payment_provider=payment_provider,
        date_from=date_from,
        date_to=date_to,
    )
    return [AdminOrderSummaryRead.model_validate(order) for order in orders]


@router.get("/{order_id}", response_model=AdminOrderDetailRead)
def get_order_admin(
    order_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminOrderDetailRead:
    order = get_admin_order_detail(db, order_id)
    if not order:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found")
    return AdminOrderDetailRead.model_validate(order)


@router.patch("/{order_id}", response_model=AdminOrderDetailRead)
def patch_order_admin(
    order_id: int,
    payload: AdminOrderUpdate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminOrderDetailRead:
    order = update_admin_order(db, order_id, payload)
    if not order:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Order not found")
    return AdminOrderDetailRead.model_validate(order)
