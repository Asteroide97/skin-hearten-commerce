from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import optional_oauth2_scheme
from app.core.security import create_access_token, get_password_hash, try_decode_token, verify_password
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.common import MessageResponse
from app.services.mock_store import create_mock_customer, get_mock_admin_by_email, get_mock_customer_by_email

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest) -> TokenResponse:
    if get_mock_customer_by_email(payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer already exists")

    customer = create_mock_customer(
        {
            "email": payload.email,
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "phone": payload.phone,
            "hashed_password": get_password_hash(payload.password),
        }
    )
    access_token = create_access_token(subject=customer["email"], scope="customer")
    return TokenResponse(access_token=access_token, scope="customer")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    customer = get_mock_customer_by_email(payload.email)
    if customer and verify_password(payload.password, customer["hashed_password"]):
        access_token = create_access_token(subject=customer["email"], scope="customer")
        return TokenResponse(access_token=access_token, scope="customer")

    admin = get_mock_admin_by_email(payload.email)
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
def get_me(token: str | None = Depends(optional_oauth2_scheme)) -> MeResponse:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    payload = try_decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    scope = payload.get("scope")
    if scope == "customer":
        identity = get_mock_customer_by_email(payload["sub"])
    elif scope == "admin":
        identity = get_mock_admin_by_email(payload["sub"])
    else:
        identity = None

    if not identity:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identity not found")

    return MeResponse(
        id=identity["id"],
        email=identity["email"],
        first_name=identity["first_name"],
        last_name=identity["last_name"],
        scope=str(scope),
    )
