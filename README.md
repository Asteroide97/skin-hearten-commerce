# Skin Hearten Commerce V1

Monorepo base para reemplazar Shopify con una tienda propia enfocada en skincare, mobile first y preparada para despliegue en Azure.

## Estructura

- `apps/web`: storefront y panel admin con Next.js 15, TypeScript, TailwindCSS, React Query, Zustand, React Hook Form y Zod.
- `apps/api`: API con FastAPI, SQLAlchemy, Alembic y JWT.
- `docs`: documentacion tecnica inicial.

## Alcance inicial implementado

- Storefront con home, catalogo, detalle de producto, carrito, checkout, blog y cuenta.
- Panel admin inicial con dashboard, productos, pedidos y clientes.
- Modelado base del backend para catalogo, pedidos, pagos, cupones, blog y configuracion.
- Endpoints principales para auth, catalogo, carrito, checkout, pagos, pedidos y CRUD admin.

## Arranque sugerido

### Frontend

```bash
npm install
npm run dev:web
```

### Backend

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload
```

## Variables de entorno

Revisar:

- `apps/web/.env.example`
- `apps/api/.env.example`

## Notas

- La integracion de Stripe se dejo encaminada para Checkout Sessions.
- Mercado Pago y PayPal quedaron abstraidos en servicios para completar credenciales y callbacks reales.
- El frontend usa datos locales de ejemplo para mostrar la experiencia mientras se conecta con la API.

## Credenciales demo

- Cliente: `cliente@skinhearten.com` / `Cliente123!`
- Admin: `admin@skinhearten.com` / `Admin123!`
