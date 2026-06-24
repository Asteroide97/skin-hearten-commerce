from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Coupon, CouponRedemption
from app.models.enums import CouponType
from app.schemas.coupon import (
    AdminCouponCreate,
    AdminCouponDuplicateRequest,
    AdminCouponUpdate,
    CouponValidateRequest,
)
from app.services.mock_store import (
    create_coupon as create_mock_coupon,
    create_coupon_redemption as create_mock_coupon_redemption,
    delete_coupon as delete_mock_coupon,
    get_coupon as get_mock_coupon,
    get_coupon_by_code as get_mock_coupon_by_code,
    list_coupon_redemptions as list_mock_coupon_redemptions,
    list_coupons as list_mock_coupons,
    update_coupon as update_mock_coupon,
)

FREE_SHIPPING_THRESHOLD = 1999.0
STANDARD_SHIPPING_AMOUNT = 149.0


@dataclass
class CouponEvaluation:
    valid: bool
    code: str | None
    message: str
    reason_code: str
    discount_type: str | None = None
    discount_amount: float = 0.0
    free_shipping: bool = False
    coupon_id: int | None = None
    source: str = "none"


def _normalize_code(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().upper()
    return normalized or None


def _normalize_email(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    return normalized or None


def _normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    normalized = "".join(character for character in value if character.isdigit())
    return normalized or None


def _round_money(value: float) -> float:
    return round(max(0.0, value), 2)


def _base_shipping_total(subtotal: float) -> float:
    return 0.0 if subtotal >= FREE_SHIPPING_THRESHOLD or subtotal == 0 else STANDARD_SHIPPING_AMOUNT


def _normalize_discount_type(value: str | CouponType | None) -> str | None:
    if value is None:
        return None
    normalized = str(value)
    if normalized == "fixed":
        return "fixed_amount"
    return normalized


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    return round(float(value), 2)


def _serialize_coupon(coupon: Mapping[str, Any] | Coupon) -> dict[str, Any]:
    if isinstance(coupon, Coupon):
        return {
            "id": int(coupon.id),
            "code": coupon.code,
            "name": coupon.name,
            "description": coupon.description,
            "discount_type": _normalize_discount_type(coupon.discount_type),
            "discount_value": _to_float(coupon.discount_value) or 0.0,
            "min_subtotal": _to_float(coupon.min_subtotal),
            "max_discount": _to_float(coupon.max_discount),
            "starts_at": coupon.starts_at,
            "ends_at": coupon.ends_at,
            "usage_limit": coupon.usage_limit,
            "usage_count": int(coupon.usage_count or 0),
            "per_customer_limit": coupon.per_customer_limit,
            "is_active": bool(coupon.is_active),
            "created_at": coupon.created_at or datetime.now(timezone.utc),
            "updated_at": coupon.updated_at or datetime.now(timezone.utc),
        }

    return {
        "id": int(coupon["id"]),
        "code": str(coupon.get("code") or ""),
        "name": str(coupon.get("name") or coupon.get("code") or ""),
        "description": coupon.get("description"),
        "discount_type": _normalize_discount_type(coupon.get("discount_type") or coupon.get("coupon_type")),
        "discount_value": _to_float(coupon.get("discount_value") or coupon.get("value")) or 0.0,
        "min_subtotal": _to_float(coupon.get("min_subtotal") or coupon.get("minimum_amount")),
        "max_discount": _to_float(coupon.get("max_discount")),
        "starts_at": coupon.get("starts_at"),
        "ends_at": coupon.get("ends_at"),
        "usage_limit": coupon.get("usage_limit") or coupon.get("max_uses"),
        "usage_count": int(coupon.get("usage_count") or 0),
        "per_customer_limit": coupon.get("per_customer_limit"),
        "is_active": bool(coupon.get("is_active", True)),
        "created_at": coupon.get("created_at") or datetime.now(timezone.utc),
        "updated_at": coupon.get("updated_at") or datetime.now(timezone.utc),
    }


def _build_response_payload(result: CouponEvaluation) -> dict[str, Any]:
    return {
        "valid": result.valid,
        "code": result.code,
        "discount_type": result.discount_type,
        "discount_amount": _round_money(result.discount_amount),
        "free_shipping": result.free_shipping,
        "reason_code": result.reason_code,
        "message": result.message,
    }


def _count_db_customer_redemptions(
    db: Session,
    *,
    coupon_id: int,
    customer_email: str | None,
    customer_phone: str | None,
) -> int:
    redemptions = db.query(CouponRedemption).filter(CouponRedemption.coupon_id == coupon_id).all()
    normalized_email = _normalize_email(customer_email)
    normalized_phone = _normalize_phone(customer_phone)

    if not normalized_email and not normalized_phone:
        return 0

    count = 0
    for redemption in redemptions:
        matches_email = normalized_email and _normalize_email(redemption.customer_email) == normalized_email
        matches_phone = normalized_phone and _normalize_phone(redemption.customer_phone) == normalized_phone
        if matches_email or matches_phone:
            count += 1
    return count


def _count_mock_customer_redemptions(
    *,
    coupon_id: int,
    customer_email: str | None,
    customer_phone: str | None,
) -> int:
    return len(
        list_mock_coupon_redemptions(
            coupon_id=coupon_id,
            customer_email=customer_email,
            customer_phone=customer_phone,
        )
    )


def _evaluate_serialized_coupon(
    coupon: dict[str, Any],
    *,
    subtotal: float,
    customer_email: str | None,
    customer_phone: str | None,
    customer_redemptions: int,
    source: str,
) -> CouponEvaluation:
    now = datetime.now(timezone.utc)
    starts_at = coupon.get("starts_at")
    ends_at = coupon.get("ends_at")
    usage_limit = coupon.get("usage_limit")
    usage_count = int(coupon.get("usage_count") or 0)
    per_customer_limit = coupon.get("per_customer_limit")
    min_subtotal = _to_float(coupon.get("min_subtotal")) or 0.0
    discount_type = _normalize_discount_type(coupon.get("discount_type"))
    discount_value = _to_float(coupon.get("discount_value")) or 0.0
    max_discount = _to_float(coupon.get("max_discount"))

    if not bool(coupon.get("is_active", True)):
        return CouponEvaluation(
            valid=False,
            code=coupon["code"],
            message="Este cupon no esta activo.",
            reason_code="inactive",
        )
    if starts_at and starts_at > now:
        return CouponEvaluation(
            valid=False,
            code=coupon["code"],
            message="Este cupon aun no esta disponible.",
            reason_code="not_started",
        )
    if ends_at and ends_at < now:
        return CouponEvaluation(
            valid=False,
            code=coupon["code"],
            message="Este cupon ya expiro.",
            reason_code="expired",
        )
    if subtotal < min_subtotal:
        return CouponEvaluation(
            valid=False,
            code=coupon["code"],
            message=f"Este cupon requiere un subtotal minimo de ${min_subtotal:.2f}.",
            reason_code="subtotal_too_low",
        )
    if usage_limit is not None and usage_count >= int(usage_limit):
        return CouponEvaluation(
            valid=False,
            code=coupon["code"],
            message="Este cupon ya alcanzo su limite de uso.",
            reason_code="usage_limit_reached",
        )
    if per_customer_limit is not None and customer_redemptions >= int(per_customer_limit):
        return CouponEvaluation(
            valid=False,
            code=coupon["code"],
            message="Ya agotaste el limite permitido para este cupon.",
            reason_code="per_customer_limit_reached",
        )

    discount_amount = 0.0
    free_shipping = False

    if discount_type == "percentage":
        discount_amount = subtotal * (discount_value / 100)
    elif discount_type == "fixed_amount":
        discount_amount = discount_value
    elif discount_type == "free_shipping":
        free_shipping = True
    else:
        return CouponEvaluation(
            valid=False,
            code=coupon["code"],
            message="Tipo de cupon no soportado.",
            reason_code="invalid_code",
        )

    if max_discount is not None:
        discount_amount = min(discount_amount, max_discount)
    discount_amount = min(discount_amount, subtotal)
    discount_amount = _round_money(discount_amount)

    return CouponEvaluation(
        valid=True,
        code=coupon["code"],
        message="Envio gratis aplicado." if free_shipping else "Cupon aplicado correctamente.",
        reason_code="valid",
        discount_type=discount_type,
        discount_amount=discount_amount,
        free_shipping=free_shipping,
        coupon_id=int(coupon["id"]),
        source=source,
    )


def evaluate_coupon_code(
    db: Session,
    *,
    code: str | None,
    subtotal: float,
    customer_email: str | None = None,
    customer_phone: str | None = None,
) -> CouponEvaluation:
    normalized_code = _normalize_code(code)
    if not normalized_code:
        return CouponEvaluation(
            valid=False,
            code=None,
            message="Ingresa un codigo de cupon.",
            reason_code="invalid_code",
        )

    normalized_email = _normalize_email(customer_email)
    normalized_phone = _normalize_phone(customer_phone)

    try:
        coupon = (
            db.query(Coupon)
            .filter(func.upper(Coupon.code) == normalized_code)
            .first()
        )
        if coupon:
            serialized = _serialize_coupon(coupon)
            customer_redemptions = _count_db_customer_redemptions(
                db,
                coupon_id=int(coupon.id),
                customer_email=normalized_email,
                customer_phone=normalized_phone,
            )
            return _evaluate_serialized_coupon(
                serialized,
                subtotal=subtotal,
                customer_email=normalized_email,
                customer_phone=normalized_phone,
                customer_redemptions=customer_redemptions,
                source="db",
            )

        has_db_coupons = db.query(Coupon.id).first() is not None
        if has_db_coupons:
            return CouponEvaluation(
                valid=False,
                code=normalized_code,
                message="Cupon invalido.",
                reason_code="invalid_code",
            )
    except SQLAlchemyError:
        db.rollback()

    coupon = get_mock_coupon_by_code(normalized_code)
    if not coupon:
        return CouponEvaluation(
            valid=False,
            code=normalized_code,
            message="Cupon invalido.",
            reason_code="invalid_code",
        )

    serialized = _serialize_coupon(coupon)
    customer_redemptions = _count_mock_customer_redemptions(
        coupon_id=int(serialized["id"]),
        customer_email=normalized_email,
        customer_phone=normalized_phone,
    )
    return _evaluate_serialized_coupon(
        serialized,
        subtotal=subtotal,
        customer_email=normalized_email,
        customer_phone=normalized_phone,
        customer_redemptions=customer_redemptions,
        source="mock",
    )


def validate_coupon_request(db: Session, payload: CouponValidateRequest) -> dict[str, Any]:
    result = evaluate_coupon_code(
        db,
        code=payload.code,
        subtotal=payload.subtotal,
        customer_email=str(payload.customer_email) if payload.customer_email else None,
        customer_phone=payload.customer_phone,
    )
    return _build_response_payload(result)


def apply_coupon_to_order(
    db: Session,
    *,
    code: str | None,
    subtotal: float,
    customer_email: str | None,
    customer_phone: str | None,
    order_id: int | None,
    idempotency_key: str | None = None,
) -> CouponEvaluation:
    normalized_code = _normalize_code(code)
    if not normalized_code:
        return CouponEvaluation(valid=True, code=None, message="No coupon applied.", reason_code="valid")

    result = evaluate_coupon_code(
        db,
        code=normalized_code,
        subtotal=subtotal,
        customer_email=customer_email,
        customer_phone=customer_phone,
    )
    if not result.valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.message)

    if result.source == "db" and result.coupon_id is not None:
        if idempotency_key:
            existing_redemption = (
                db.query(CouponRedemption)
                .filter(CouponRedemption.idempotency_key == idempotency_key)
                .first()
            )
            if existing_redemption:
                return result
        coupon = db.query(Coupon).filter(Coupon.id == result.coupon_id).first()
        if not coupon:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No pudimos aplicar el cupon.")
        coupon.usage_count = int(coupon.usage_count or 0) + 1
        db.add(coupon)
        db.add(
            CouponRedemption(
                coupon_id=int(coupon.id),
                order_id=order_id,
                customer_email=_normalize_email(customer_email),
                customer_phone=_normalize_phone(customer_phone),
                discount_amount=result.discount_amount,
                idempotency_key=idempotency_key,
            )
        )
        return result

    if result.source == "mock" and result.coupon_id is not None:
        create_mock_coupon_redemption(
            {
                "coupon_id": result.coupon_id,
                "order_id": order_id,
                "customer_email": customer_email,
                "customer_phone": customer_phone,
                "discount_amount": result.discount_amount,
                "idempotency_key": idempotency_key,
            }
        )

    return result


def calculate_checkout_totals(
    db: Session,
    *,
    subtotal: float,
    coupon_code: str | None,
    customer_email: str | None,
    customer_phone: str | None,
    order_id: int | None = None,
    persist_redemption: bool = False,
    idempotency_key: str | None = None,
) -> tuple[float, float, str | None]:
    shipping_total = _base_shipping_total(subtotal)
    if not coupon_code:
        return 0.0, shipping_total, None

    coupon_result = (
        apply_coupon_to_order(
            db,
            code=coupon_code,
            subtotal=subtotal,
            customer_email=customer_email,
            customer_phone=customer_phone,
            order_id=order_id,
            idempotency_key=idempotency_key,
        )
        if persist_redemption
        else evaluate_coupon_code(
            db,
            code=coupon_code,
            subtotal=subtotal,
            customer_email=customer_email,
            customer_phone=customer_phone,
        )
    )

    if not coupon_result.valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=coupon_result.message)
    if coupon_result.free_shipping:
        shipping_total = 0.0

    return _round_money(coupon_result.discount_amount), _round_money(shipping_total), coupon_result.code


def _prepare_coupon_payload(
    payload: AdminCouponCreate | AdminCouponUpdate | AdminCouponDuplicateRequest,
    *,
    existing: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    merged = {**(existing or {}), **data}
    discount_type = _normalize_discount_type(merged.get("discount_type")) or "percentage"
    starts_at = merged.get("starts_at")
    ends_at = merged.get("ends_at")

    if starts_at and ends_at and ends_at < starts_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La fecha de fin debe ser posterior al inicio.")

    discount_value = float(merged.get("discount_value") or 0)
    if discount_type == "percentage" and discount_value > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El descuento porcentual no puede exceder 100.")

    if discount_type == "free_shipping":
        discount_value = 0.0
        merged["max_discount"] = None

    merged["code"] = _normalize_code(str(merged.get("code") or "")) or ""
    merged["discount_type"] = discount_type
    merged["discount_value"] = discount_value
    return merged


def list_admin_coupons(db: Session) -> list[dict[str, Any]]:
    try:
        coupons = db.query(Coupon).order_by(Coupon.created_at.desc()).all()
        if coupons:
            return [_serialize_coupon(coupon) for coupon in coupons]
    except SQLAlchemyError:
        db.rollback()

    return [_serialize_coupon(coupon) for coupon in list_mock_coupons()]


def get_admin_coupon(db: Session, coupon_id: int) -> dict[str, Any] | None:
    try:
        coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
        if coupon:
            return _serialize_coupon(coupon)

        has_db_coupons = db.query(Coupon.id).first() is not None
        if has_db_coupons:
            return None
    except SQLAlchemyError:
        db.rollback()

    coupon = get_mock_coupon(coupon_id)
    return _serialize_coupon(coupon) if coupon else None


def create_admin_coupon(db: Session, payload: AdminCouponCreate) -> dict[str, Any]:
    prepared = _prepare_coupon_payload(payload)

    try:
        existing = db.query(Coupon).filter(func.upper(Coupon.code) == prepared["code"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un cupon con ese codigo.")

        coupon = Coupon(
            code=prepared["code"],
            name=str(prepared["name"]).strip(),
            description=prepared.get("description"),
            discount_type=CouponType(prepared["discount_type"]),
            discount_value=prepared["discount_value"],
            min_subtotal=prepared.get("min_subtotal"),
            max_discount=prepared.get("max_discount"),
            starts_at=prepared.get("starts_at"),
            ends_at=prepared.get("ends_at"),
            usage_limit=prepared.get("usage_limit"),
            usage_count=0,
            per_customer_limit=prepared.get("per_customer_limit"),
            is_active=bool(prepared.get("is_active", True)),
        )
        db.add(coupon)
        db.commit()
        db.refresh(coupon)
        return _serialize_coupon(coupon)
    except HTTPException:
        raise
    except SQLAlchemyError:
        db.rollback()

    existing = get_mock_coupon_by_code(prepared["code"])
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un cupon con ese codigo.")
    return _serialize_coupon(create_mock_coupon(prepared))


def duplicate_admin_coupon(db: Session, coupon_id: int, payload: AdminCouponDuplicateRequest) -> dict[str, Any] | None:
    new_code = _normalize_code(payload.code)
    if not new_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nuevo codigo es obligatorio.")

    try:
        coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
        if coupon:
            duplicate = db.query(Coupon).filter(func.upper(Coupon.code) == new_code).first()
            if duplicate:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un cupon con ese codigo.")

            duplicated_coupon = Coupon(
                code=new_code,
                name=coupon.name,
                description=coupon.description,
                discount_type=coupon.discount_type,
                discount_value=coupon.discount_value,
                min_subtotal=coupon.min_subtotal,
                max_discount=coupon.max_discount,
                starts_at=coupon.starts_at,
                ends_at=coupon.ends_at,
                usage_limit=coupon.usage_limit,
                usage_count=0,
                per_customer_limit=coupon.per_customer_limit,
                is_active=coupon.is_active,
            )
            db.add(duplicated_coupon)
            db.commit()
            db.refresh(duplicated_coupon)
            return _serialize_coupon(duplicated_coupon)

        has_db_coupons = db.query(Coupon.id).first() is not None
        if has_db_coupons:
            return None
    except HTTPException:
        raise
    except SQLAlchemyError:
        db.rollback()

    existing_mock = get_mock_coupon(coupon_id)
    if not existing_mock:
        return None
    duplicate_mock = get_mock_coupon_by_code(new_code)
    if duplicate_mock:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un cupon con ese codigo.")

    duplicated = create_mock_coupon(
        {
            **_serialize_coupon(existing_mock),
            "code": new_code,
            "usage_count": 0,
        }
    )
    return _serialize_coupon(duplicated)


def update_admin_coupon(db: Session, coupon_id: int, payload: AdminCouponUpdate) -> dict[str, Any] | None:
    try:
        coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
        if coupon:
            existing = _serialize_coupon(coupon)
            prepared = _prepare_coupon_payload(payload, existing=existing)
            duplicate = (
                db.query(Coupon)
                .filter(func.upper(Coupon.code) == prepared["code"], Coupon.id != coupon_id)
                .first()
            )
            if duplicate:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un cupon con ese codigo.")

            coupon.code = prepared["code"]
            coupon.name = str(prepared["name"]).strip()
            coupon.description = prepared.get("description")
            coupon.discount_type = CouponType(prepared["discount_type"])
            coupon.discount_value = prepared["discount_value"]
            coupon.min_subtotal = prepared.get("min_subtotal")
            coupon.max_discount = prepared.get("max_discount")
            coupon.starts_at = prepared.get("starts_at")
            coupon.ends_at = prepared.get("ends_at")
            coupon.usage_limit = prepared.get("usage_limit")
            coupon.per_customer_limit = prepared.get("per_customer_limit")
            if "is_active" in prepared:
                coupon.is_active = bool(prepared["is_active"])
            db.add(coupon)
            db.commit()
            db.refresh(coupon)
            return _serialize_coupon(coupon)

        has_db_coupons = db.query(Coupon.id).first() is not None
        if has_db_coupons:
            return None
    except HTTPException:
        raise
    except SQLAlchemyError:
        db.rollback()

    existing_mock = get_mock_coupon(coupon_id)
    if not existing_mock:
        return None
    prepared = _prepare_coupon_payload(payload, existing=_serialize_coupon(existing_mock))
    duplicate_mock = get_mock_coupon_by_code(prepared["code"])
    if duplicate_mock and int(duplicate_mock["id"]) != coupon_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un cupon con ese codigo.")
    updated = update_mock_coupon(coupon_id, prepared)
    return _serialize_coupon(updated) if updated else None


def delete_admin_coupon(db: Session, coupon_id: int) -> str | None:
    try:
        coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
        if coupon:
            has_redemptions = (
                db.query(CouponRedemption.id)
                .filter(CouponRedemption.coupon_id == coupon_id)
                .first()
                is not None
            )
            if has_redemptions:
                coupon.is_active = False
                db.add(coupon)
                db.commit()
                return "Coupon deactivated because it already has redemptions"

            db.delete(coupon)
            db.commit()
            return "Coupon deleted"

        has_db_coupons = db.query(Coupon.id).first() is not None
        if has_db_coupons:
            return None
    except SQLAlchemyError:
        db.rollback()

    has_redemptions = len(list_mock_coupon_redemptions(coupon_id=coupon_id)) > 0
    if has_redemptions:
        updated = update_mock_coupon(coupon_id, {"is_active": False})
        return "Coupon deactivated because it already has redemptions" if updated else None

    deleted = delete_mock_coupon(coupon_id)
    return "Coupon deleted" if deleted else None
