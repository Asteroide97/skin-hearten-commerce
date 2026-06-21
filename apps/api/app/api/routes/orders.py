from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_customer
from app.schemas.order import OrderRead
from app.services.mock_store import get_order_by_id, list_orders_for_customer

router = APIRouter(prefix="/orders")


@router.get("", response_model=list[OrderRead])
def list_orders(customer: dict = Depends(get_current_customer)) -> list[OrderRead]:
    return [OrderRead.model_validate(order) for order in list_orders_for_customer(customer["id"])]


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, customer: dict = Depends(get_current_customer)) -> OrderRead:
    order = get_order_by_id(order_id)
    if not order or order["customer_id"] != customer["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return OrderRead.model_validate(order)

