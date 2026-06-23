from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status

from app.core.config import settings

ALLOWED_PRODUCT_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
LOCAL_STORAGE_PREFIX = "local:"
AZURE_STORAGE_PREFIX = "azure:"


def get_local_uploads_root() -> Path:
    return Path(__file__).resolve().parents[2] / "uploads"


def ensure_local_product_uploads_dir() -> Path:
    product_dir = get_local_uploads_root() / "products"
    product_dir.mkdir(parents=True, exist_ok=True)
    return product_dir


def validate_product_image_upload(*, content: bytes, content_type: str | None) -> str:
    normalized_content_type = (content_type or "").strip().lower()
    if normalized_content_type not in ALLOWED_PRODUCT_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten archivos JPEG, PNG o WebP.",
        )

    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La imagen esta vacia.")

    if len(content) > MAX_PRODUCT_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen supera el limite de 5 MB.",
        )

    return ALLOWED_PRODUCT_IMAGE_TYPES[normalized_content_type]


def _asset_base_url() -> str:
    return (settings.public_asset_base_url or settings.api_base_url).strip().rstrip("/")


def _build_local_public_url(relative_path: str) -> str:
    path = f"/uploads/{relative_path.lstrip('/')}"
    base_url = _asset_base_url()
    return f"{base_url}{path}" if base_url else path


def _build_azure_public_url(blob_path: str, *, blob_url: str) -> str:
    base_url = settings.public_asset_base_url.strip().rstrip("/")
    if base_url:
        return f"{base_url}/{blob_path.lstrip('/')}"
    return blob_url


def _parse_storage_path(storage_path: str | None) -> tuple[str | None, str | None]:
    if not storage_path or ":" not in storage_path:
        return None, None
    prefix, relative_path = storage_path.split(":", 1)
    return prefix, relative_path.lstrip("/")


def store_product_image_asset(
    *,
    content: bytes,
    content_type: str | None,
) -> dict[str, str]:
    extension = validate_product_image_upload(content=content, content_type=content_type)
    filename = f"{uuid4().hex}{extension}"
    relative_path = f"products/{filename}"

    if settings.azure_blob_connection_string.strip() and settings.azure_blob_container.strip():
        try:
            from azure.core.exceptions import ResourceExistsError
            from azure.storage.blob import BlobServiceClient, ContentSettings
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Azure Blob Storage no esta disponible en este entorno.",
            ) from exc

        blob_service_client = BlobServiceClient.from_connection_string(settings.azure_blob_connection_string)
        container_client = blob_service_client.get_container_client(settings.azure_blob_container)
        try:
            container_client.create_container()
        except ResourceExistsError:
            pass

        blob_client = container_client.get_blob_client(relative_path)
        blob_client.upload_blob(
            content,
            overwrite=True,
            content_settings=ContentSettings(content_type=(content_type or "application/octet-stream")),
        )
        return {
            "storage_path": f"{AZURE_STORAGE_PREFIX}{relative_path}",
            "url": _build_azure_public_url(relative_path, blob_url=blob_client.url),
        }

    product_uploads_dir = ensure_local_product_uploads_dir()
    file_path = product_uploads_dir / filename
    file_path.write_bytes(content)
    return {
        "storage_path": f"{LOCAL_STORAGE_PREFIX}{relative_path}",
        "url": _build_local_public_url(relative_path),
    }


def delete_product_image_asset(*, storage_path: str | None, public_url: str | None = None) -> None:
    prefix, relative_path = _parse_storage_path(storage_path)

    if prefix == "azure" and relative_path:
        if not settings.azure_blob_connection_string.strip() or not settings.azure_blob_container.strip():
            return
        try:
            from azure.storage.blob import BlobServiceClient
        except ImportError:
            return

        blob_service_client = BlobServiceClient.from_connection_string(settings.azure_blob_connection_string)
        blob_client = blob_service_client.get_blob_client(settings.azure_blob_container, relative_path)
        try:
            blob_client.delete_blob(delete_snapshots="include")
        except Exception:
            return
        return

    if prefix == "local" and relative_path:
        file_path = get_local_uploads_root() / relative_path
        try:
            file_path.unlink(missing_ok=True)
        except Exception:
            return
        return

    if public_url and public_url.startswith("/uploads/"):
        fallback_relative_path = public_url.removeprefix("/uploads/").lstrip("/")
        if fallback_relative_path:
            try:
                (get_local_uploads_root() / fallback_relative_path).unlink(missing_ok=True)
            except Exception:
                return
