from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status as http_status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db.session import get_db
from app.schemas.imports import ImportJobDetailRead, ImportJobSummaryRead
from app.services.shopify_importer import (
    get_import_job_detail,
    import_shopify_customers_csv,
    import_shopify_orders_csv,
    import_shopify_products_csv,
    list_import_jobs,
)

router = APIRouter(prefix="/admin/imports")


async def _read_upload_bytes(file: UploadFile) -> tuple[bytes, str]:
    filename = file.filename or "shopify-import.csv"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="El archivo CSV esta vacio.")
    return content, filename


@router.post("/shopify/customers", response_model=ImportJobDetailRead)
async def upload_shopify_customers_csv(
    file: UploadFile = File(...),
    admin_user: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ImportJobDetailRead:
    content, filename = await _read_upload_bytes(file)
    job = import_shopify_customers_csv(
        db,
        file_bytes=content,
        filename=filename,
        created_by_user_id=admin_user.get("id"),
    )
    return ImportJobDetailRead.model_validate(job)


@router.post("/shopify/orders", response_model=ImportJobDetailRead)
async def upload_shopify_orders_csv(
    file: UploadFile = File(...),
    admin_user: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ImportJobDetailRead:
    content, filename = await _read_upload_bytes(file)
    job = import_shopify_orders_csv(
        db,
        file_bytes=content,
        filename=filename,
        created_by_user_id=admin_user.get("id"),
    )
    return ImportJobDetailRead.model_validate(job)


@router.post("/shopify/products", response_model=ImportJobDetailRead)
async def upload_shopify_products_csv(
    file: UploadFile = File(...),
    admin_user: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ImportJobDetailRead:
    content, filename = await _read_upload_bytes(file)
    job = import_shopify_products_csv(
        db,
        file_bytes=content,
        filename=filename,
        created_by_user_id=admin_user.get("id"),
    )
    return ImportJobDetailRead.model_validate(job)


@router.get("", response_model=list[ImportJobSummaryRead])
def list_admin_import_jobs(
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[ImportJobSummaryRead]:
    jobs = list_import_jobs(db)
    return [ImportJobSummaryRead.model_validate(job) for job in jobs]


@router.get("/{job_id}", response_model=ImportJobDetailRead)
def get_admin_import_job(
    job_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ImportJobDetailRead:
    job = get_import_job_detail(db, job_id)
    if not job:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Import job not found")
    return ImportJobDetailRead.model_validate(job)
