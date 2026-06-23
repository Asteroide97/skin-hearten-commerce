from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.customer_orders import (
    CustomerOrderDetailRead,
    CustomerOrderLookupInput,
    CustomerOrderSummaryRead,
)
from app.services.customer_orders import get_customer_order_detail, list_customer_order_summaries

router = APIRouter(prefix="/customer/orders")


@router.post("/lookup", response_model=list[CustomerOrderSummaryRead])
def lookup_customer_orders(
    payload: CustomerOrderLookupInput,
    db: Session = Depends(get_db),
) -> list[CustomerOrderSummaryRead]:
    orders = list_customer_order_summaries(
        db,
        email=str(payload.email) if payload.email else None,
        phone=payload.phone,
    )
    return [CustomerOrderSummaryRead.model_validate(order) for order in orders]


@router.post("/{order_id}/verify", response_model=CustomerOrderDetailRead)
def verify_customer_order(
    order_id: int,
    payload: CustomerOrderLookupInput,
    db: Session = Depends(get_db),
) -> CustomerOrderDetailRead:
    order = get_customer_order_detail(
        db,
        order_id=order_id,
        email=str(payload.email) if payload.email else None,
        phone=payload.phone,
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return CustomerOrderDetailRead.model_validate(order)
