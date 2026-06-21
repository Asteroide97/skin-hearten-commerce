from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import try_decode_token
from app.db.session import get_db
from app.services.mock_store import get_mock_admin_by_email, get_mock_customer_by_email

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_customer(token: str = Depends(oauth2_scheme)) -> dict:
    payload = try_decode_token(token)
    if not payload or payload.get("scope") != "customer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid customer token")

    customer = get_mock_customer_by_email(payload["sub"])
    if not customer:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Customer not found")
    return customer


def get_current_admin(token: str = Depends(oauth2_scheme)) -> dict:
    payload = try_decode_token(token)
    if not payload or payload.get("scope") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")

    user = get_mock_admin_by_email(payload["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found")
    return user


__all__ = ["get_db", "get_current_admin", "get_current_customer", "Session"]
