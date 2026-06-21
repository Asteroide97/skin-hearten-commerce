from fastapi import APIRouter

from app.schemas.catalog import BrandRead
from app.services.mock_store import list_brands

router = APIRouter(prefix="/brands")


@router.get("", response_model=list[BrandRead])
def get_brands() -> list[BrandRead]:
    return [BrandRead.model_validate(brand) for brand in list_brands()]

