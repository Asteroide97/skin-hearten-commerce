from fastapi import APIRouter

from app.schemas.catalog import CategoryRead
from app.services.mock_store import list_categories

router = APIRouter(prefix="/categories")


@router.get("", response_model=list[CategoryRead])
def get_categories() -> list[CategoryRead]:
    return [CategoryRead.model_validate(category) for category in list_categories()]

