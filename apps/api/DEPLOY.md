# Skin Hearten API Deploy

Esta guia deja `apps/api` lista para desplegar la API fuera de local con base de datos persistente, migraciones y seeds iniciales.

## Variables de entorno

Configura estas variables en cualquier plataforma:

```env
APP_NAME=Skin Hearten API
ENVIRONMENT=production
API_V1_STR=/api/v1
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DB_NAME
SECRET_KEY=generate-a-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_URL=https://TU-FRONTEND.vercel.app
BACKEND_CORS_ORIGINS=["https://TU-FRONTEND.vercel.app","https://skinhearten.mx","https://www.skinhearten.mx"]
ADMIN_EMAIL=admin@skinhearten.com
ADMIN_PASSWORD=define-una-password-segura
STRIPE_SECRET_KEY=
MERCADOPAGO_ACCESS_TOKEN=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

Notas:

- `FRONTEND_URL` debe ser la URL principal actual del storefront en Vercel.
- `BACKEND_CORS_ORIGINS` acepta JSON list o lista separada por comas.
- Para local, puedes seguir usando `sqlite:///./skin_hearten.db`.
- Para Azure SQL puedes usar `mssql+pyodbc://...` con `ODBC Driver 18 for SQL Server`.

## Migraciones

Desde `apps/api`:

```bash
alembic upgrade head
```

Ese comando crea el esquema base y luego aplica Skin Quiz, CRM, automatizaciones y recordatorios en orden.

En Windows local, si trabajas con el virtualenv del repo, usa:

```powershell
.\.venv\Scripts\alembic.exe upgrade head
```

Eso evita el conflicto con la carpeta `alembic/` del proyecto al intentar usar `python -m alembic`.

## Seeds

Crear admin:

```bash
python scripts/seed_admin.py
```

Crear catalogo demo:

```bash
python scripts/seed_catalog.py
```

Los scripts son idempotentes. `seed_admin.py` no imprime la password.

`seed_catalog.py` tambien crea estos cupones demo persistentes:

- `GLOW10`: 10% de descuento, activo, subtotal minimo `500`
- `ENVIOGRATIS`: envio gratis, activo, subtotal minimo `1200`
- `BIENVENIDA15`: 15% de descuento, activo, `usage_limit=500`, `per_customer_limit=1`

## Health checks

Prueba la API:

```bash
curl https://TU-BACKEND/health
curl https://TU-BACKEND/api/v1/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "environment": "production",
  "database": "ok"
}
```

## Comando de arranque

Sin Docker:

```bash
gunicorn app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --workers 2
```

Local simple:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Opcion A: Render, Railway o Fly.io

1. Usa `apps/api` como root del servicio.
2. Instala dependencias con `pip install .`.
3. Configura las variables de entorno listadas arriba.
4. Ejecuta migraciones:

```bash
alembic upgrade head
python scripts/seed_admin.py
python scripts/seed_catalog.py
```

5. Arranca con:

```bash
gunicorn app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --workers 2
```

Para Render o Railway, usa una base Postgres gestionada y apunta `DATABASE_URL` a esa instancia.

## Opcion B: Azure App Service

1. Despliega `apps/api` como contenedor usando el `Dockerfile`.
2. Configura App Settings con las variables de entorno.
3. Si usaras Azure SQL, define `DATABASE_URL` con `mssql+pyodbc://...`.
4. Ejecuta migraciones una vez en la instancia o en un job:

```bash
alembic upgrade head
python scripts/seed_admin.py
python scripts/seed_catalog.py
```

5. Expone el puerto `8000`.

Si prefieres una ruta mas simple en Azure, puedes usar Azure Database for PostgreSQL y el mismo `DATABASE_URL` estilo Postgres.

## Opcion C: VPS Linux con systemd

1. Copia `apps/api` al servidor.
2. Crea un virtualenv e instala:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install .
```

3. Exporta variables de entorno en un archivo `.env` o en el unit file.
4. Ejecuta:

```bash
alembic upgrade head
python scripts/seed_admin.py
python scripts/seed_catalog.py
```

5. Crea `/etc/systemd/system/skin-hearten-api.service`:

```ini
[Unit]
Description=Skin Hearten API
After=network.target

[Service]
WorkingDirectory=/srv/skin-hearten/apps/api
EnvironmentFile=/srv/skin-hearten/apps/api/.env
ExecStart=/srv/skin-hearten/apps/api/.venv/bin/gunicorn app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --workers 2
Restart=always
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

6. Activa el servicio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now skin-hearten-api
sudo systemctl status skin-hearten-api
```

## Conectar Vercel

En Vercel, define estas variables del frontend:

```env
NEXT_PUBLIC_API_URL=https://TU-BACKEND/api/v1
SKIN_HEARTEN_ADMIN_EMAIL=admin@skinhearten.com
SKIN_HEARTEN_ADMIN_PASSWORD=la-misma-credencial-admin
```

Luego redeploya el storefront. El frontend quedara apuntando al backend real mediante `NEXT_PUBLIC_API_URL`.

## Pruebas manuales de cupones

1. Cupon valido

```bash
curl -X POST http://127.0.0.1:8000/api/v1/coupons/validate \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"GLOW10\",\"subtotal\":900,\"items\":[{\"productId\":\"1\",\"slug\":\"serum-renovador-peptidos\",\"name\":\"Serum Renovador Peptidos\",\"quantity\":1,\"unitPrice\":900}]}"
```

Esperado: `valid=true`, `reasonCode=valid`, `discountAmount=90`.

2. Subtotal insuficiente

```bash
curl -X POST http://127.0.0.1:8000/api/v1/coupons/validate \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"ENVIOGRATIS\",\"subtotal\":800,\"items\":[]}"
```

Esperado: `valid=false`, `reasonCode=subtotal_too_low`.

3. Cupon expirado

Actualiza un cupon desde `/admin/cupones` o por API con `endsAt` a una fecha pasada y luego repite `POST /coupons/validate`.

Esperado: `valid=false`, `reasonCode=expired`.

4. Límite total de uso

Configura un cupon con `usageLimit=1`, completa un checkout valido y vuelve a validarlo.

Esperado: `valid=false`, `reasonCode=usage_limit_reached`.

5. Límite por clienta

Usa `BIENVENIDA15` en una orden con el mismo `customerEmail` o `customerPhone` y luego intenta otra validacion para la misma clienta.

Esperado: `valid=false`, `reasonCode=per_customer_limit_reached`.

6. Envio gratis

Completa un checkout con `ENVIOGRATIS` y subtotal mayor o igual a `1200`.

Esperado: `freeShipping=true`, `discountAmount=0`, `shipping=0` en checkout.
