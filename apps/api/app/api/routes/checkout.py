from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.checkout import CheckoutRequest, CheckoutResponse
from app.services.checkout import create_checkout_order

router = APIRouter(prefix="/checkout")


@router.post("", response_model=CheckoutResponse)
def create_checkout(
    payload: CheckoutRequest,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
) -> CheckoutResponse:
    return create_checkout_order(db, payload, idempotency_key=idempotency_key)
