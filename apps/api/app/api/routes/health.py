from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine

router = APIRouter(prefix="/health")


def build_health_payload() -> dict[str, str]:
    database_status = "ok"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        database_status = "unavailable"

    return {
        "status": "ok",
        "environment": settings.environment,
        "database": database_status,
    }


@router.get("")
def api_healthcheck() -> dict[str, str]:
    return build_health_payload()
