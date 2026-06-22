from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Customer, Order, OrderItem, Payment
from app.models.enums import OrderStatus, PaymentProvider, PaymentStatus
from app.schemas.common import MessageResponse
from app.schemas.payment import PaymentCreateRequest, PaymentCreateResponse
from app.services.crm import record_order_paid_event
from app.services.mock_store import (
    get_order_by_id,
    get_order_by_number,
    get_payment_by_provider_reference as get_mock_payment_by_provider_reference,
    update_order as update_mock_order,
    update_payment as update_mock_payment,
)
from app.services.payments import create_provider_checkout
from app.services.payments_mercadopago import (
    fetch_mercadopago_payment,
    validate_mercadopago_webhook_signature,
)
from app.services.payments_stripe import validate_stripe_webhook_signature

router = APIRouter()


def _serialize_order_payload(order: Order, payment: Payment, items: list[OrderItem]) -> dict[str, Any]:
    return {
        "id": order.id,
        "order_number": order.order_number,
        "customer_id": order.customer_id,
        "status": str(order.status),
        "subtotal": float(order.subtotal),
        "discount_total": float(order.discount_total or 0),
        "shipping_total": float(order.shipping_total or 0),
        "grand_total": float(order.grand_total),
        "payment_provider": str(payment.provider),
        "payment_status": str(payment.status),
        "items": [
            {
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
            }
            for item in items
        ],
    }


def _payment_state_from_mercadopago(value: str | None) -> str | None:
    if value in {"approved", "authorized"}:
        return "paid"
    if value in {"rejected", "cancelled"}:
        return "failed"
    if value in {"pending", "in_process", "in_mediation"}:
        return "pending"
    return None


def _payment_state_from_stripe_event(event_type: str) -> str | None:
    if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
        return "paid"
    if event_type in {"checkout.session.expired", "checkout.session.async_payment_failed"}:
        return "failed"
    return None


def _mark_db_payment_state(
    db: Session,
    *,
    order: Order,
    payment: Payment,
    provider_payload: dict[str, Any],
    target_state: str,
) -> bool:
    now = datetime.now(timezone.utc)
    payment.raw_payload_json = provider_payload
    state_changed = False

    if target_state == "paid":
        if str(payment.status) != PaymentStatus.PAID.value:
            payment.status = PaymentStatus.PAID
            payment.paid_at = payment.paid_at or now
            state_changed = True
        if str(order.status) != OrderStatus.PAID.value:
            order.status = OrderStatus.PAID
    elif target_state == "failed":
        if str(payment.status) != PaymentStatus.FAILED.value:
            payment.status = PaymentStatus.FAILED
            payment.failed_at = payment.failed_at or now
            state_changed = True
    else:
        return False

    db.add(payment)
    db.add(order)
    db.commit()
    return state_changed


def _mark_mock_payment_state(
    *,
    order: dict[str, Any],
    payment: dict[str, Any],
    provider_payload: dict[str, Any],
    target_state: str,
) -> None:
    now = datetime.now(timezone.utc)
    payment_payload: dict[str, Any] = {
        "raw_payload_json": provider_payload,
    }

    order_payload: dict[str, Any] = {}
    if target_state == "paid":
        payment_payload["status"] = "paid"
        payment_payload["paid_at"] = payment.get("paid_at") or now
        payment_payload["failed_at"] = None
        order_payload["status"] = "paid"
        order_payload["payment_status"] = "paid"
    elif target_state == "failed":
        payment_payload["status"] = "failed"
        payment_payload["failed_at"] = payment.get("failed_at") or now
        order_payload["payment_status"] = "failed"
    else:
        return

    update_mock_payment(payment["id"], payment_payload)
    update_mock_order(order["id"], order_payload)


def _find_db_payment(
    db: Session,
    *,
    provider: PaymentProvider,
    provider_reference: str,
) -> tuple[Payment, Order, Customer | None, list[OrderItem]] | None:
    payment = (
        db.query(Payment)
        .filter(Payment.provider == provider, Payment.provider_reference == provider_reference)
        .first()
    )
    if not payment:
        return None

    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if not order:
        return None

    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    return payment, order, customer, items


@router.post("/payments/mercadopago/create", response_model=PaymentCreateResponse)
def create_mercadopago_payment(payload: PaymentCreateRequest) -> PaymentCreateResponse:
    checkout = create_provider_checkout("mercadopago", f"order-{payload.order_id}", 0)
    return PaymentCreateResponse.model_validate(checkout.__dict__)


@router.post("/payments/paypal/create", response_model=PaymentCreateResponse)
def create_paypal_payment(payload: PaymentCreateRequest) -> PaymentCreateResponse:
    checkout = create_provider_checkout("paypal", f"order-{payload.order_id}", 0)
    return PaymentCreateResponse.model_validate(checkout.__dict__)


@router.post("/payments/stripe/create", response_model=PaymentCreateResponse)
def create_stripe_payment(payload: PaymentCreateRequest) -> PaymentCreateResponse:
    checkout = create_provider_checkout("stripe", f"order-{payload.order_id}", 0)
    return PaymentCreateResponse.model_validate(checkout.__dict__)


@router.post("/webhooks/mercadopago", response_model=MessageResponse)
async def mercadopago_webhook(
    request: Request,
    x_request_id: str | None = Header(default=None, alias="x-request-id"),
    x_signature: str | None = Header(default=None, alias="x-signature"),
    db: Session = Depends(get_db),
) -> MessageResponse:
    try:
        body = await request.json()
    except Exception:
        body = {}
    validate_mercadopago_webhook_signature(
        body=body if isinstance(body, dict) else {},
        request_id=x_request_id,
        signature_header=x_signature,
    )

    if not isinstance(body, dict):
        return MessageResponse(message="Mercado Pago webhook ignored")

    data = body.get("data")
    payment_id = None
    if isinstance(data, dict):
        payment_id = data.get("id")
    if payment_id is None:
        payment_id = body.get("id") or request.query_params.get("data.id") or request.query_params.get("id")
    if payment_id is None:
        return MessageResponse(message="Mercado Pago webhook ignored")

    provider_payload = fetch_mercadopago_payment(str(payment_id))
    target_state = _payment_state_from_mercadopago(provider_payload.get("status"))
    provider_reference = provider_payload.get("external_reference")
    if not target_state or not isinstance(provider_reference, str) or not provider_reference.strip():
        return MessageResponse(message="Mercado Pago webhook ignored")

    try:
        db_match = _find_db_payment(
            db,
            provider=PaymentProvider.MERCADOPAGO,
            provider_reference=provider_reference,
        )
        if db_match:
            payment, order, customer, items = db_match
            state_changed = _mark_db_payment_state(
                db,
                order=order,
                payment=payment,
                provider_payload=provider_payload,
                target_state=target_state,
            )
            if target_state == "paid" and state_changed:
                record_order_paid_event(
                    db,
                    customer_email=customer.email if customer else None,
                    customer_phone=customer.phone if customer else None,
                    order=_serialize_order_payload(order, payment, items),
                )
            return MessageResponse(message="Mercado Pago webhook processed")
    except SQLAlchemyError:
        db.rollback()

    payment = get_mock_payment_by_provider_reference("mercadopago", provider_reference)
    order = get_order_by_number(provider_reference)
    if payment and order:
        _mark_mock_payment_state(
            order=order,
            payment=payment,
            provider_payload=provider_payload,
            target_state=target_state,
        )
        return MessageResponse(message="Mercado Pago webhook processed")

    return MessageResponse(message="Mercado Pago payment not found")


@router.post("/webhooks/paypal", response_model=MessageResponse)
def paypal_webhook() -> MessageResponse:
    return MessageResponse(message="PayPal webhook not implemented in this phase")


@router.post("/webhooks/stripe", response_model=MessageResponse)
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
) -> MessageResponse:
    raw_body = await request.body()
    event = validate_stripe_webhook_signature(payload=raw_body, signature_header=stripe_signature)
    event_type = event.get("type")
    if not isinstance(event_type, str):
        return MessageResponse(message="Stripe webhook ignored")

    target_state = _payment_state_from_stripe_event(event_type)
    if not target_state:
        return MessageResponse(message="Stripe webhook ignored")

    data = event.get("data")
    event_object = data.get("object") if isinstance(data, dict) else None
    if not isinstance(event_object, dict):
        return MessageResponse(message="Stripe webhook ignored")

    provider_reference = event_object.get("id")
    if not isinstance(provider_reference, str) or not provider_reference.strip():
        return MessageResponse(message="Stripe webhook ignored")

    try:
        db_match = _find_db_payment(
            db,
            provider=PaymentProvider.STRIPE,
            provider_reference=provider_reference,
        )
        if db_match:
            payment, order, customer, items = db_match
            state_changed = _mark_db_payment_state(
                db,
                order=order,
                payment=payment,
                provider_payload=event,
                target_state=target_state,
            )
            if target_state == "paid" and state_changed:
                record_order_paid_event(
                    db,
                    customer_email=customer.email if customer else None,
                    customer_phone=customer.phone if customer else None,
                    order=_serialize_order_payload(order, payment, items),
                )
            return MessageResponse(message="Stripe webhook processed")
    except SQLAlchemyError:
        db.rollback()

    payment = get_mock_payment_by_provider_reference("stripe", provider_reference)
    if payment:
        order = get_order_by_id(int(payment["order_id"]))
        if order:
            _mark_mock_payment_state(
                order=order,
                payment=payment,
                provider_payload=event,
                target_state=target_state,
            )
            return MessageResponse(message="Stripe webhook processed")

    return MessageResponse(message="Stripe payment not found")
