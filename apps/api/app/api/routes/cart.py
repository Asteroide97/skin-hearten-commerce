from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_customer
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartRead
from app.services.mock_store import add_cart_item, get_cart, remove_cart_item, update_cart_item

router = APIRouter(prefix="/cart")


@router.get("", response_model=CartRead)
def read_cart(customer: dict = Depends(get_current_customer)) -> CartRead:
    return CartRead.model_validate(get_cart(customer["id"]))


@router.post("/items", response_model=CartRead)
def create_cart_item(payload: CartItemCreate, customer: dict = Depends(get_current_customer)) -> CartRead:
    try:
        cart = add_cart_item(customer["id"], payload.product_id, payload.quantity)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return CartRead.model_validate(cart)


@router.put("/items/{item_id}", response_model=CartRead)
def edit_cart_item(
    item_id: int,
    payload: CartItemUpdate,
    customer: dict = Depends(get_current_customer),
) -> CartRead:
    try:
        cart = update_cart_item(customer["id"], item_id, payload.quantity)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return CartRead.model_validate(cart)


@router.delete("/items/{item_id}", response_model=CartRead)
def delete_cart_item(item_id: int, customer: dict = Depends(get_current_customer)) -> CartRead:
    cart = remove_cart_item(customer["id"], item_id)
    return CartRead.model_validate(cart)

