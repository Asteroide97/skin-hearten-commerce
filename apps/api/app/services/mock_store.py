from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone

from app.core.security import get_password_hash

BRANDS = [
    {"id": 1, "name": "Skin Hearten Lab", "slug": "skin-hearten-lab", "description": "Formula propia premium"},
    {"id": 2, "name": "Atelier Derm", "slug": "atelier-derm", "description": "Dermocosmetica elegante"},
    {"id": 3, "name": "Lumiere Bio", "slug": "lumiere-bio", "description": "Luminosidad diaria"},
    {"id": 4, "name": "Natura Ritual", "slug": "natura-ritual", "description": "Botanicos y renovacion visible"},
]

CATEGORIES = [
    {"id": 1, "name": "Limpiadores", "slug": "limpiadores", "description": "Limpieza amable"},
    {"id": 2, "name": "Serums", "slug": "serums", "description": "Activos concentrados"},
    {"id": 3, "name": "Hidratantes", "slug": "hidratantes", "description": "Confort y barrera"},
    {"id": 4, "name": "Protector Solar", "slug": "protector-solar", "description": "Defensa diaria"},
    {"id": 5, "name": "Tratamientos", "slug": "tratamientos", "description": "Correccion focalizada"},
]

PRODUCTS = [
    {
        "id": 1,
        "name": "Serum Renovador Peptidos",
        "slug": "serum-renovador-peptidos",
        "sku": "SH-SER-001",
        "brand_id": 1,
        "brand_name": "Skin Hearten Lab",
        "category_id": 2,
        "category_name": "Serums",
        "price": 1399.0,
        "discount_price": 1199.0,
        "stock": 18,
        "description": "Serum de textura sedosa con peptidos, niacinamida y antioxidantes para mejorar firmeza y suavidad.",
        "benefits": [
            "Mejora la apariencia de lineas finas",
            "Aporta luminosidad uniforme",
            "Refuerza la barrera de hidratacion",
        ],
        "ingredients": ["Peptidos", "Niacinamida", "Escualano", "Vitamina E"],
        "usage": [
            "Aplicar 2 a 3 gotas por la noche",
            "Presionar sobre rostro y cuello limpios",
            "Sellar con crema hidratante",
        ],
        "skin_type": ["Seca", "Mixta", "Madura"],
        "concern": ["Firmeza", "Lineas finas", "Textura"],
        "images": ["rose", "linen", "sand"],
        "highlight": "Firmeza y luminosidad en una sola capa.",
        "gradient": "from-rose-100 via-white to-stone-100",
        "featured": True,
        "best_seller": True,
        "rating": 4.9,
        "review_count": 218,
        "faq": [
            {
                "question": "Se puede usar con vitamina C?",
                "answer": "Si, en rutinas alternadas o despues de tolerancia inicial.",
            },
            {
                "question": "Es apto para piel sensible?",
                "answer": "Si, su formula fue planteada para uso progresivo y diario.",
            },
        ],
        "is_active": True,
    },
    {
        "id": 2,
        "name": "Gel Limpiador Barrera",
        "slug": "gel-limpiador-barrera",
        "sku": "AD-CLN-014",
        "brand_id": 2,
        "brand_name": "Atelier Derm",
        "category_id": 1,
        "category_name": "Limpiadores",
        "price": 649.0,
        "discount_price": None,
        "stock": 22,
        "description": "Gel cremoso que remueve protector solar y maquillaje ligero sin resecar.",
        "benefits": [
            "Respeta la barrera cutanea",
            "Limpieza confortable",
            "Ideal para manana y noche",
        ],
        "ingredients": ["Avena coloidal", "Pantenol", "Glicerina"],
        "usage": [
            "Masajear sobre piel humeda",
            "Enjuagar con agua tibia",
            "Continuar con serum o esencia",
        ],
        "skin_type": ["Seca", "Sensible", "Normal"],
        "concern": ["Sensibilidad", "Acne", "Deshidratacion"],
        "images": ["sand", "cream", "linen"],
        "highlight": "Limpieza suave, cero sensacion tirante.",
        "gradient": "from-stone-100 via-white to-amber-50",
        "featured": True,
        "best_seller": False,
        "rating": 4.8,
        "review_count": 143,
        "faq": [
            {
                "question": "Sirve para piel reactiva?",
                "answer": "Si, fue formulado para limpieza suave y sensorial calmante.",
            }
        ],
        "is_active": True,
    },
    {
        "id": 3,
        "name": "Crema Firmeza Ceramidas",
        "slug": "crema-firmeza-ceramidas",
        "sku": "SH-MOI-009",
        "brand_id": 1,
        "brand_name": "Skin Hearten Lab",
        "category_id": 3,
        "category_name": "Hidratantes",
        "price": 1120.0,
        "discount_price": 980.0,
        "stock": 14,
        "description": "Crema nutritiva con ceramidas y peptidos para piel que busca confort y elasticidad.",
        "benefits": [
            "Sella hidratacion por horas",
            "Apoya elasticidad visible",
            "Acabado aterciopelado sin pesadez",
        ],
        "ingredients": ["Ceramidas", "Peptidos", "Manteca de karite", "Escualano"],
        "usage": [
            "Aplicar al final de la rutina",
            "Extender en rostro y cuello",
            "Usar de dia y de noche",
        ],
        "skin_type": ["Seca", "Normal", "Madura"],
        "concern": ["Firmeza", "Deshidratacion"],
        "images": ["blush", "linen", "sand"],
        "highlight": "Confort prolongado y mejor elasticidad.",
        "gradient": "from-orange-50 via-rose-50 to-white",
        "featured": True,
        "best_seller": True,
        "rating": 4.9,
        "review_count": 176,
        "faq": [
            {
                "question": "Funciona bajo maquillaje?",
                "answer": "Si, deja una base uniforme y comoda para la piel.",
            }
        ],
        "is_active": True,
    },
    {
        "id": 4,
        "name": "Protector Solar Seda FPS 50",
        "slug": "protector-solar-seda-fps50",
        "sku": "LB-SUN-003",
        "brand_id": 3,
        "brand_name": "Lumiere Bio",
        "category_id": 4,
        "category_name": "Protector Solar",
        "price": 759.0,
        "discount_price": None,
        "stock": 31,
        "description": "Proteccion amplia con acabado ligero, sin residuo blanco y con defensa antioxidante.",
        "benefits": [
            "Proteccion UVA y UVB",
            "Acabado ligero para reaplicacion",
            "Ideal para clima calido",
        ],
        "ingredients": ["Filtros fotoestables", "Vitamina E", "Extracto de arroz"],
        "usage": [
            "Aplicar como ultimo paso de la rutina",
            "Reaplicar cada 2 a 3 horas",
            "Extender en rostro, cuello y escote",
        ],
        "skin_type": ["Mixta", "Normal", "Madura"],
        "concern": ["Fotoenvejecimiento", "Manchas"],
        "images": ["white", "sand", "linen"],
        "highlight": "Proteccion diaria con acabado elegante.",
        "gradient": "from-yellow-50 via-white to-rose-50",
        "featured": False,
        "best_seller": True,
        "rating": 4.8,
        "review_count": 264,
        "faq": [
            {
                "question": "Deja brillo?",
                "answer": "No, su textura fue pensada para un acabado natural y elegante.",
            }
        ],
        "is_active": True,
    },
    {
        "id": 5,
        "name": "Tratamiento Nocturno Manchas",
        "slug": "tratamiento-nocturno-manchas",
        "sku": "NR-TRT-011",
        "brand_id": 4,
        "brand_name": "Natura Ritual",
        "category_id": 5,
        "category_name": "Tratamientos",
        "price": 1290.0,
        "discount_price": None,
        "stock": 9,
        "description": "Tratamiento renovador con acidos suaves y antioxidantes para mejorar tono desigual.",
        "benefits": [
            "Ayuda a mejorar la uniformidad",
            "Refina textura opaca",
            "Rutina de noche de alto desempeno",
        ],
        "ingredients": ["Acido mandelico", "Niacinamida", "Resveratrol"],
        "usage": [
            "Usar por la noche en dias alternados",
            "Aplicar sobre piel seca",
            "No olvidar protector solar al dia siguiente",
        ],
        "skin_type": ["Mixta", "Normal", "Madura"],
        "concern": ["Manchas", "Textura", "Acne"],
        "images": ["rose", "amber", "linen"],
        "highlight": "Correccion gradual con sensorial premium.",
        "gradient": "from-amber-100 via-rose-50 to-white",
        "featured": False,
        "best_seller": False,
        "rating": 4.7,
        "review_count": 91,
        "faq": [
            {
                "question": "Cuanto tarda en verse cambio?",
                "answer": "La constancia de 6 a 8 semanas suele mostrar mejora visible.",
            }
        ],
        "is_active": True,
    },
    {
        "id": 6,
        "name": "Bruma Hidratante Esencia",
        "slug": "bruma-hidratante-esencia",
        "sku": "LB-MST-019",
        "brand_id": 3,
        "brand_name": "Lumiere Bio",
        "category_id": 3,
        "category_name": "Hidratantes",
        "price": 540.0,
        "discount_price": None,
        "stock": 27,
        "description": "Esencia en bruma para refrescar, hidratar y preparar la piel antes del serum.",
        "benefits": [
            "Hidratacion ligera inmediata",
            "Mejora absorcion de capas siguientes",
            "Reaplicacion sencilla durante el dia",
        ],
        "ingredients": ["Agua de rosas", "Glicerina", "Beta glucanos"],
        "usage": [
            "Rociar a 20 cm del rostro",
            "Dejar absorber o presionar suavemente",
            "Usar antes del serum o durante el dia",
        ],
        "skin_type": ["Todas"],
        "concern": ["Deshidratacion", "Opacidad"],
        "images": ["blush", "rose", "white"],
        "highlight": "Capas de hidratacion ligera y sofisticada.",
        "gradient": "from-rose-50 via-white to-orange-50",
        "featured": True,
        "best_seller": False,
        "rating": 4.8,
        "review_count": 132,
        "faq": [
            {
                "question": "Sirve sobre maquillaje?",
                "answer": "Si, puede usarse para refrescar sin alterar el acabado.",
            }
        ],
        "is_active": True,
    },
    {
        "id": 7,
        "name": "Serum Balance BHA + Niacinamida",
        "slug": "serum-balance-bha-niacinamida",
        "sku": "AD-TRT-021",
        "brand_id": 2,
        "brand_name": "Atelier Derm",
        "category_id": 5,
        "category_name": "Tratamientos",
        "price": 1050.0,
        "discount_price": 890.0,
        "stock": 16,
        "description": "Serum de uso nocturno para poros visibles, brotes esporadicos y textura irregular.",
        "benefits": [
            "Ayuda a desobstruir poros",
            "Mejora textura sin sensacion pesada",
            "Acompana rutinas para acne adulto",
        ],
        "ingredients": ["BHA", "Niacinamida", "Zinc PCA"],
        "usage": [
            "Aplicar 2 a 3 noches por semana",
            "Extender sobre piel seca",
            "Aumentar frecuencia segun tolerancia",
        ],
        "skin_type": ["Mixta", "Grasa", "Normal"],
        "concern": ["Acne", "Poros", "Textura"],
        "images": ["linen", "white", "sand"],
        "highlight": "Control elegante de brotes y textura.",
        "gradient": "from-stone-100 via-white to-rose-50",
        "featured": True,
        "best_seller": False,
        "rating": 4.7,
        "review_count": 88,
        "faq": [
            {
                "question": "Sirve para acne adulto?",
                "answer": "Si, fue curado para brotes esporadicos, poros y textura en piel adulta.",
            }
        ],
        "is_active": True,
    },
]

BLOG_POSTS = [
    {
        "id": 1,
        "title": "Como armar una rutina efectiva para piel madura",
        "slug": "como-armar-rutina-piel-madura",
        "author": "Equipo Skin Hearten",
        "content": [
            "La rutina empieza por limpieza suave y fotoproteccion constante.",
            "La constancia gana sobre la saturacion de pasos.",
        ],
        "meta_title": "Rutina para piel madura",
        "meta_description": "Guia base para una rutina premium",
    }
]

COUPONS = [
    {"id": 1, "code": "GLOW10", "coupon_type": "percentage", "value": 10.0},
    {"id": 2, "code": "ENVIOGRATIS", "coupon_type": "free_shipping", "value": 0.0},
]

USERS = [
    {
        "id": 1,
        "email": "admin@skinhearten.com",
        "first_name": "Super",
        "last_name": "Admin",
        "hashed_password": get_password_hash("Admin123!"),
        "role": "superadmin",
    }
]

CUSTOMERS = [
    {
        "id": 1,
        "email": "cliente@skinhearten.com",
        "first_name": "Cliente",
        "last_name": "Demo",
        "phone": "+52 55 1234 5678",
        "hashed_password": get_password_hash("Cliente123!"),
    }
]

CARTS: dict[int, dict] = {
    1: {
        "customer_id": 1,
        "items": [],
    }
}

ORDERS = [
    {
        "id": 1,
        "order_number": "SH-1043",
        "customer_id": 1,
        "status": "paid",
        "subtotal": 980.0,
        "discount_total": 0.0,
        "shipping_total": 149.0,
        "grand_total": 1129.0,
        "payment_provider": "mercadopago",
        "items": [
            {"product_id": 2, "product_name": "Gel Limpiador Barrera", "quantity": 1, "unit_price": 649.0}
        ],
    }
]

SKIN_QUIZ_LEADS: list[dict] = []


def list_products() -> list[dict]:
    return deepcopy(PRODUCTS)


def get_product(product_id: int) -> dict | None:
    return next((deepcopy(product) for product in PRODUCTS if product["id"] == product_id), None)


def get_product_by_slug(slug: str) -> dict | None:
    return next((deepcopy(product) for product in PRODUCTS if product["slug"] == slug), None)


def list_categories() -> list[dict]:
    return deepcopy(CATEGORIES)


def list_brands() -> list[dict]:
    return deepcopy(BRANDS)


def get_blog_posts() -> list[dict]:
    return deepcopy(BLOG_POSTS)


def get_blog_post_by_slug(slug: str) -> dict | None:
    return next((deepcopy(post) for post in BLOG_POSTS if post["slug"] == slug), None)


def get_mock_admin_by_email(email: str) -> dict | None:
    return next((user for user in USERS if user["email"] == email), None)


def get_mock_customer_by_email(email: str) -> dict | None:
    return next((customer for customer in CUSTOMERS if customer["email"] == email), None)


def create_mock_customer(payload: dict) -> dict:
    next_id = max(customer["id"] for customer in CUSTOMERS) + 1 if CUSTOMERS else 1
    customer = {"id": next_id, **payload}
    CUSTOMERS.append(customer)
    CARTS[next_id] = {"customer_id": next_id, "items": []}
    return deepcopy(customer)


def get_cart(customer_id: int) -> dict:
    return CARTS.setdefault(customer_id, {"customer_id": customer_id, "items": []})


def add_cart_item(customer_id: int, product_id: int, quantity: int) -> dict:
    cart = get_cart(customer_id)
    product = next((product for product in PRODUCTS if product["id"] == product_id), None)
    if not product:
        raise ValueError("Product not found")

    existing = next((item for item in cart["items"] if item["product_id"] == product_id), None)
    if existing:
        existing["quantity"] += quantity
    else:
        cart["items"].append(
            {
                "id": len(cart["items"]) + 1,
                "product_id": product_id,
                "product_name": product["name"],
                "quantity": quantity,
                "unit_price": product["discount_price"] or product["price"],
            }
        )

    return deepcopy(cart)


def update_cart_item(customer_id: int, item_id: int, quantity: int) -> dict:
    cart = get_cart(customer_id)
    item = next((entry for entry in cart["items"] if entry["id"] == item_id), None)
    if not item:
        raise ValueError("Item not found")

    item["quantity"] = quantity
    return deepcopy(cart)


def remove_cart_item(customer_id: int, item_id: int) -> dict:
    cart = get_cart(customer_id)
    cart["items"] = [item for item in cart["items"] if item["id"] != item_id]
    return deepcopy(cart)


def list_orders_for_customer(customer_id: int) -> list[dict]:
    return [deepcopy(order) for order in ORDERS if order["customer_id"] == customer_id]


def get_order_by_id(order_id: int) -> dict | None:
    return next((deepcopy(order) for order in ORDERS if order["id"] == order_id), None)


def create_order(order: dict) -> dict:
    next_id = max(entry["id"] for entry in ORDERS) + 1 if ORDERS else 1
    order_payload = {"id": next_id, **order}
    ORDERS.append(order_payload)
    CARTS[order["customer_id"]] = {"customer_id": order["customer_id"], "items": []}
    return deepcopy(order_payload)


def update_order_status(order_id: int, status: str) -> dict | None:
    order = next((entry for entry in ORDERS if entry["id"] == order_id), None)
    if not order:
        return None

    order["status"] = status
    return deepcopy(order)


def create_product(payload: dict) -> dict:
    next_id = max(product["id"] for product in PRODUCTS) + 1 if PRODUCTS else 1
    product = {"id": next_id, **payload}
    PRODUCTS.append(product)
    return deepcopy(product)


def update_product(product_id: int, payload: dict) -> dict | None:
    product = next((entry for entry in PRODUCTS if entry["id"] == product_id), None)
    if not product:
        return None
    product.update(payload)
    return deepcopy(product)


def delete_product(product_id: int) -> bool:
    index = next((idx for idx, product in enumerate(PRODUCTS) if product["id"] == product_id), None)
    if index is None:
        return False
    PRODUCTS.pop(index)
    return True


def create_entity(collection: list[dict], payload: dict) -> dict:
    next_id = max(entry["id"] for entry in collection) + 1 if collection else 1
    entity = {"id": next_id, **payload}
    collection.append(entity)
    return deepcopy(entity)


def update_entity(collection: list[dict], entity_id: int, payload: dict) -> dict | None:
    entity = next((entry for entry in collection if entry["id"] == entity_id), None)
    if not entity:
        return None
    entity.update(payload)
    return deepcopy(entity)


def delete_entity(collection: list[dict], entity_id: int) -> bool:
    index = next((idx for idx, entry in enumerate(collection) if entry["id"] == entity_id), None)
    if index is None:
        return False
    collection.pop(index)
    return True


def create_skin_quiz_lead(payload: dict) -> dict:
    next_id = max(lead["id"] for lead in SKIN_QUIZ_LEADS) + 1 if SKIN_QUIZ_LEADS else 1
    lead = {
        "id": next_id,
        "created_at": datetime.now(timezone.utc),
        "status": "new",
        "internal_notes": None,
        "last_contacted_at": None,
        **payload,
    }
    SKIN_QUIZ_LEADS.append(lead)
    return deepcopy(lead)


def list_skin_quiz_leads(
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
    status: str | None = None,
    source: str | None = None,
) -> list[dict]:
    normalized_search = search.strip().lower() if search else None
    leads = [deepcopy(lead) for lead in SKIN_QUIZ_LEADS]

    filtered: list[dict] = []
    for lead in leads:
        created_at = lead["created_at"]
        if source and lead.get("source") != source:
            continue
        if status and (lead.get("status") or "new") != status:
            continue
        if date_from and created_at < date_from:
            continue
        if date_to and created_at >= date_to:
            continue
        if normalized_search:
            haystack = " ".join(
                [
                    str(lead.get("name") or ""),
                    str(lead.get("whatsapp") or ""),
                    str(lead.get("email") or ""),
                ]
            ).lower()
            if normalized_search not in haystack:
                continue
        filtered.append(lead)

    return sorted(filtered, key=lambda lead: lead["created_at"], reverse=True)


def get_skin_quiz_lead(lead_id: int) -> dict | None:
    lead = next((entry for entry in SKIN_QUIZ_LEADS if entry["id"] == lead_id), None)
    if not lead:
        return None
    return deepcopy(lead)


def update_skin_quiz_lead(lead_id: int, payload: dict) -> dict | None:
    lead = next((entry for entry in SKIN_QUIZ_LEADS if entry["id"] == lead_id), None)
    if not lead:
        return None

    lead.update(payload)
    return deepcopy(lead)
