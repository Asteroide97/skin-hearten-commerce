from __future__ import annotations

import csv
import io
import re
from datetime import datetime, timezone
from html import unescape
from typing import Any

from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import engine
from app.models import (
    Base,
    Brand,
    Category,
    CRMContact,
    Customer,
    CustomerAddress,
    ImportJob,
    Order,
    OrderItem,
    Payment,
    Product,
    ProductImage,
)
from app.models.enums import CRMLifecycleStatus, OrderStatus, PaymentProvider, PaymentStatus
from app.services.mock_store import (
    BRANDS,
    CATEGORIES,
    CUSTOMER_ADDRESSES,
    CUSTOMERS,
    ORDERS,
    PAYMENTS,
    PRODUCTS,
    create_entity,
    create_import_job as create_mock_import_job,
    create_order as create_mock_order,
    create_payment as create_mock_payment,
    create_product as create_mock_product,
    get_import_job as get_mock_import_job,
    list_import_jobs as list_mock_import_jobs,
    update_import_job as update_mock_import_job,
    update_order as update_mock_order,
    update_product as update_mock_product,
    upsert_crm_contact as upsert_mock_crm_contact,
    upsert_mock_customer,
    upsert_mock_customer_address,
)

_import_tables_initialized = False
_DEFAULT_IMPORT_CATEGORY = "Shopify Import"
_DEFAULT_IMPORT_BRAND = "Shopify Import"


def _ensure_import_tables() -> None:
    global _import_tables_initialized

    if _import_tables_initialized:
        return

    Base.metadata.create_all(bind=engine, tables=[ImportJob.__table__])
    _import_tables_initialized = True


def _normalize_header(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
    return normalized.strip("_")


def _clean_string(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    return cleaned.strip("-") or "shopify-import"


def _strip_html(value: str) -> str:
    without_tags = re.sub(r"<[^>]+>", " ", value or "")
    normalized_spaces = re.sub(r"\s+", " ", unescape(without_tags))
    return normalized_spaces.strip()


def _normalize_email(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    return normalized or None


def _normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    digits = "".join(character for character in value if character.isdigit())
    return digits or None


def _parse_bool(value: str | None) -> bool:
    normalized = _clean_string(value).lower()
    return normalized in {"1", "true", "yes", "y", "si", "sí", "subscribed", "accepts marketing", "active"}


def _parse_float(value: str | None) -> float | None:
    if value is None:
        return None
    normalized = _clean_string(value)
    if not normalized:
        return None

    normalized = normalized.replace("$", "").replace("MXN", "").replace("USD", "").strip()
    normalized = normalized.replace(",", "")
    if normalized.startswith("(") and normalized.endswith(")"):
        normalized = f"-{normalized[1:-1]}"
    try:
        return round(float(normalized), 2)
    except ValueError:
        return None


def _parse_int(value: str | None) -> int | None:
    parsed = _parse_float(value)
    if parsed is None:
        return None
    return int(parsed)


def _parse_datetime(value: str | None) -> datetime | None:
    normalized = _clean_string(value)
    if not normalized:
        return None

    iso_candidate = normalized.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(iso_candidate)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        pass

    patterns = [
        "%Y-%m-%d %H:%M:%S %z",
        "%Y-%m-%d %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y %H:%M:%S",
        "%Y-%m-%d",
    ]
    for pattern in patterns:
        try:
            parsed = datetime.strptime(normalized, pattern)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _split_name(first_name: str | None, last_name: str | None, full_name: str | None = None) -> tuple[str, str]:
    normalized_first = _clean_string(first_name)
    normalized_last = _clean_string(last_name)
    if normalized_first or normalized_last:
        return normalized_first or "Cliente", normalized_last or "Shopify"

    raw_full_name = _clean_string(full_name)
    if not raw_full_name:
        return "Cliente", "Shopify"

    parts = [part for part in raw_full_name.split() if part]
    if len(parts) == 1:
        return parts[0], "Shopify"
    return parts[0], " ".join(parts[1:])


def _split_tags(value: str | None) -> list[str]:
    raw_value = _clean_string(value)
    if not raw_value:
        return []
    return [entry.strip() for entry in raw_value.split(",") if entry.strip()]


def _join_lines(values: list[str]) -> str | None:
    cleaned = [value.strip() for value in values if value.strip()]
    return "\n".join(cleaned) if cleaned else None


def _preview_row(row: dict[str, str]) -> dict[str, str]:
    compact: dict[str, str] = {}
    for key, value in row.items():
        if not value:
            continue
        compact[key] = value[:160]
        if len(compact) >= 12:
            break
    return compact


def _read_csv_rows(file_bytes: bytes) -> list[tuple[int, dict[str, str]]]:
    decoded: str | None = None
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            decoded = file_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if decoded is None:
        raise ValueError("No pudimos decodificar el archivo CSV.")

    reader = csv.DictReader(io.StringIO(decoded))
    rows: list[tuple[int, dict[str, str]]] = []
    for row_number, raw_row in enumerate(reader, start=2):
        normalized_row = {
            _normalize_header(header): _clean_string(value)
            for header, value in (raw_row or {}).items()
            if header is not None
        }
        if not any(value for value in normalized_row.values()):
            continue
        rows.append((row_number, normalized_row))
    return rows


def _get_first(row: dict[str, str], *keys: str) -> str | None:
    for key in keys:
        value = row.get(key)
        if value:
            return value
    return None


def _derive_skin_types(tags: list[str]) -> list[str]:
    normalized_tags = {tag.lower() for tag in tags}
    mapping = {
        "seca": "seca",
        "dry": "seca",
        "mixta": "mixta",
        "combination": "mixta",
        "grasa": "grasa",
        "oily": "grasa",
        "sensible": "sensible",
        "sensitive": "sensible",
    }
    detected = [label for key, label in mapping.items() if key in normalized_tags]
    return sorted(set(detected))


def _derive_concerns(tags: list[str], description: str, product_type: str) -> list[str]:
    haystack = " ".join([tag.lower() for tag in tags] + [description.lower(), product_type.lower()])
    mapping = {
        "acne": "Acne",
        "manchas": "Manchas",
        "spot": "Manchas",
        "antiedad": "Lineas de expresion",
        "anti-age": "Lineas de expresion",
        "anti aging": "Lineas de expresion",
        "hidrat": "Hidratacion",
        "luminous": "Luminosidad",
        "luminos": "Luminosidad",
        "sun": "Proteccion solar",
        "solar": "Proteccion solar",
    }
    detected = [label for key, label in mapping.items() if key in haystack]
    return sorted(set(detected))


def _map_payment_provider(value: str | None) -> PaymentProvider:
    normalized = _clean_string(value).lower()
    if "mercado" in normalized:
        return PaymentProvider.MERCADOPAGO
    if "paypal" in normalized:
        return PaymentProvider.PAYPAL
    return PaymentProvider.STRIPE


def _map_payment_status(value: str | None) -> PaymentStatus:
    normalized = _clean_string(value).lower()
    if normalized in {"paid", "partially_paid"}:
        return PaymentStatus.PAID
    if normalized in {"refunded", "partially_refunded"}:
        return PaymentStatus.REFUNDED
    if normalized in {"failed", "voided"}:
        return PaymentStatus.FAILED
    if normalized in {"authorized", "pending"}:
        return PaymentStatus.PENDING
    return PaymentStatus.PENDING


def _map_order_status(
    *,
    financial_status: str | None,
    fulfillment_status: str | None,
    cancelled_at: datetime | None,
) -> OrderStatus:
    if cancelled_at:
        return OrderStatus.CANCELED

    normalized_financial = _clean_string(financial_status).lower()
    normalized_fulfillment = _clean_string(fulfillment_status).lower()

    if normalized_financial in {"refunded", "partially_refunded"}:
        return OrderStatus.REFUNDED
    if normalized_fulfillment in {"delivered"}:
        return OrderStatus.DELIVERED
    if normalized_fulfillment in {"fulfilled", "shipped"}:
        return OrderStatus.SHIPPED
    if normalized_financial in {"paid", "partially_paid"}:
        return OrderStatus.PAID
    return OrderStatus.PENDING


def _job_to_dict(job: ImportJob | dict[str, Any]) -> dict[str, Any]:
    if isinstance(job, dict):
        return {
            "id": int(job["id"]),
            "source": str(job["source"]),
            "import_type": str(job["import_type"]),
            "filename": str(job["filename"]),
            "status": str(job["status"]),
            "total_rows": int(job.get("total_rows") or 0),
            "processed_rows": int(job.get("processed_rows") or 0),
            "success_rows": int(job.get("success_rows") or 0),
            "failed_rows": int(job.get("failed_rows") or 0),
            "error_report_json": list(job.get("error_report_json") or []),
            "created_by_user_id": job.get("created_by_user_id"),
            "notes": job.get("notes"),
            "created_at": job.get("created_at") or datetime.now(timezone.utc),
            "completed_at": job.get("completed_at"),
        }

    return {
        "id": int(job.id),
        "source": job.source,
        "import_type": job.import_type,
        "filename": job.filename,
        "status": job.status,
        "total_rows": int(job.total_rows or 0),
        "processed_rows": int(job.processed_rows or 0),
        "success_rows": int(job.success_rows or 0),
        "failed_rows": int(job.failed_rows or 0),
        "error_report_json": list(job.error_report_json or []),
        "created_by_user_id": job.created_by_user_id,
        "notes": job.notes,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
    }


def normalize_shopify_customer_row(row: dict[str, str], row_number: int) -> dict[str, Any]:
    first_name, last_name = _split_name(
        _get_first(row, "first_name"),
        _get_first(row, "last_name"),
        _get_first(row, "default_address_name", "name", "customer_name"),
    )
    phone = _normalize_phone(
        _get_first(row, "phone", "default_address_phone", "billing_phone", "shipping_phone")
    )
    email = _normalize_email(_get_first(row, "email", "customer_email"))
    if not email:
        email = f"shopify-customer-{phone or row_number}@import.local"

    accepts_marketing = _parse_bool(
        _get_first(row, "accepts_email_marketing", "accepts_marketing", "accepts_sms_marketing")
    )

    address = {
        "address_line1": _get_first(row, "default_address_address1", "address1", "billing_address1", "shipping_address1"),
        "address_line2": _get_first(row, "default_address_address2", "address2", "billing_address2", "shipping_address2"),
        "city": _get_first(row, "default_address_city", "city", "billing_city", "shipping_city"),
        "state": _get_first(
            row,
            "default_address_province_code",
            "default_address_province",
            "province_code",
            "province",
            "billing_province",
            "shipping_province",
        ),
        "postal_code": _get_first(row, "default_address_zip", "zip", "billing_zip", "shipping_zip"),
        "country": _get_first(
            row,
            "default_address_country_code",
            "default_address_country",
            "country_code",
            "country",
            "billing_country",
            "shipping_country",
        ),
        "label": "Shopify import",
    }

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "accepted_marketing": accepts_marketing,
        "address": address,
        "lifecycle_status": "customer"
        if (_parse_int(_get_first(row, "orders_count")) or 0) > 0 or (_parse_float(_get_first(row, "total_spent")) or 0) > 0
        else "lead",
    }


def normalize_shopify_product_row(row: dict[str, str], row_number: int) -> dict[str, Any]:
    title = _get_first(row, "title", "product_title")
    handle = _get_first(row, "handle", "slug")
    if not title and not handle:
        raise ValueError(f"Fila {row_number}: falta Title o Handle para identificar el producto.")

    product_type = _get_first(row, "type", "product_category", "product_type") or _DEFAULT_IMPORT_CATEGORY
    vendor = _get_first(row, "vendor", "brand") or _DEFAULT_IMPORT_BRAND
    tags = _split_tags(_get_first(row, "tags"))
    description = _strip_html(_get_first(row, "body_html", "body_html_", "body", "description") or "")
    images = [
        image
        for image in {
            _get_first(row, "image_src", "image_url"),
            _get_first(row, "variant_image"),
        }
        if image
    ]

    price = _parse_float(_get_first(row, "variant_price", "price")) or 0.0
    compare_at = _parse_float(_get_first(row, "variant_compare_at_price", "compare_at_price"))
    discount_price = price if compare_at and compare_at > price else None
    base_price = compare_at if compare_at and compare_at > price else price

    variant_sku = _get_first(row, "variant_sku", "sku")
    key = _slugify(handle or title or f"shopify-product-{row_number}")

    return {
        "group_key": handle or variant_sku or key,
        "name": title or handle or f"Producto Shopify {row_number}",
        "slug": _slugify(handle or title or f"shopify-product-{row_number}"),
        "sku": variant_sku or f"SHOPIFY-{key.upper()}",
        "brand_name": vendor,
        "category_name": product_type,
        "price": round(base_price, 2),
        "discount_price": round(discount_price, 2) if discount_price is not None else None,
        "stock": _parse_int(_get_first(row, "variant_inventory_qty", "inventory_qty")) or 0,
        "description": description or title or "Producto importado desde Shopify.",
        "benefits": [],
        "ingredients": [],
        "usage": [],
        "skin_type": _derive_skin_types(tags),
        "concern": _derive_concerns(tags, description, product_type),
        "is_active": _clean_string(_get_first(row, "status", "published")).lower() not in {"draft", "archived", "false"},
        "images": images,
        "tags": tags,
    }


def normalize_shopify_order_row(row: dict[str, str], row_number: int) -> dict[str, Any]:
    order_number = _get_first(row, "name", "order_number", "order_name")
    if not order_number:
        raise ValueError(f"Fila {row_number}: falta Name/Order Number para identificar el pedido.")

    first_name, last_name = _split_name(
        _get_first(row, "shipping_first_name", "billing_first_name", "first_name"),
        _get_first(row, "shipping_last_name", "billing_last_name", "last_name"),
        _get_first(row, "shipping_name", "billing_name", "customer_name"),
    )
    phone = _normalize_phone(
        _get_first(row, "shipping_phone", "billing_phone", "phone", "customer_phone")
    )
    email = _normalize_email(_get_first(row, "email", "customer_email"))
    if not email:
        email = f"shopify-order-{_slugify(order_number)}@import.local"

    created_at = _parse_datetime(_get_first(row, "created_at", "processed_at"))
    cancelled_at = _parse_datetime(_get_first(row, "cancelled_at"))
    paid_at = _parse_datetime(_get_first(row, "paid_at"))
    fulfilled_at = _parse_datetime(_get_first(row, "fulfilled_at"))

    financial_status = _get_first(row, "financial_status")
    fulfillment_status = _get_first(row, "fulfillment_status")
    payment_status = _map_payment_status(financial_status)

    line_item_name = _get_first(row, "lineitem_name", "line_item_name", "product_name")
    line_item_sku = _get_first(row, "lineitem_sku", "line_item_sku", "sku")
    line_item_price = _parse_float(_get_first(row, "lineitem_price", "line_item_price", "price")) or 0.0
    line_item_quantity = _parse_int(_get_first(row, "lineitem_quantity", "line_item_quantity", "quantity")) or 1

    return {
        "group_key": order_number,
        "order_number": order_number,
        "customer": {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": phone,
            "accepted_marketing": _parse_bool(_get_first(row, "accepts_marketing", "accepts_email_marketing")),
        },
        "address": {
            "address_line1": _get_first(row, "shipping_address1", "billing_address1", "address1"),
            "address_line2": _get_first(row, "shipping_address2", "billing_address2", "address2"),
            "city": _get_first(row, "shipping_city", "billing_city", "city"),
            "state": _get_first(row, "shipping_province", "billing_province", "province"),
            "postal_code": _get_first(row, "shipping_zip", "billing_zip", "zip"),
            "country": _get_first(row, "shipping_country", "billing_country", "country"),
            "label": "Shopify order",
        },
        "order": {
            "status": _map_order_status(
                financial_status=financial_status,
                fulfillment_status=fulfillment_status,
                cancelled_at=cancelled_at,
            ),
            "subtotal": _parse_float(_get_first(row, "subtotal", "subtotal_price")) or 0.0,
            "discount_total": _parse_float(_get_first(row, "discount_amount", "discounts")) or 0.0,
            "shipping_total": _parse_float(_get_first(row, "shipping", "shipping_price")) or 0.0,
            "grand_total": _parse_float(_get_first(row, "total", "total_price")) or 0.0,
            "shipping_name": _get_first(row, "shipping_name", "billing_name")
            or f"{first_name} {last_name}".strip(),
            "shipping_address": ", ".join(
                [
                    part
                    for part in [
                        _get_first(row, "shipping_address1", "billing_address1", "address1"),
                        _get_first(row, "shipping_address2", "billing_address2", "address2"),
                        _get_first(row, "shipping_city", "billing_city", "city"),
                        _get_first(row, "shipping_province", "billing_province", "province"),
                        _get_first(row, "shipping_zip", "billing_zip", "zip"),
                        _get_first(row, "shipping_country", "billing_country", "country"),
                    ]
                    if part
                ]
            ),
            "tracking_number": _get_first(row, "fulfillment_tracking_number", "tracking_number"),
            "shipping_carrier": _get_first(row, "fulfillment_tracking_company", "shipping_method", "gateway"),
            "internal_notes": _get_first(row, "notes", "note"),
            "created_at": created_at or datetime.now(timezone.utc),
            "paid_at": paid_at,
            "shipped_at": fulfilled_at,
            "delivered_at": fulfilled_at if _clean_string(fulfillment_status).lower() == "delivered" else None,
            "cancelled_at": cancelled_at,
            "refunded_at": paid_at if payment_status == PaymentStatus.REFUNDED else None,
            "gateway": _get_first(row, "gateway", "payment_method"),
            "payment_reference": _get_first(row, "payment_reference", "transaction_id", "authorization"),
            "payment_status": payment_status,
        },
        "item": {
            "name": line_item_name or line_item_sku or f"Item Shopify {row_number}",
            "sku": line_item_sku or f"SHOPIFY-LINE-{row_number}",
            "quantity": max(line_item_quantity, 1),
            "unit_price": round(line_item_price, 2),
        },
    }


def _get_or_create_brand(db: Session, name: str, *, use_mock: bool) -> dict[str, Any] | Brand:
    normalized_name = _clean_string(name) or _DEFAULT_IMPORT_BRAND
    slug = _slugify(normalized_name)
    if use_mock:
        existing = next((brand for brand in BRANDS if brand["slug"] == slug or brand["name"].lower() == normalized_name.lower()), None)
        if existing:
            return existing
        return create_entity(BRANDS, {"name": normalized_name, "slug": slug, "description": "Importado desde Shopify"})

    brand = db.query(Brand).filter(func.lower(Brand.slug) == slug).first()
    if brand:
        return brand
    brand = db.query(Brand).filter(func.lower(Brand.name) == normalized_name.lower()).first()
    if brand:
        return brand
    brand = Brand(name=normalized_name, slug=slug, description="Importado desde Shopify", logo_url=None)
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


def _get_or_create_category(db: Session, name: str, *, use_mock: bool) -> dict[str, Any] | Category:
    normalized_name = _clean_string(name) or _DEFAULT_IMPORT_CATEGORY
    slug = _slugify(normalized_name)
    if use_mock:
        existing = next((category for category in CATEGORIES if category["slug"] == slug or category["name"].lower() == normalized_name.lower()), None)
        if existing:
            return existing
        return create_entity(CATEGORIES, {"name": normalized_name, "slug": slug, "description": "Importado desde Shopify"})

    category = db.query(Category).filter(func.lower(Category.slug) == slug).first()
    if category:
        return category
    category = db.query(Category).filter(func.lower(Category.name) == normalized_name.lower()).first()
    if category:
        return category
    category = Category(name=normalized_name, slug=slug, description="Importado desde Shopify", image_url=None)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def _upsert_customer_record(
    db: Session,
    normalized: dict[str, Any],
    *,
    use_mock: bool,
) -> dict[str, Any] | Customer:
    if use_mock:
        return upsert_mock_customer(
            email=normalized["email"],
            first_name=normalized["first_name"],
            last_name=normalized["last_name"],
            phone=normalized.get("phone"),
            hashed_password=get_password_hash(f"shopify-import-{normalized['email']}"),
        )

    customer = (
        db.query(Customer)
        .filter(func.lower(Customer.email) == normalized["email"].lower())
        .first()
    )
    if not customer:
        customer = Customer(
            email=normalized["email"],
            first_name=normalized["first_name"],
            last_name=normalized["last_name"],
            phone=normalized.get("phone"),
            hashed_password=get_password_hash(f"shopify-import-{normalized['email']}"),
            is_active=True,
        )
    else:
        customer.first_name = normalized["first_name"] or customer.first_name
        customer.last_name = normalized["last_name"] or customer.last_name
        customer.phone = normalized.get("phone") or customer.phone
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def _upsert_customer_address_record(
    db: Session,
    customer: dict[str, Any] | Customer,
    address: dict[str, Any],
    *,
    use_mock: bool,
) -> dict[str, Any] | CustomerAddress | None:
    if not address.get("address_line1") or not address.get("postal_code"):
        return None

    customer_id = customer["id"] if isinstance(customer, dict) else customer.id
    if use_mock:
        return upsert_mock_customer_address(
            {
                "customer_id": customer_id,
                "label": address.get("label") or "Shopify import",
                "address_line1": address["address_line1"],
                "city": address.get("city") or "Sin ciudad",
                "state": address.get("state") or "Sin estado",
                "postal_code": address["postal_code"],
                "is_default": True,
                "address_line2": address.get("address_line2"),
                "country": address.get("country"),
            }
        )

    existing = (
        db.query(CustomerAddress)
        .filter(
            CustomerAddress.customer_id == customer_id,
            CustomerAddress.address_line1 == address["address_line1"],
            CustomerAddress.postal_code == address["postal_code"],
        )
        .first()
    )
    if not existing:
        existing = CustomerAddress(
            customer_id=customer_id,
            label=address.get("label") or "Shopify import",
            address_line1=address["address_line1"],
            city=address.get("city") or "Sin ciudad",
            state=address.get("state") or "Sin estado",
            postal_code=address["postal_code"],
            is_default=True,
        )
    else:
        existing.label = address.get("label") or existing.label
        existing.city = address.get("city") or existing.city
        existing.state = address.get("state") or existing.state
        existing.is_default = True
    db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing


def _upsert_crm_contact_record(
    db: Session,
    normalized: dict[str, Any],
    *,
    lifecycle_status: str,
    source: str,
    use_mock: bool,
) -> dict[str, Any] | CRMContact:
    contact_payload = {
        "first_name": normalized["first_name"],
        "last_name": normalized["last_name"],
        "email": normalized.get("email"),
        "whatsapp": normalized.get("phone"),
        "source": source,
        "lifecycle_status": lifecycle_status,
        "skin_type": None,
        "main_goal": None,
        "age_range": None,
        "accepted_marketing": bool(normalized.get("accepted_marketing")),
        "last_seen_at": datetime.now(timezone.utc),
    }
    if use_mock:
        return upsert_mock_crm_contact(contact_payload)

    email = normalized.get("email")
    phone = normalized.get("phone")
    contact = None
    if email:
        contact = db.query(CRMContact).filter(func.lower(CRMContact.email) == email.lower()).first()
    if not contact and phone:
        contacts = db.query(CRMContact).all()
        for candidate in contacts:
            digits = "".join(character for character in (candidate.whatsapp or "") if character.isdigit())
            if digits == phone:
                contact = candidate
                break

    if not contact:
        contact = CRMContact(
            first_name=normalized["first_name"],
            last_name=normalized["last_name"],
            email=email,
            whatsapp=phone,
            source=source,
            lifecycle_status=CRMLifecycleStatus(lifecycle_status),
            accepted_marketing=bool(normalized.get("accepted_marketing")),
            first_seen_at=datetime.now(timezone.utc),
            last_seen_at=datetime.now(timezone.utc),
        )
    else:
        contact.first_name = normalized["first_name"] or contact.first_name
        contact.last_name = normalized["last_name"] or contact.last_name
        contact.email = email or contact.email
        contact.whatsapp = phone or contact.whatsapp
        contact.source = source
        contact.lifecycle_status = CRMLifecycleStatus(lifecycle_status)
        contact.accepted_marketing = bool(contact.accepted_marketing or normalized.get("accepted_marketing"))
        contact.last_seen_at = datetime.now(timezone.utc)

    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def _upsert_product_record(
    db: Session,
    normalized: dict[str, Any],
    *,
    use_mock: bool,
) -> dict[str, Any] | Product:
    brand = _get_or_create_brand(db, normalized["brand_name"], use_mock=use_mock)
    category = _get_or_create_category(db, normalized["category_name"], use_mock=use_mock)
    brand_id = brand["id"] if isinstance(brand, dict) else brand.id
    category_id = category["id"] if isinstance(category, dict) else category.id

    if use_mock:
        existing = next(
            (
                product
                for product in PRODUCTS
                if product["sku"] == normalized["sku"] or product["slug"] == normalized["slug"]
            ),
            None,
        )
        payload = {
            "name": normalized["name"],
            "slug": normalized["slug"],
            "sku": normalized["sku"],
            "brand_id": brand_id,
            "brand_name": brand["name"] if isinstance(brand, dict) else brand.name,
            "category_id": category_id,
            "category_name": category["name"] if isinstance(category, dict) else category.name,
            "price": normalized["price"],
            "discount_price": normalized.get("discount_price"),
            "stock": normalized["stock"],
            "description": normalized["description"],
            "benefits": normalized.get("benefits", []),
            "ingredients": normalized.get("ingredients", []),
            "usage": normalized.get("usage", []),
            "skin_type": normalized.get("skin_type", []),
            "concern": normalized.get("concern", []),
            "images": normalized.get("images", []),
            "is_active": normalized.get("is_active", True),
            "featured": False,
            "best_seller": any(tag.lower() == "bestseller" for tag in normalized.get("tags", [])),
            "rating": 0,
            "review_count": 0,
            "faq": [],
            "highlight": normalized["description"][:120],
            "gradient": "from-stone-100 via-white to-rose-50",
        }
        if existing:
            return update_mock_product(existing["id"], payload) or existing
        return create_mock_product(payload)

    product = (
        db.query(Product)
        .filter((Product.sku == normalized["sku"]) | (Product.slug == normalized["slug"]))
        .first()
    )
    if not product:
        product = Product(
            brand_id=brand_id,
            category_id=category_id,
            name=normalized["name"],
            slug=normalized["slug"],
            sku=normalized["sku"],
            price=normalized["price"],
            discount_price=normalized.get("discount_price"),
            cost=None,
            stock=normalized["stock"],
            description=normalized["description"],
            benefits=_join_lines(normalized.get("benefits", [])),
            ingredients=_join_lines(normalized.get("ingredients", [])),
            usage=_join_lines(normalized.get("usage", [])),
            skin_type=_join_lines(normalized.get("skin_type", [])),
            concern=_join_lines(normalized.get("concern", [])),
            is_active=normalized.get("is_active", True),
        )
    else:
        product.brand_id = brand_id
        product.category_id = category_id
        product.name = normalized["name"]
        product.slug = normalized["slug"]
        product.sku = normalized["sku"]
        product.price = normalized["price"]
        product.discount_price = normalized.get("discount_price")
        product.stock = normalized["stock"]
        product.description = normalized["description"]
        product.benefits = _join_lines(normalized.get("benefits", []))
        product.ingredients = _join_lines(normalized.get("ingredients", []))
        product.usage = _join_lines(normalized.get("usage", []))
        product.skin_type = _join_lines(normalized.get("skin_type", []))
        product.concern = _join_lines(normalized.get("concern", []))
        product.is_active = normalized.get("is_active", True)

    db.add(product)
    db.commit()
    db.refresh(product)

    db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
    for sort_order, image_url in enumerate(normalized.get("images", [])):
        db.add(ProductImage(product_id=product.id, image_url=image_url, sort_order=sort_order))
    db.commit()
    db.refresh(product)
    return product


def _ensure_order_product(
    db: Session,
    item: dict[str, Any],
    *,
    use_mock: bool,
) -> dict[str, Any] | Product:
    normalized = {
        "name": item["name"],
        "slug": _slugify(item["name"]),
        "sku": item["sku"],
        "brand_name": _DEFAULT_IMPORT_BRAND,
        "category_name": _DEFAULT_IMPORT_CATEGORY,
        "price": max(item["unit_price"], 0.01),
        "discount_price": None,
        "stock": 0,
        "description": f"Producto historico importado desde Shopify para {item['name']}.",
        "benefits": [],
        "ingredients": [],
        "usage": [],
        "skin_type": [],
        "concern": [],
        "is_active": True,
        "images": [],
        "tags": [],
    }
    return _upsert_product_record(db, normalized, use_mock=use_mock)


def _upsert_order_record(
    db: Session,
    normalized: dict[str, Any],
    *,
    use_mock: bool,
) -> None:
    customer = _upsert_customer_record(db, normalized["customer"], use_mock=use_mock)
    _upsert_customer_address_record(db, customer, normalized["address"], use_mock=use_mock)
    _upsert_crm_contact_record(
        db,
        normalized["customer"],
        lifecycle_status="customer",
        source="shopify_order_import",
        use_mock=use_mock,
    )

    order_payload = normalized["order"]
    item_payload = normalized["item"]
    product = _ensure_order_product(db, item_payload, use_mock=use_mock)
    product_id = product["id"] if isinstance(product, dict) else product.id
    customer_id = customer["id"] if isinstance(customer, dict) else customer.id

    if use_mock:
        existing = next((order for order in ORDERS if order["order_number"] == normalized["order_number"]), None)
        payload = {
            "order_number": normalized["order_number"],
            "customer_id": customer_id,
            "status": order_payload["status"].value,
            "subtotal": order_payload["subtotal"],
            "discount_total": order_payload["discount_total"],
            "shipping_total": order_payload["shipping_total"],
            "grand_total": order_payload["grand_total"],
            "payment_provider": _map_payment_provider(order_payload.get("gateway")).value,
            "payment_status": order_payload["payment_status"].value,
            "customer_email": normalized["customer"]["email"],
            "shipping_name": order_payload["shipping_name"],
            "shipping_phone": normalized["customer"].get("phone"),
            "shipping_address": order_payload["shipping_address"],
            "shipping_address_data": normalized["address"],
            "tracking_number": order_payload.get("tracking_number"),
            "shipping_carrier": order_payload.get("shipping_carrier"),
            "internal_notes": order_payload.get("internal_notes"),
            "created_at": order_payload["created_at"],
            "updated_at": order_payload["created_at"],
            "shipped_at": order_payload.get("shipped_at"),
            "delivered_at": order_payload.get("delivered_at"),
            "cancelled_at": order_payload.get("cancelled_at"),
            "refunded_at": order_payload.get("refunded_at"),
            "items": [
                {
                    "product_id": product_id,
                    "product_name": item_payload["name"],
                    "quantity": item_payload["quantity"],
                    "unit_price": item_payload["unit_price"],
                }
            ],
        }
        if existing:
            merged_items = list(existing.get("items", []))
            if not any(
                item["product_name"] == item_payload["name"]
                and item["unit_price"] == item_payload["unit_price"]
                and item["quantity"] == item_payload["quantity"]
                for item in merged_items
            ):
                merged_items.append(payload["items"][0])
            payload["items"] = merged_items
            order = update_mock_order(existing["id"], payload) or existing
        else:
            order = create_mock_order(payload)

        payment_entry = next((payment for payment in PAYMENTS if payment["order_id"] == order["id"]), None)
        payment_payload = {
            "order_id": order["id"],
            "provider": _map_payment_provider(order_payload.get("gateway")).value,
            "provider_reference": order_payload.get("payment_reference") or normalized["order_number"],
            "status": order_payload["payment_status"].value,
            "amount": order_payload["grand_total"],
            "raw_payload_json": {
                "import_source": "shopify",
                "gateway": order_payload.get("gateway"),
                "shipping_address": normalized["address"],
                "customer_email": normalized["customer"]["email"],
            },
            "paid_at": order_payload.get("paid_at"),
            "failed_at": order_payload.get("paid_at") if order_payload["payment_status"] == PaymentStatus.FAILED else None,
            "updated_at": datetime.now(timezone.utc),
        }
        if payment_entry:
            payment_entry.update(payment_payload)
        else:
            create_mock_payment(payment_payload)
        return

    order = db.query(Order).filter(Order.order_number == normalized["order_number"]).first()
    if not order:
        order = Order(
            order_number=normalized["order_number"],
            customer_id=customer_id,
            status=order_payload["status"],
            subtotal=order_payload["subtotal"],
            discount_total=order_payload["discount_total"],
            shipping_total=order_payload["shipping_total"],
            grand_total=order_payload["grand_total"],
            shipping_name=order_payload["shipping_name"],
            shipping_address=order_payload["shipping_address"],
            tracking_number=order_payload.get("tracking_number"),
            shipping_carrier=order_payload.get("shipping_carrier"),
            internal_notes=order_payload.get("internal_notes"),
            shipped_at=order_payload.get("shipped_at"),
            delivered_at=order_payload.get("delivered_at"),
            cancelled_at=order_payload.get("cancelled_at"),
            refunded_at=order_payload.get("refunded_at"),
            created_at=order_payload["created_at"],
            updated_at=order_payload["created_at"],
        )
    else:
        order.customer_id = customer_id
        order.status = order_payload["status"]
        order.subtotal = order_payload["subtotal"]
        order.discount_total = order_payload["discount_total"]
        order.shipping_total = order_payload["shipping_total"]
        order.grand_total = order_payload["grand_total"]
        order.shipping_name = order_payload["shipping_name"]
        order.shipping_address = order_payload["shipping_address"]
        order.tracking_number = order_payload.get("tracking_number")
        order.shipping_carrier = order_payload.get("shipping_carrier")
        order.internal_notes = order_payload.get("internal_notes")
        order.shipped_at = order_payload.get("shipped_at")
        order.delivered_at = order_payload.get("delivered_at")
        order.cancelled_at = order_payload.get("cancelled_at")
        order.refunded_at = order_payload.get("refunded_at")

    db.add(order)
    db.commit()
    db.refresh(order)

    existing_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    matched_item = next(
        (
            entry
            for entry in existing_items
            if entry.product_name == item_payload["name"] and float(entry.unit_price) == item_payload["unit_price"]
        ),
        None,
    )
    if not matched_item:
        matched_item = OrderItem(
            order_id=order.id,
            product_id=product_id,
            product_name=item_payload["name"],
            quantity=item_payload["quantity"],
            unit_price=item_payload["unit_price"],
        )
    else:
        matched_item.product_id = product_id
        matched_item.quantity = item_payload["quantity"]
        matched_item.unit_price = item_payload["unit_price"]
    db.add(matched_item)
    db.commit()

    payment = (
        db.query(Payment)
        .filter(Payment.order_id == order.id)
        .order_by(Payment.id.desc())
        .first()
    )
    provider = _map_payment_provider(order_payload.get("gateway"))
    if not payment:
        payment = Payment(
            order_id=order.id,
            provider=provider,
            provider_reference=order_payload.get("payment_reference") or normalized["order_number"],
            status=order_payload["payment_status"],
            amount=order_payload["grand_total"],
            raw_payload_json={
                "import_source": "shopify",
                "gateway": order_payload.get("gateway"),
                "shipping_address": normalized["address"],
                "customer_email": normalized["customer"]["email"],
            },
            paid_at=order_payload.get("paid_at"),
            failed_at=order_payload.get("paid_at") if order_payload["payment_status"] == PaymentStatus.FAILED else None,
            created_at=order_payload["created_at"],
            updated_at=order_payload["created_at"],
        )
    else:
        payment.provider = provider
        payment.provider_reference = order_payload.get("payment_reference") or normalized["order_number"]
        payment.status = order_payload["payment_status"]
        payment.amount = order_payload["grand_total"]
        payment.raw_payload_json = {
            "import_source": "shopify",
            "gateway": order_payload.get("gateway"),
            "shipping_address": normalized["address"],
            "customer_email": normalized["customer"]["email"],
        }
        payment.paid_at = order_payload.get("paid_at")
        payment.failed_at = order_payload.get("paid_at") if order_payload["payment_status"] == PaymentStatus.FAILED else None
    db.add(payment)
    db.commit()


def _create_import_job(
    db: Session,
    *,
    source: str,
    import_type: str,
    filename: str,
    created_by_user_id: int | None,
    notes: str | None = None,
) -> tuple[dict[str, Any], bool]:
    try:
        _ensure_import_tables()
        job = ImportJob(
            source=source,
            import_type=import_type,
            filename=filename,
            status="processing",
            total_rows=0,
            processed_rows=0,
            success_rows=0,
            failed_rows=0,
            error_report_json=[],
            created_by_user_id=created_by_user_id,
            notes=notes,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return _job_to_dict(job), False
    except SQLAlchemyError:
        db.rollback()
        job = create_mock_import_job(
            {
                "source": source,
                "import_type": import_type,
                "filename": filename,
                "status": "processing",
                "total_rows": 0,
                "processed_rows": 0,
                "success_rows": 0,
                "failed_rows": 0,
                "error_report_json": [],
                "created_by_user_id": created_by_user_id,
                "notes": notes,
            }
        )
        return _job_to_dict(job), True


def _update_import_job(
    db: Session,
    job_id: int,
    payload: dict[str, Any],
    *,
    use_mock: bool,
) -> dict[str, Any] | None:
    if use_mock:
        job = update_mock_import_job(job_id, payload)
        return _job_to_dict(job) if job else None

    try:
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if not job:
            return None
        for field_name, field_value in payload.items():
            setattr(job, field_name, field_value)
        db.add(job)
        db.commit()
        db.refresh(job)
        return _job_to_dict(job)
    except SQLAlchemyError:
        db.rollback()
        return None


def _run_import(
    db: Session,
    *,
    file_bytes: bytes,
    filename: str,
    import_type: str,
    created_by_user_id: int | None,
    normalizer,
    handler,
    grouper=None,
) -> dict[str, Any]:
    job, use_mock = _create_import_job(
        db,
        source="shopify",
        import_type=import_type,
        filename=filename,
        created_by_user_id=created_by_user_id,
    )

    try:
        rows = _read_csv_rows(file_bytes)
    except ValueError as exc:
        return _update_import_job(
            db,
            job["id"],
            {
                "status": "failed",
                "completed_at": datetime.now(timezone.utc),
                "error_report_json": [{"row_number": 1, "message": str(exc), "raw_row": {}}],
                "failed_rows": 1,
            },
            use_mock=use_mock,
        ) or job

    total_rows = len(rows)
    error_report: list[dict[str, Any]] = []
    success_rows = 0
    processed_rows = 0

    if grouper:
        grouped_rows: dict[str, dict[str, Any]] = {}
        for row_number, row in rows:
            processed_rows += 1
            try:
                normalized = normalizer(row, row_number)
                group_key = normalized["group_key"]
                current = grouped_rows.setdefault(group_key, {"base": normalized, "rows": []})
                current["rows"].append({"row_number": row_number, "normalized": normalized, "raw_row": row})
                success_rows += 1
            except Exception as exc:
                error_report.append({"row_number": row_number, "message": str(exc), "raw_row": _preview_row(row)})

        for group in grouped_rows.values():
            try:
                grouper(group)
                handler(db, group["base"], use_mock=use_mock, grouped_rows=group["rows"])
            except Exception as exc:
                for entry in group["rows"]:
                    error_report.append(
                        {
                            "row_number": entry["row_number"],
                            "message": str(exc),
                            "raw_row": _preview_row(entry["raw_row"]),
                        }
                    )
                success_rows -= len(group["rows"])
    else:
        for row_number, row in rows:
            processed_rows += 1
            try:
                normalized = normalizer(row, row_number)
                handler(db, normalized, use_mock=use_mock)
                success_rows += 1
            except Exception as exc:
                error_report.append({"row_number": row_number, "message": str(exc), "raw_row": _preview_row(row)})

    failed_rows = len(error_report)
    status = "completed_with_errors" if failed_rows else "completed"
    return _update_import_job(
        db,
        job["id"],
        {
            "status": status,
            "total_rows": total_rows,
            "processed_rows": processed_rows,
            "success_rows": max(success_rows, 0),
            "failed_rows": failed_rows,
            "error_report_json": error_report,
            "completed_at": datetime.now(timezone.utc),
        },
        use_mock=use_mock,
    ) or job


def _handle_customer_import(db: Session, normalized: dict[str, Any], *, use_mock: bool) -> None:
    customer = _upsert_customer_record(db, normalized, use_mock=use_mock)
    _upsert_customer_address_record(db, customer, normalized["address"], use_mock=use_mock)
    _upsert_crm_contact_record(
        db,
        normalized,
        lifecycle_status=normalized["lifecycle_status"],
        source="shopify_customer_import",
        use_mock=use_mock,
    )


def _group_product_rows(group: dict[str, Any]) -> None:
    base = group["base"]
    images: list[str] = []
    tags: list[str] = []
    stock = 0
    for entry in group["rows"]:
        normalized = entry["normalized"]
        stock += int(normalized.get("stock") or 0)
        images.extend(normalized.get("images", []))
        tags.extend(normalized.get("tags", []))
    base["images"] = list(dict.fromkeys(image for image in images if image))
    base["tags"] = list(dict.fromkeys(tag for tag in tags if tag))
    base["stock"] = stock if stock > 0 else base["stock"]


def _handle_product_import(
    db: Session,
    normalized: dict[str, Any],
    *,
    use_mock: bool,
    grouped_rows: list[dict[str, Any]] | None = None,
) -> None:
    del grouped_rows
    _upsert_product_record(db, normalized, use_mock=use_mock)


def _group_order_rows(group: dict[str, Any]) -> None:
    base = group["base"]
    items: list[dict[str, Any]] = []
    for entry in group["rows"]:
        items.append(entry["normalized"]["item"])
    base["items"] = items


def _handle_order_import(
    db: Session,
    normalized: dict[str, Any],
    *,
    use_mock: bool,
    grouped_rows: list[dict[str, Any]] | None = None,
) -> None:
    if grouped_rows:
        first_item = grouped_rows[0]["normalized"]["item"]
        _upsert_order_record(
            db,
            {
                **normalized,
                "item": first_item,
            },
            use_mock=use_mock,
        )

        order_number = normalized["order_number"]
        if use_mock:
            order = next((entry for entry in ORDERS if entry["order_number"] == order_number), None)
            if order:
                unique_items: list[dict[str, Any]] = []
                for row in grouped_rows:
                    item = row["normalized"]["item"]
                    serialized_item = {
                        "product_id": next(
                            (
                                product["id"]
                                for product in PRODUCTS
                                if product["sku"] == item["sku"] or product["slug"] == _slugify(item["name"])
                            ),
                            order["items"][0]["product_id"] if order.get("items") else 1,
                        ),
                        "product_name": item["name"],
                        "quantity": item["quantity"],
                        "unit_price": item["unit_price"],
                    }
                    if not any(
                        existing["product_name"] == serialized_item["product_name"]
                        and existing["quantity"] == serialized_item["quantity"]
                        and existing["unit_price"] == serialized_item["unit_price"]
                        for existing in unique_items
                    ):
                        unique_items.append(serialized_item)
                update_mock_order(order["id"], {"items": unique_items})
            return

        order = db.query(Order).filter(Order.order_number == order_number).first()
        if not order:
            return
        db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()
        for row in grouped_rows:
            item = row["normalized"]["item"]
            product = _ensure_order_product(db, item, use_mock=use_mock)
            product_id = product["id"] if isinstance(product, dict) else product.id
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product_id,
                    product_name=item["name"],
                    quantity=item["quantity"],
                    unit_price=item["unit_price"],
                )
            )
        db.commit()


def import_shopify_customers_csv(
    db: Session,
    *,
    file_bytes: bytes,
    filename: str,
    created_by_user_id: int | None = None,
) -> dict[str, Any]:
    return _run_import(
        db,
        file_bytes=file_bytes,
        filename=filename,
        import_type="customers",
        created_by_user_id=created_by_user_id,
        normalizer=normalize_shopify_customer_row,
        handler=_handle_customer_import,
    )


def import_shopify_products_csv(
    db: Session,
    *,
    file_bytes: bytes,
    filename: str,
    created_by_user_id: int | None = None,
) -> dict[str, Any]:
    return _run_import(
        db,
        file_bytes=file_bytes,
        filename=filename,
        import_type="products",
        created_by_user_id=created_by_user_id,
        normalizer=normalize_shopify_product_row,
        handler=_handle_product_import,
        grouper=_group_product_rows,
    )


def import_shopify_orders_csv(
    db: Session,
    *,
    file_bytes: bytes,
    filename: str,
    created_by_user_id: int | None = None,
) -> dict[str, Any]:
    return _run_import(
        db,
        file_bytes=file_bytes,
        filename=filename,
        import_type="orders",
        created_by_user_id=created_by_user_id,
        normalizer=normalize_shopify_order_row,
        handler=_handle_order_import,
        grouper=_group_order_rows,
    )


def list_import_jobs(db: Session) -> list[dict[str, Any]]:
    try:
        _ensure_import_tables()
        jobs = db.query(ImportJob).order_by(ImportJob.created_at.desc(), ImportJob.id.desc()).all()
        return [_job_to_dict(job) for job in jobs]
    except SQLAlchemyError:
        db.rollback()
        return [_job_to_dict(job) for job in list_mock_import_jobs()]


def get_import_job_detail(db: Session, job_id: int) -> dict[str, Any] | None:
    try:
        _ensure_import_tables()
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if not job:
            return None
        return _job_to_dict(job)
    except SQLAlchemyError:
        db.rollback()
        job = get_mock_import_job(job_id)
        return _job_to_dict(job) if job else None
