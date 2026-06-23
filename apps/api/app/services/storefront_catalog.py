from __future__ import annotations


def _slugify(value: str) -> str:
    return "-".join(value.strip().lower().split())


def _to_float(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _coerce_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(entry) for entry in value if str(entry).strip()]
    if isinstance(value, str) and value.strip():
        return [value]
    return []


def _coerce_image_objects(value: object, fallback_images: list[str]) -> list[dict[str, object]]:
    if isinstance(value, list):
        normalized: list[dict[str, object]] = []
        for index, entry in enumerate(value):
            if not isinstance(entry, dict):
                continue
            url = str(entry.get("url") or "").strip()
            if not url:
                continue
            normalized.append(
                {
                    "id": int(entry.get("id") or index + 1),
                    "url": url,
                    "altText": str(entry.get("altText") or "").strip() or None,
                    "sortOrder": int(entry.get("sortOrder") or index),
                    "isPrimary": bool(entry.get("isPrimary", index == 0)),
                }
            )
        if normalized:
            normalized.sort(key=lambda entry: (int(entry["sortOrder"]), int(entry["id"])))
            primary_assigned = any(bool(entry["isPrimary"]) for entry in normalized)
            if not primary_assigned and normalized:
                normalized[0]["isPrimary"] = True
            return normalized

    return [
        {
            "id": index + 1,
            "url": image_url,
            "altText": None,
            "sortOrder": index,
            "isPrimary": index == 0,
        }
        for index, image_url in enumerate(fallback_images)
        if image_url.strip()
    ]


def _build_gradient(category_name: str) -> str:
    gradients = {
        "limpiadores": "from-stone-100 via-white to-amber-50",
        "serums": "from-rose-100 via-white to-stone-100",
        "hidratantes": "from-orange-50 via-rose-50 to-white",
        "protector-solar": "from-yellow-50 via-white to-rose-50",
        "tratamientos": "from-amber-100 via-rose-50 to-white",
    }
    return gradients.get(_slugify(category_name), "from-stone-100 via-white to-rose-50")


def _build_highlight(product: dict) -> str:
    explicit_highlight = product.get("highlight")
    if isinstance(explicit_highlight, str) and explicit_highlight.strip():
        return explicit_highlight

    benefits = _coerce_list(product.get("benefits"))
    if benefits:
        return benefits[0]

    description = str(product.get("description") or "").strip()
    return description or str(product.get("name") or "")


def _build_faq(product: dict) -> list[dict[str, str]]:
    faq = product.get("faq")
    if isinstance(faq, list) and faq:
        return [
            {
                "question": str(entry.get("question") or "").strip(),
                "answer": str(entry.get("answer") or "").strip(),
            }
            for entry in faq
            if isinstance(entry, dict)
            and str(entry.get("question") or "").strip()
            and str(entry.get("answer") or "").strip()
        ]

    usage = _coerce_list(product.get("usage"))
    description = str(product.get("description") or "").strip()
    return [
        {
            "question": "Como integrarlo en la rutina?",
            "answer": usage[0] if usage else "Usalo segun tolerancia y constancia diaria.",
        },
        {
            "question": "Que aporta a la piel?",
            "answer": description or "Producto curado para una rutina consistente.",
        },
    ]


def _resolve_prices(product: dict) -> tuple[float, float | None]:
    explicit_compare = _to_float(product.get("compareAtPrice"))
    base_price = _to_float(product.get("price")) or 0
    discount_price = _to_float(product.get("discount_price"))

    if explicit_compare is not None:
        compare_at_price = explicit_compare if explicit_compare > base_price else None
        return base_price, compare_at_price

    if discount_price is not None:
        if discount_price < base_price:
            return discount_price, base_price
        if discount_price > base_price:
            return base_price, discount_price

    return base_price, None


def serialize_product(product: dict) -> dict:
    images = _coerce_list(product.get("images"))
    image = str(product.get("image") or "").strip() or (images[0] if images else None)
    image_objects = _coerce_image_objects(product.get("imageObjects") or product.get("image_objects"), images if images else ([image] if image else []))
    brand_name = str(product.get("brand") or product.get("brand_name") or "").strip()
    category_name = str(product.get("category") or product.get("category_name") or "").strip()
    price, compare_at_price = _resolve_prices(product)
    skin_types = _coerce_list(product.get("skinTypes") or product.get("skin_type"))
    concerns = _coerce_list(product.get("concerns") or product.get("concern"))
    best_seller = bool(product.get("bestSeller", product.get("best_seller", False)))
    featured = bool(product.get("featured", False))
    badges = _coerce_list(product.get("badges"))

    if best_seller and "Bestseller" not in badges:
        badges.append("Bestseller")
    if compare_at_price is not None and "Oferta" not in badges:
        badges.append("Oferta")
    if featured and "Destacado" not in badges:
        badges.append("Destacado")

    return {
        "id": product["id"],
        "name": product["name"],
        "slug": product["slug"],
        "sku": product["sku"],
        "brand_id": product["brand_id"],
        "brand_name": brand_name,
        "brand": brand_name,
        "category_id": product["category_id"],
        "category_name": category_name,
        "category": category_name,
        "price": price,
        "discount_price": _to_float(product.get("discount_price")),
        "compareAtPrice": compare_at_price,
        "image": image,
        "images": images if images else ([image] if image else []),
        "imageObjects": image_objects,
        "rating": float(product.get("rating", 4.8)),
        "reviewCount": int(product.get("reviewCount", product.get("review_count", 0)) or 0),
        "badges": badges,
        "stock": int(product.get("stock", 0) or 0),
        "description": str(product.get("description") or "").strip(),
        "benefits": _coerce_list(product.get("benefits")),
        "ingredients": _coerce_list(product.get("ingredients")),
        "usage": _coerce_list(product.get("usage")),
        "skin_type": skin_types,
        "skinTypes": skin_types,
        "concern": concerns,
        "concerns": concerns,
        "highlight": _build_highlight(product),
        "gradient": str(product.get("gradient") or _build_gradient(category_name)),
        "featured": featured,
        "bestSeller": best_seller,
        "faq": _build_faq(product),
        "is_active": bool(product.get("is_active", True)),
    }
