from fastapi import APIRouter

from app.api.routes import (
    admin_crm,
    admin_brands,
    admin_categories,
    admin_orders,
    admin_products,
    admin_skin_quiz_analytics,
    admin_skin_quiz_leads,
    auth,
    blog,
    brands,
    cart,
    categories,
    checkout,
    orders,
    payments,
    products,
    skin_quiz,
)

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(products.router, tags=["products"])
api_router.include_router(categories.router, tags=["categories"])
api_router.include_router(brands.router, tags=["brands"])
api_router.include_router(cart.router, tags=["cart"])
api_router.include_router(checkout.router, tags=["checkout"])
api_router.include_router(payments.router, tags=["payments"])
api_router.include_router(orders.router, tags=["orders"])
api_router.include_router(blog.router, tags=["blog"])
api_router.include_router(skin_quiz.router, tags=["skin-quiz"])
api_router.include_router(admin_products.router, tags=["admin-products"])
api_router.include_router(admin_categories.router, tags=["admin-categories"])
api_router.include_router(admin_brands.router, tags=["admin-brands"])
api_router.include_router(admin_orders.router, tags=["admin-orders"])
api_router.include_router(admin_crm.router, tags=["admin-crm"])
api_router.include_router(admin_skin_quiz_analytics.router, tags=["admin-skin-quiz-analytics"])
api_router.include_router(admin_skin_quiz_leads.router, tags=["admin-skin-quiz-leads"])
