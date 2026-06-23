from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.api.routes.health import build_health_payload
from app.core.config import settings
from app.services.product_media_storage import get_local_uploads_root

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    openapi_url=f"{settings.api_v1_str}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_local_product_uploads_dir()
app.mount("/uploads", StaticFiles(directory=get_local_uploads_root(), check_dir=False), name="uploads")


@app.get("/health", tags=["health"])
def root_healthcheck() -> dict[str, str]:
    return build_health_payload()


app.include_router(api_router, prefix=settings.api_v1_str)
