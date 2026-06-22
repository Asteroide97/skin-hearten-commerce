from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.checkout import CheckoutItemInput, CheckoutRequest, CheckoutResponse
from app.services.crm import upsert_contact_from_checkout
from app.services.mock_store import (
    create_order,
    create_payment,
    get_checkout_by_idempotency_key,
    get_coupon_by_code,
    get_next_order_id,
    get_product,
    get_product_by_slug,
    reserve_product_inventory,
    store_checkout_by_idempotency_key,
    upsert_mock_customer_from_checkout,
)
from app.services.payments import create_provider_checkout

FREE_SHIPPING_THRESHOLD = 1999.0
STANDARD_SHIPPING_AMOUNT = 149.0


def _resolve_product(item: CheckoutItemInput) -> dict:
    product = None

    if isinstance(item.product_id, int):
        product = get_product(item.product_id)
    elif isinstance(item.product_id, str) and item.product_id.isdigit():
        product = get_product(int(item.product_id))

    if not product and item.slug:
        product = get_product_by_slug(item.slug)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product not found for slug '{item.slug}'",
        )

    return product


def _build_order_item(item: CheckoutItemInput, product: dict) -> dict:
    stock = int(product.get("stock", 0) or 0)
    if stock < item.quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Insufficient stock for '{product['name']}'",
        )

    unit_price = float(product.get("discount_price") or product.get("price") or item.unit_price)
    return {
        "product_id": int(product["id"]),
        "product_name": str(product.get("name") or item.name),
        "quantity": item.quantity,
        "unit_price": unit_price,
        "slug": str(product.get("slug") or item.slug),
    }


def _calculate_discount(subtotal: float, coupon_code: str | None) -> tuple[float, float, str | None]:
    shipping_total = 0.0 if subtotal >= FREE_SHIPPING_THRESHOLD else STANDARD_SHIPPING_AMOUNT

    if not coupon_code:
        return 0.0, shipping_total, None

    coupon = get_coupon_by_code(coupon_code)
    if not coupon:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid coupon code")

    coupon_type = str(coupon.get("coupon_type"))
    value = float(coupon.get("value") or 0)
    discount_total = 0.0

    if coupon_type == "percentage":
        discount_total = round(subtotal * (value / 100), 2)
    elif coupon_type == "fixed":
        discount_total = min(subtotal, value)
    elif coupon_type == "free_shipping":
        shipping_total = 0.0

    return discount_total, shipping_total, str(coupon.get("code"))


def _resolve_payment_outcome(payment_method: str) -> tuple[str, str, str]:
    if payment_method == "stripe":
        return "paid", "mock_paid", "show_order_confirmation"

    return "pending", "pending", "show_order_confirmation"


def create_mock_checkout_order(
    db: Session,
    payload: CheckoutRequest,
    idempotency_key: str | None = None,
) -> CheckoutResponse:
    if idempotency_key:
        existing_response = get_checkout_by_idempotency_key(idempotency_key)
        if existing_response:
            return CheckoutResponse.model_validate(existing_response)

    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    customer = upsert_mock_customer_from_checkout(
        email=payload.customer.email,
        first_name=payload.customer.first_name,
        last_name=payload.customer.last_name,
        phone=payload.customer.phone,
    )

    resolved_items = [_build_order_item(item, _resolve_product(item)) for item in payload.items]
    subtotal = round(sum(item["quantity"] * item["unit_price"] for item in resolved_items), 2)
    discount_total, shipping_total, normalized_coupon_code = _calculate_discount(subtotal, payload.coupon_code)
    grand_total = round(subtotal - discount_total + shipping_total, 2)

    order_id = get_next_order_id()
    order_number = f"SH-{1000 + order_id}"
    order_status, payment_status, next_action = _resolve_payment_outcome(payload.payment_method)
    payment_intent = create_provider_checkout(payload.payment_method, order_number, grand_total)

    shipping_line2 = f", {payload.shipping_address.line2}" if payload.shipping_address.line2 else ""
    order = create_order(
        {
            "order_number": order_number,
            "customer_id": customer["id"],
            "status": order_status,
            "subtotal": subtotal,
            "discount_total": discount_total,
            "shipping_total": shipping_total,
            "grand_total": grand_total,
            "payment_provider": payload.payment_method,
            "payment_status": payment_status,
            "items": [
                {
                    "product_id": item["product_id"],
                    "product_name": item["product_name"],
                    "quantity": item["quantity"],
                    "unit_price": item["unit_price"],
                }
                for item in resolved_items
            ],
            "coupon_code": normalized_coupon_code,
            "customer_email": customer["email"],
            "shipping_name": f"{payload.customer.first_name} {payload.customer.last_name}",
            "shipping_phone": payload.customer.phone,
            "shipping_country": payload.shipping_address.country,
            "shipping_address": (
                f"{payload.shipping_address.line1}{shipping_line2}, "
                f"{payload.shipping_address.city}, {payload.shipping_address.state}, "
                f"{payload.shipping_address.postal_code}, {payload.shipping_address.country}"
            ),
            "shipping_address_data": {
                "line1": payload.shipping_address.line1,
                "line2": payload.shipping_address.line2,
                "city": payload.shipping_address.city,
                "state": payload.shipping_address.state,
                "postal_code": payload.shipping_address.postal_code,
                "country": payload.shipping_address.country,
            },
            "created_at": datetime.now(timezone.utc),
        }
    )

    create_payment(
        {
            "order_id": order["id"],
            "provider": payload.payment_method,
            "provider_reference": payment_intent.reference,
            "status": "paid" if payment_status == "mock_paid" else "pending",
            "amount": grand_total,
            "paid_at": datetime.now(timezone.utc) if payment_status == "mock_paid" else None,
        }
    )

    for item in resolved_items:
        reserve_product_inventory(
            product_id=item["product_id"],
            quantity=item["quantity"],
            reason=f"Checkout {order_number}",
        )

    response_payload = {
        "order_id": order["id"],
        "order_number": order["order_number"],
        "status": order_status,
        "payment_status": payment_status,
        "subtotal": subtotal,
        "discount": discount_total,
        "shipping": shipping_total,
        "total": grand_total,
        "next_action": next_action,
    }

    if idempotency_key:
        store_checkout_by_idempotency_key(idempotency_key, response_payload)

    try:
        upsert_contact_from_checkout(db, payload=payload, order=order)
    except Exception:
        db.rollback()

    return CheckoutResponse.model_validate(response_payload)
