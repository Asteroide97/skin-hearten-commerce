from __future__ import annotations

import hashlib
import hmac
import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings

MERCADOPAGO_API_BASE_URL = "https://api.mercadopago.com"


@dataclass
class MercadoPagoPreference:
    checkout_url: str
    raw_payload: dict[str, Any]
    reference: str


def _extract_error_message(payload: dict[str, Any]) -> str | None:
    message = payload.get("message")
    if isinstance(message, str) and message.strip():
        return message.strip()

    cause = payload.get("cause")
    if isinstance(cause, list):
        for entry in cause:
            if isinstance(entry, dict):
                description = entry.get("description")
                if isinstance(description, str) and description.strip():
                    return description.strip()
    return None


def _request_mercadopago(
    path: str,
    *,
    body: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
    method: str = "POST",
) -> dict[str, Any]:
    if not settings.mercadopago_access_token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mercado Pago no esta configurado en este entorno.",
        )

    raw_body = json.dumps(body or {}).encode("utf-8") if method != "GET" else None
    request = urllib.request.Request(
        f"{MERCADOPAGO_API_BASE_URL}{path}",
        data=raw_body,
        method=method,
        headers={
            "Authorization": f"Bearer {settings.mercadopago_access_token}",
            "Content-Type": "application/json",
        },
    )
    if idempotency_key:
        request.add_header("X-Idempotency-Key", idempotency_key)

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="ignore")
        try:
            payload = json.loads(body_text) if body_text else {}
        except json.JSONDecodeError:
            payload = {}
        detail = _extract_error_message(payload) or "No pudimos iniciar Mercado Pago."
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
    except urllib.error.URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No pudimos conectar con Mercado Pago.",
        ) from exc


def build_mercadopago_back_url(path: str, order_number: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}{path}?order={urllib.parse.quote(order_number)}"


def _build_notification_url() -> str | None:
    if not settings.api_base_url.strip():
        return None
    base = settings.api_base_url.rstrip("/")
    return f"{base}{settings.api_v1_str}/webhooks/mercadopago"


def create_mercadopago_preference(
    *,
    customer: dict[str, Any],
    idempotency_key: str | None,
    items: list[dict[str, Any]],
    order_id: int,
    order_number: str,
    payment_id: int,
) -> MercadoPagoPreference:
    payload: dict[str, Any] = {
        "auto_return": "approved",
        "back_urls": {
            "success": build_mercadopago_back_url("/checkout/exito", order_number),
            "failure": build_mercadopago_back_url("/checkout/error", order_number),
            "pending": build_mercadopago_back_url("/checkout/pendiente", order_number),
        },
        "external_reference": order_number,
        "items": [
            {
                "currency_id": "MXN",
                "id": str(item["product_id"]),
                "quantity": int(item["quantity"]),
                "title": str(item["product_name"]),
                "unit_price": float(item["unit_price"]),
            }
            for item in items
        ],
        "metadata": {
            "order_id": order_id,
            "order_number": order_number,
            "payment_id": payment_id,
        },
        "payer": {
            "email": customer["email"],
            "name": customer["first_name"],
            "surname": customer["last_name"],
        },
        "statement_descriptor": "SKIN HEARTEN",
    }

    notification_url = _build_notification_url()
    if notification_url:
        payload["notification_url"] = notification_url

    response = _request_mercadopago(
        "/checkout/preferences",
        body=payload,
        idempotency_key=idempotency_key,
    )
    checkout_url = response.get("sandbox_init_point") or response.get("init_point")
    if not isinstance(checkout_url, str) or not checkout_url.strip():
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Mercado Pago devolvio una preferencia incompleta.",
        )

    return MercadoPagoPreference(
        checkout_url=checkout_url,
        raw_payload=response,
        reference=order_number,
    )


def fetch_mercadopago_payment(payment_id: str) -> dict[str, Any]:
    return _request_mercadopago(f"/v1/payments/{payment_id}", method="GET")


def validate_mercadopago_webhook_signature(
    *,
    body: dict[str, Any],
    request_id: str | None,
    signature_header: str | None,
) -> None:
    if not settings.mercadopago_webhook_secret.strip():
        return

    if not signature_header or not request_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firma de Mercado Pago invalida.")

    parts = [fragment.strip() for fragment in signature_header.split(",") if fragment.strip()]
    parsed: dict[str, str] = {}
    for part in parts:
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        parsed[key] = value

    timestamp = parsed.get("ts")
    signature = parsed.get("v1")
    data_id = None
    data = body.get("data")
    if isinstance(data, dict):
        data_id = data.get("id")
    if data_id is None:
        data_id = body.get("id")

    if not timestamp or not signature or data_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firma de Mercado Pago invalida.")

    manifest = f"id:{data_id};request-id:{request_id};ts:{timestamp};"
    expected_signature = hmac.new(
        settings.mercadopago_webhook_secret.encode("utf-8"),
        manifest.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firma de Mercado Pago invalida.")
