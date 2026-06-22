from __future__ import annotations

import json
from collections.abc import Iterable

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _clean_origin(value: str) -> str:
    return value.strip().rstrip("/")


class Settings(BaseSettings):
    app_name: str = "Skin Hearten API"
    environment: str = "development"
    api_v1_str: str = "/api/v1"
    api_base_url: str = ""
    frontend_url: str = "http://localhost:3000"
    backend_cors_origins: list[str] = Field(default_factory=list)
    database_url: str = "sqlite:///./skin_hearten.db"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 24
    admin_email: str = "admin@skinhearten.com"
    admin_password: str = "Admin123!"
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    mercadopago_access_token: str = ""
    mercadopago_webhook_secret: str = ""
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    azure_blob_connection_string: str = ""
    azure_blob_container: str = "skin-hearten"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def parse_backend_cors_origins(cls, value: object) -> list[str]:
        if value is None or value == "":
            return []

        if isinstance(value, str):
            normalized_value = value.strip()
            if not normalized_value:
                return []
            if normalized_value.startswith("["):
                parsed = json.loads(normalized_value)
                if not isinstance(parsed, list):
                    raise ValueError("BACKEND_CORS_ORIGINS must be a JSON list or comma-separated list")
                return [_clean_origin(str(entry)) for entry in parsed if str(entry).strip()]
            return [_clean_origin(entry) for entry in normalized_value.split(",") if entry.strip()]

        if isinstance(value, Iterable):
            return [_clean_origin(str(entry)) for entry in value if str(entry).strip()]

        raise ValueError("BACKEND_CORS_ORIGINS must be a list")

    @property
    def jwt_expire_minutes(self) -> int:
        return self.access_token_expire_minutes

    @property
    def allowed_cors_origins(self) -> list[str]:
        default_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3006",
            "http://127.0.0.1:3006",
            "http://localhost:3007",
            "http://127.0.0.1:3007",
            "https://skinhearten.mx",
            "https://www.skinhearten.mx",
        ]

        configured_origins = default_origins + self.backend_cors_origins
        if self.frontend_url.strip():
            configured_origins.append(self.frontend_url)

        unique_origins: list[str] = []
        seen: set[str] = set()
        for origin in configured_origins:
            normalized_origin = _clean_origin(origin)
            if not normalized_origin or normalized_origin in seen:
                continue
            seen.add(normalized_origin)
            unique_origins.append(normalized_origin)
        return unique_origins


settings = Settings()
