from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, optional_oauth2_scheme
from app.core.security import create_access_token, try_decode_token, verify_password
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.common import MessageResponse
from app.services.persistent_identity import (
    create_customer_identity,
    get_admin_identity_by_email,
    get_customer_identity_by_email,
    get_identity_by_scope,
)

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    if get_customer_identity_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer already exists")

    customer = create_customer_identity(db, payload)
    access_token = create_access_token(subject=customer["email"], scope="customer")
    return TokenResponse(access_token=access_token, scope="customer")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    customer = get_customer_identity_by_email(db, payload.email)
    if customer and verify_password(payload.password, customer["hashed_password"]):
        access_token = create_access_token(subject=customer["email"], scope="customer")
        return TokenResponse(access_token=access_token, scope="customer")

    admin = get_admin_identity_by_email(db, payload.email)
    if admin and verify_password(payload.password, admin["hashed_password"]):
        access_token = create_access_token(subject=admin["email"], scope="admin")
        return TokenResponse(access_token=access_token, scope="admin")

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(_: ForgotPasswordRequest) -> MessageResponse:
    return MessageResponse(message="Password reset flow queued")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(_: ResetPasswordRequest) -> MessageResponse:
    return MessageResponse(message="Password updated")


@router.get("/me", response_model=MeResponse)
def get_me(
    token: str | None = Depends(optional_oauth2_scheme),
    db: Session = Depends(get_db),
) -> MeResponse:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    payload = try_decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    scope = str(payload.get("scope") or "")
    identity = get_identity_by_scope(db, scope, payload["sub"])
    if not identity:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identity not found")

    return MeResponse(
        id=identity["id"],
        email=identity["email"],
        first_name=identity["first_name"],
        last_name=identity["last_name"],
        scope=scope,
    )
