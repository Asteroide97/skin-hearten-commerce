from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models import Customer, InventoryMovement, Order, OrderItem, Payment, Product
from app.models.enums import InventoryMovementType, OrderStatus, PaymentProvider, PaymentStatus
from app.schemas.checkout import CheckoutItemInput, CheckoutNextAction, CheckoutRequest, CheckoutResponse
from app.services.crm import upsert_contact_from_checkout
from app.services.coupon_engine import calculate_checkout_totals
from app.services.mock_store import (
    create_order,
    create_payment,
    get_checkout_by_idempotency_key,
    get_next_order_id,
    get_product,
    get_product_by_slug,
    reserve_product_inventory,
    store_checkout_by_idempotency_key,
    upsert_mock_customer_from_checkout,
)
from app.services.payments import create_provider_checkout
from app.services.payments_mercadopago import create_mercadopago_preference
from app.services.payments_stripe import create_stripe_checkout_session

FREE_SHIPPING_THRESHOLD = 1999.0
STANDARD_SHIPPING_AMOUNT = 149.0


def _build_order_number() -> str:
    return f"SH-{datetime.now(timezone.utc).strftime('%y%m%d%H%M%S')}-{uuid4().hex[:4].upper()}"


def _resolve_mock_product(item: CheckoutItemInput) -> dict:
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


def _build_mock_order_item(item: CheckoutItemInput, product: dict) -> dict:
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


def _build_mock_next_action(payment_method: str) -> tuple[str, str, CheckoutNextAction]:
    if payment_method == "stripe":
        return (
            "paid",
            "mock_paid",
            CheckoutNextAction(type="show_order_confirmation", provider="mock"),
        )

    return (
        "pending",
        "pending",
        CheckoutNextAction(type="show_order_confirmation", provider="mock"),
    )


def _payment_provider_from_method(payment_method: str) -> PaymentProvider:
    if payment_method == "stripe":
        return PaymentProvider.STRIPE
    if payment_method == "mercadopago":
        return PaymentProvider.MERCADOPAGO
    if payment_method == "paypal":
        return PaymentProvider.PAYPAL
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Metodo de pago no soportado.")


def _build_db_order_item(item: CheckoutItemInput, product: Product) -> dict:
    stock = int(product.stock or 0)
    if stock < item.quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Insufficient stock for '{product.name}'",
        )

    unit_price = float(product.discount_price) if product.discount_price is not None else float(product.price)
    return {
        "product_id": int(product.id),
        "product_name": product.name,
        "product": product,
        "quantity": item.quantity,
        "slug": product.slug,
        "unit_price": unit_price,
    }


def _resolve_db_product(db: Session, item: CheckoutItemInput) -> Product:
    try:
        query = db.query(Product)
        product = None
        if isinstance(item.product_id, int):
            product = query.filter(Product.id == item.product_id).first()
        elif isinstance(item.product_id, str) and item.product_id.isdigit():
            product = query.filter(Product.id == int(item.product_id)).first()

        if not product and item.slug:
            product = query.filter(Product.slug == item.slug).first()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product not found for slug '{item.slug}'",
            )

        return product
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No pudimos validar los productos en este momento.",
        ) from exc


def _upsert_db_customer(db: Session, payload: CheckoutRequest) -> Customer:
    try:
        customer = (
            db.query(Customer)
            .filter(func.lower(Customer.email) == payload.customer.email.strip().lower())
            .first()
        )
        if not customer:
            customer = Customer(
                email=payload.customer.email.strip().lower(),
                first_name=payload.customer.first_name,
                last_name=payload.customer.last_name,
                phone=payload.customer.phone,
                hashed_password=get_password_hash(f"checkout-{payload.customer.email.strip().lower()}"),
            )
        else:
            customer.first_name = payload.customer.first_name
            customer.last_name = payload.customer.last_name
            customer.phone = payload.customer.phone

        db.add(customer)
        db.flush()
        return customer
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No pudimos preparar tu pedido en este momento.",
        ) from exc


def _serialize_shipping_address(payload: CheckoutRequest) -> str:
    shipping_line2 = f", {payload.shipping_address.line2}" if payload.shipping_address.line2 else ""
    return (
        f"{payload.shipping_address.line1}{shipping_line2}, "
        f"{payload.shipping_address.city}, {payload.shipping_address.state}, "
        f"{payload.shipping_address.postal_code}, {payload.shipping_address.country}"
    )


def _extract_payment_checkout_url(payment: Payment | None) -> str | None:
    if not payment or not isinstance(payment.raw_payload_json, dict):
        return None

    raw_payload = payment.raw_payload_json
    for key in ["url", "checkout_url", "init_point", "sandbox_init_point"]:
        value = raw_payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _build_checkout_next_action(payment: Payment | None) -> CheckoutNextAction:
    if payment and payment.status == PaymentStatus.PENDING:
        checkout_url = _extract_payment_checkout_url(payment)
        if payment.provider in {PaymentProvider.STRIPE, PaymentProvider.MERCADOPAGO} and checkout_url:
            return CheckoutNextAction(
                type="redirect",
                provider=str(payment.provider),
                url=checkout_url,
            )
    return CheckoutNextAction(type="show_order_confirmation", provider="mock")


def _build_db_checkout_response_from_existing_order(
    db: Session,
    *,
    idempotency_key: str,
) -> CheckoutResponse | None:
    try:
        order = db.query(Order).filter(Order.checkout_idempotency_key == idempotency_key).first()
        if not order:
            return None

        payment = db.query(Payment).filter(Payment.order_id == order.id).first()
        next_action = _build_checkout_next_action(payment)
        return CheckoutResponse.model_validate(
            {
                "order_id": int(order.id),
                "order_number": order.order_number,
                "status": str(order.status),
                "payment_status": str(payment.status) if payment else "pending",
                "subtotal": round(float(order.subtotal or 0), 2),
                "discount": round(float(order.discount_total or 0), 2),
                "shipping": round(float(order.shipping_total or 0), 2),
                "total": round(float(order.grand_total or 0), 2),
                "next_action": next_action.model_dump(),
            }
        )
    except SQLAlchemyError:
        db.rollback()
        return None


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

    resolved_items = [_build_mock_order_item(item, _resolve_mock_product(item)) for item in payload.items]
    subtotal = round(sum(item["quantity"] * item["unit_price"] for item in resolved_items), 2)
    discount_total, shipping_total, normalized_coupon_code = calculate_checkout_totals(
        db,
        subtotal=subtotal,
        coupon_code=payload.coupon_code,
        customer_email=payload.customer.email,
        customer_phone=payload.customer.phone,
        persist_redemption=False,
    )
    grand_total = round(subtotal - discount_total + shipping_total, 2)

    order_id = get_next_order_id()
    order_number = f"SH-{1000 + order_id}"
    order_status, payment_status, next_action = _build_mock_next_action(payload.payment_method)
    payment_intent = create_provider_checkout(payload.payment_method, order_number, grand_total)

    order = create_order(
        {
            "order_number": order_number,
            "customer_id": customer["id"],
            "status": order_status,
            "subtotal": subtotal,
            "discount_total": discount_total,
            "shipping_total": shipping_total,
            "grand_total": grand_total,
            "coupon_discount_amount": discount_total if normalized_coupon_code else 0.0,
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
            "checkout_idempotency_key": idempotency_key,
            "customer_email": customer["email"],
            "shipping_name": f"{payload.customer.first_name} {payload.customer.last_name}",
            "shipping_phone": payload.customer.phone,
            "shipping_country": payload.shipping_address.country,
            "shipping_address": _serialize_shipping_address(payload),
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
            "raw_payload_json": {
                "checkout_url": payment_intent.checkout_url,
                "provider": payload.payment_method,
                "reference": payment_intent.reference,
            },
            "paid_at": datetime.now(timezone.utc) if payment_status == "mock_paid" else None,
            "failed_at": None,
        }
        )

    if normalized_coupon_code:
        calculate_checkout_totals(
            db,
            subtotal=subtotal,
            coupon_code=normalized_coupon_code,
            customer_email=payload.customer.email,
            customer_phone=payload.customer.phone,
            order_id=order["id"],
            persist_redemption=True,
            idempotency_key=idempotency_key,
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
        "next_action": next_action.model_dump(),
    }

    if idempotency_key:
        store_checkout_by_idempotency_key(idempotency_key, response_payload)

    try:
        upsert_contact_from_checkout(db, payload=payload, order=order)
    except Exception:
        db.rollback()

    return CheckoutResponse.model_validate(response_payload)


def create_checkout_order(
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

    if payload.payment_method == "mock":
        return create_mock_checkout_order(db, payload, idempotency_key=idempotency_key)

    if idempotency_key:
        existing_order_response = _build_db_checkout_response_from_existing_order(
            db,
            idempotency_key=idempotency_key,
        )
        if existing_order_response:
            return existing_order_response

    if payload.payment_method == "paypal":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PayPal todavia no esta disponible en esta fase.",
        )

    customer = _upsert_db_customer(db, payload)
    resolved_items = [_build_db_order_item(item, _resolve_db_product(db, item)) for item in payload.items]
    subtotal = round(sum(item["quantity"] * item["unit_price"] for item in resolved_items), 2)
    discount_total, shipping_total, normalized_coupon_code = calculate_checkout_totals(
        db,
        subtotal=subtotal,
        coupon_code=payload.coupon_code,
        customer_email=payload.customer.email,
        customer_phone=payload.customer.phone,
        persist_redemption=False,
    )
    grand_total = round(subtotal - discount_total + shipping_total, 2)
    order_number = _build_order_number()
    provider = _payment_provider_from_method(payload.payment_method)

    try:
        order = Order(
            order_number=order_number,
            customer_id=customer.id,
            status=OrderStatus.PENDING,
            subtotal=subtotal,
            discount_total=discount_total,
            shipping_total=shipping_total,
            grand_total=grand_total,
            coupon_code=normalized_coupon_code,
            coupon_discount_amount=discount_total if normalized_coupon_code else 0.0,
            checkout_idempotency_key=idempotency_key,
            shipping_name=f"{payload.customer.first_name} {payload.customer.last_name}".strip(),
            shipping_address=_serialize_shipping_address(payload),
        )
        db.add(order)
        db.flush()

        if normalized_coupon_code:
            calculate_checkout_totals(
                db,
                subtotal=subtotal,
                coupon_code=normalized_coupon_code,
                customer_email=payload.customer.email,
                customer_phone=payload.customer.phone,
                order_id=order.id,
                persist_redemption=True,
                idempotency_key=idempotency_key,
            )

        for item in resolved_items:
            product = item["product"]
            product.stock = int(product.stock or 0) - item["quantity"]
            db.add(product)
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=item["product_id"],
                    product_name=item["product_name"],
                    quantity=item["quantity"],
                    unit_price=item["unit_price"],
                )
            )
            db.add(
                InventoryMovement(
                    product_id=item["product_id"],
                    user_id=None,
                    movement_type=InventoryMovementType.EXIT,
                    quantity=item["quantity"],
                    reason=f"Checkout {order_number}",
                )
            )

        payment = Payment(
            order_id=order.id,
            provider=provider,
            provider_reference=order_number if provider == PaymentProvider.MERCADOPAGO else None,
            status=PaymentStatus.PENDING,
            amount=grand_total,
            raw_payload_json={
                "coupon_code": normalized_coupon_code,
                "shipping_address": {
                    "city": payload.shipping_address.city,
                    "country": payload.shipping_address.country,
                    "line1": payload.shipping_address.line1,
                    "line2": payload.shipping_address.line2,
                    "postal_code": payload.shipping_address.postal_code,
                    "state": payload.shipping_address.state,
                },
            },
        )
        db.add(payment)
        db.flush()

        if provider == PaymentProvider.STRIPE:
            session = create_stripe_checkout_session(
                customer_email=customer.email,
                idempotency_key=idempotency_key,
                items=resolved_items,
                order_id=order.id,
                order_number=order_number,
                payment_id=payment.id,
            )
            payment.provider_reference = session.reference
            payment.raw_payload_json = session.raw_payload
            next_action = CheckoutNextAction(
                type="redirect",
                provider="stripe",
                url=session.checkout_url,
            )
        else:
            preference = create_mercadopago_preference(
                customer={
                    "email": customer.email,
                    "first_name": customer.first_name,
                    "last_name": customer.last_name,
                },
                idempotency_key=idempotency_key,
                items=resolved_items,
                order_id=order.id,
                order_number=order_number,
                payment_id=payment.id,
            )
            payment.provider_reference = preference.reference
            payment.raw_payload_json = preference.raw_payload
            next_action = CheckoutNextAction(
                type="redirect",
                provider="mercadopago",
                url=preference.checkout_url,
            )

        db.add(payment)
        db.commit()
        db.refresh(order)
        db.refresh(payment)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No pudimos guardar tu pedido en este momento.",
        ) from exc

    order_payload = {
        "id": order.id,
        "order_number": order.order_number,
        "customer_id": order.customer_id,
        "status": str(order.status),
        "subtotal": float(order.subtotal),
        "discount_total": float(order.discount_total or 0),
        "shipping_total": float(order.shipping_total or 0),
        "grand_total": float(order.grand_total),
        "payment_provider": payload.payment_method,
        "payment_status": str(payment.status),
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
        "customer_email": customer.email,
        "shipping_name": order.shipping_name,
        "shipping_phone": payload.customer.phone,
        "shipping_country": payload.shipping_address.country,
        "shipping_address": order.shipping_address,
        "created_at": order.created_at or datetime.now(timezone.utc),
    }

    response_payload = {
        "order_id": order.id,
        "order_number": order.order_number,
        "status": str(order.status),
        "payment_status": str(payment.status),
        "subtotal": subtotal,
        "discount": discount_total,
        "shipping": shipping_total,
        "total": grand_total,
        "next_action": next_action.model_dump(),
    }

    if idempotency_key:
        store_checkout_by_idempotency_key(idempotency_key, response_payload)

    try:
        upsert_contact_from_checkout(db, payload=payload, order=order_payload)
    except Exception:
        db.rollback()

    return CheckoutResponse.model_validate(response_payload)
