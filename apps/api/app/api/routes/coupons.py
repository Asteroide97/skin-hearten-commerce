from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.schemas.coupon import CouponValidateRequest, CouponValidateResponse
from app.services.coupon_engine import validate_coupon_request

router = APIRouter(prefix="/coupons")


@router.post("/validate", response_model=CouponValidateResponse)
def validate_coupon(
    payload: CouponValidateRequest,
    db: Session = Depends(get_db),
) -> CouponValidateResponse:
    result = validate_coupon_request(db, payload)
    return CouponValidateResponse.model_validate(result)
