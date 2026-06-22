from __future__ import annotations

import hashlib
import hmac
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings

STRIPE_API_BASE_URL = "https://api.stripe.com/v1"


@dataclass
class StripeCheckoutSession:
    checkout_url: str
    raw_payload: dict[str, Any]
    reference: str


def _extract_error_message(payload: dict[str, Any]) -> str | None:
    error = payload.get("error")
    if isinstance(error, dict):
        message = error.get("message")
        if isinstance(message, str) and message.strip():
            return message.strip()
    return None


def _request_stripe(
    path: str,
    *,
    idempotency_key: str | None = None,
    params: list[tuple[str, str]],
) -> dict[str, Any]:
    if not settings.stripe_secret_key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe no esta configurado en este entorno.",
        )

    body = urllib.parse.urlencode(params).encode("utf-8")
    request = urllib.request.Request(
        f"{STRIPE_API_BASE_URL}{path}",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.stripe_secret_key}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    if idempotency_key:
        request.add_header("Idempotency-Key", idempotency_key)

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="ignore")
        try:
            payload = json.loads(body_text) if body_text else {}
        except json.JSONDecodeError:
            payload = {}
        detail = _extract_error_message(payload) or "No pudimos iniciar Stripe Checkout."
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
    except urllib.error.URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No pudimos conectar con Stripe.",
        ) from exc


def build_stripe_success_url(order_number: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}/checkout/exito?order={urllib.parse.quote(order_number)}&session_id={{CHECKOUT_SESSION_ID}}"


def build_stripe_cancel_url(order_number: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}/checkout/error?order={urllib.parse.quote(order_number)}"


def create_stripe_checkout_session(
    *,
    customer_email: str,
    idempotency_key: str | None,
    items: list[dict[str, Any]],
    order_id: int,
    order_number: str,
    payment_id: int,
) -> StripeCheckoutSession:
    params: list[tuple[str, str]] = [
        ("mode", "payment"),
        ("success_url", build_stripe_success_url(order_number)),
        ("cancel_url", build_stripe_cancel_url(order_number)),
        ("client_reference_id", order_number),
        ("customer_email", customer_email),
        ("payment_method_types[0]", "card"),
        ("metadata[order_id]", str(order_id)),
        ("metadata[order_number]", order_number),
        ("metadata[payment_id]", str(payment_id)),
    ]

    for index, item in enumerate(items):
        unit_amount = int(round(float(item["unit_price"]) * 100))
        params.extend(
            [
                (f"line_items[{index}][quantity]", str(item["quantity"])),
                (f"line_items[{index}][price_data][currency]", "mxn"),
                (f"line_items[{index}][price_data][unit_amount]", str(unit_amount)),
                (f"line_items[{index}][price_data][product_data][name]", str(item["product_name"])),
            ]
        )

    payload = _request_stripe(
        "/checkout/sessions",
        idempotency_key=idempotency_key,
        params=params,
    )
    checkout_url = payload.get("url")
    reference = payload.get("id")
    if not isinstance(checkout_url, str) or not checkout_url.strip() or not isinstance(reference, str):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe devolvio una sesion incompleta.",
        )

    return StripeCheckoutSession(
        checkout_url=checkout_url,
        raw_payload=payload,
        reference=reference,
    )


def validate_stripe_webhook_signature(*, payload: bytes, signature_header: str | None) -> dict[str, Any]:
    if not settings.stripe_webhook_secret.strip():
        try:
            return json.loads(payload.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payload invalido de Stripe.") from exc

    if not signature_header:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falta Stripe-Signature.")

    fragments = [part.strip() for part in signature_header.split(",") if part.strip()]
    parsed: dict[str, list[str]] = {}
    for fragment in fragments:
        if "=" not in fragment:
            continue
        key, value = fragment.split("=", 1)
        parsed.setdefault(key, []).append(value)

    timestamps = parsed.get("t")
    signatures = parsed.get("v1") or []
    if not timestamps or not signatures:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firma de Stripe invalida.")

    timestamp = timestamps[0]
    try:
        parsed_timestamp = int(timestamp)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firma de Stripe invalida.") from exc

    signed_payload = f"{timestamp}.{payload.decode('utf-8')}".encode("utf-8")
    expected_signature = hmac.new(
        settings.stripe_webhook_secret.encode("utf-8"),
        signed_payload,
        hashlib.sha256,
    ).hexdigest()

    if not any(hmac.compare_digest(expected_signature, candidate) for candidate in signatures):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firma de Stripe invalida.")

    if abs(time.time() - parsed_timestamp) > 300:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Evento de Stripe expirado.")

    try:
        return json.loads(payload.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payload invalido de Stripe.") from exc
