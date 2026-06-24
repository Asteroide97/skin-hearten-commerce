from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, get_db
from app.schemas.common import MessageResponse
from app.schemas.coupon import (
    AdminCouponCreate,
    AdminCouponDuplicateRequest,
    AdminCouponRead,
    AdminCouponUpdate,
)
from app.services.coupon_engine import (
    create_admin_coupon,
    delete_admin_coupon,
    duplicate_admin_coupon,
    get_admin_coupon,
    list_admin_coupons,
    update_admin_coupon,
)

router = APIRouter(prefix="/admin/coupons")


@router.get("", response_model=list[AdminCouponRead])
def list_coupons_admin(
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[AdminCouponRead]:
    coupons = list_admin_coupons(db)
    return [AdminCouponRead.model_validate(coupon) for coupon in coupons]


@router.post("", response_model=AdminCouponRead, status_code=status.HTTP_201_CREATED)
def create_coupon_admin(
    payload: AdminCouponCreate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminCouponRead:
    coupon = create_admin_coupon(db, payload)
    return AdminCouponRead.model_validate(coupon)


@router.get("/{coupon_id}", response_model=AdminCouponRead)
def get_coupon_admin(
    coupon_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminCouponRead:
    coupon = get_admin_coupon(db, coupon_id)
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    return AdminCouponRead.model_validate(coupon)


@router.post("/{coupon_id}/duplicate", response_model=AdminCouponRead, status_code=status.HTTP_201_CREATED)
def duplicate_coupon_admin(
    coupon_id: int,
    payload: AdminCouponDuplicateRequest,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminCouponRead:
    coupon = duplicate_admin_coupon(db, coupon_id, payload)
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    return AdminCouponRead.model_validate(coupon)


@router.patch("/{coupon_id}", response_model=AdminCouponRead)
def patch_coupon_admin(
    coupon_id: int,
    payload: AdminCouponUpdate,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminCouponRead:
    coupon = update_admin_coupon(db, coupon_id, payload)
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    return AdminCouponRead.model_validate(coupon)


@router.delete("/{coupon_id}", response_model=MessageResponse)
def remove_coupon_admin(
    coupon_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    message = delete_admin_coupon(db, coupon_id)
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    return MessageResponse(message=message)
