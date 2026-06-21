from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_admin
from app.schemas.order import OrderRead, OrderStatusUpdate
from app.services.mock_store import update_order_status

router = APIRouter(prefix="/admin/orders")


@router.put("/{order_id}", response_model=OrderRead)
def update_admin_order(
    order_id: int,
    payload: OrderStatusUpdate,
    _: dict = Depends(get_current_admin),
) -> OrderRead:
    order = update_order_status(order_id, payload.status)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return OrderRead.model_validate(order)
