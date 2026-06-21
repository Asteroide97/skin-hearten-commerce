from fastapi import APIRouter

from app.schemas.common import MessageResponse
from app.schemas.payment import PaymentCreateRequest, PaymentCreateResponse
from app.services.payments import create_provider_checkout

router = APIRouter()


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
def mercadopago_webhook() -> MessageResponse:
    return MessageResponse(message="Mercado Pago webhook received")


@router.post("/webhooks/paypal", response_model=MessageResponse)
def paypal_webhook() -> MessageResponse:
    return MessageResponse(message="PayPal webhook received")


@router.post("/webhooks/stripe", response_model=MessageResponse)
def stripe_webhook() -> MessageResponse:
    return MessageResponse(message="Stripe webhook received")
