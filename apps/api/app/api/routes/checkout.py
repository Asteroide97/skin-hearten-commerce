from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_customer
from app.schemas.checkout import CheckoutRequest, CheckoutResponse
from app.services.mock_store import COUPONS, create_order, get_cart
from app.services.payments import create_provider_checkout

router = APIRouter(prefix="/checkout")


@router.post("", response_model=CheckoutResponse)
def create_checkout(payload: CheckoutRequest, customer: dict = Depends(get_current_customer)) -> CheckoutResponse:
    cart = get_cart(customer["id"])
    if not cart["items"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    subtotal = sum(item["quantity"] * item["unit_price"] for item in cart["items"])
    discount_total = 0.0
    shipping_total = 0.0 if subtotal >= 1999 else 149.0

    if payload.coupon_code:
        coupon = next((entry for entry in COUPONS if entry["code"] == payload.coupon_code.upper()), None)
        if coupon and coupon["coupon_type"] == "percentage":
            discount_total = subtotal * (coupon["value"] / 100)
        if coupon and coupon["coupon_type"] == "free_shipping":
            shipping_total = 0.0

    grand_total = subtotal - discount_total + shipping_total
    order_number = f"SH-{1000 + customer['id'] + len(cart['items']) + int(subtotal)}"
    checkout = create_provider_checkout(payload.payment_method, order_number, grand_total)
    order = create_order(
        {
            "order_number": order_number,
            "customer_id": customer["id"],
            "status": "pending",
            "subtotal": subtotal,
            "discount_total": discount_total,
            "shipping_total": shipping_total,
            "grand_total": grand_total,
            "payment_provider": payload.payment_method,
            "items": cart["items"],
            "shipping_name": f"{payload.first_name} {payload.last_name}",
            "shipping_address": f"{payload.address_line1}, {payload.city}, {payload.state}, {payload.postal_code}",
        }
    )

    return CheckoutResponse(
        order_id=order["id"],
        order_number=order["order_number"],
        payment_provider=payload.payment_method,
        payment_reference=checkout.reference,
        checkout_url=checkout.checkout_url,
        status=checkout.status,
    )
