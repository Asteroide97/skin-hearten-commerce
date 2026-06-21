# Arquitectura Base

## Objetivo

Entregar una base tecnica lista para evolucionar a una operacion completa de e-commerce sin dependencia de Shopify.

## Frontend

- Next.js 15 App Router.
- Mobile first con paleta clara, tipografia Inter y Playfair Display.
- React Query preparado para orquestar consumo de API.
- Zustand para estado de carrito.
- React Hook Form y Zod para checkout y auth.

## Backend

- FastAPI con rutas versionadas en `app/api/routes`.
- SQLAlchemy 2.0 para entidades y relaciones.
- Alembic preparado para migraciones.
- JWT para autenticacion cliente y admin.
- Servicios de pago aislados por proveedor.

## Modulos

- Catalogo: productos, categorias, marcas y stock.
- Compra: carrito, checkout, pagos, pedidos y cupones.
- Contenido: blog y configuracion.
- Administracion: dashboard, productos, pedidos, clientes y auditoria futura.

## Decisiones iniciales

- Stripe usa Checkout Sessions como estrategia principal para pagos one-time.
- Las tablas `users` y `customers` se mantienen separadas para aislar panel admin de cuentas de compradores.
- El frontend parte con datos mockeados para acelerar UI y contrato visual mientras el backend se termina de conectar.

