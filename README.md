# Mini Payment Management System

Sistema de gestión de pagos con arquitectura de microservicios: un API Gateway (Express) que enruta tráfico hacia un Payment Service (NestJS + Prisma + PostgreSQL).

## Arquitectura

```
Cliente
   │
   ▼
api-gateway :3000  (Express – autenticación, logging, rate limiting)
   │
   ▼ HTTP interno
payment-service :3000  (NestJS – lógica de negocio, Prisma ORM)
   │
   ▼
PostgreSQL :5432  (payments_db)
```

## Inicio rápido (un comando)

```bash
docker-compose up --build
```

Los servicios quedan disponibles en:

| Servicio         | URL                           |
|------------------|-------------------------------|
| API Gateway      | http://localhost:3000         |
| Payment Service  | http://localhost:3001         |
| PostgreSQL       | localhost:5432                |

Las migraciones se aplican automáticamente al iniciar el payment-service.

## Variables de entorno

### payment-service

| Variable       | Valor por defecto                                          | Descripción                   |
|----------------|------------------------------------------------------------|-------------------------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/payments_db` | Cadena de conexión PostgreSQL |
| `PORT`         | `3000`                                                     | Puerto interno del servicio   |

### api-gateway

| Variable              | Valor por defecto              | Descripción                              |
|-----------------------|-------------------------------|------------------------------------------|
| `PORT`                | `4000`                        | Puerto interno del servicio              |
| `PAYMENT_SERVICE_URL` | `http://payment-service:3000` | URL del payment-service dentro de Docker |
| `JWT_SECRET`          | `PRUEBA_TECNICA_SECRET_KEY`   | Secreto para verificar tokens JWT        |

## Catálogo de endpoints

Todos los endpoints requieren autenticación vía **Bearer token JWT** o header `x-api-key`.

### Transactions

#### Crear transacción
```
POST /api/v1/transactions
x-api-key: test-api-key

{
  "merchant_id": "4c950d1d-4c25-45e1-9d56-ac37383c1e3c",
  "amount": 100.50,
  "currency": "USD",
  "type": "payin"
}
```
```json
{
  "id": "a31c6dd0-09e3-43c3-8b74-9dd1d9717736",
  "merchantId": "4c950d1d-4c25-45e1-9d56-ac37383c1e3c",
  "amount": "100.50",
  "currency": "USD",
  "type": "payin",
  "status": "pending",
  "reference": "TXN-20240115-W6H4TS",
  "metadata": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

#### Listar transacciones
```
GET /api/v1/transactions?merchant_id=uuid&page=1&limit=20&status=pending
x-api-key: test-api-key
```
```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

#### Obtener transacción por ID
```
GET /api/v1/transactions/:id?merchant_id=uuid
x-api-key: test-api-key
```

#### Actualizar estado
```
PATCH /api/v1/transactions/:id/status
x-api-key: test-api-key

{ "status": "approved" }
```

**Transiciones válidas de estado:**
```
pending → approved | rejected | failed
approved → completed | failed
```

### Settlements

#### Generar liquidación
```
POST /api/v1/settlements
x-api-key: test-api-key

{
  "merchant_id": "uuid-del-merchant",
  "period_start": "2024-01-01T00:00:00.000Z",
  "period_end": "2024-01-31T23:59:59.999Z"
}
```
```json
{
  "id": "uuid",
  "merchantId": "4c950d1d-4c25-45e1-9d56-ac37383c1e3c",
  "totalAmount": "1500.00",
  "transactionCount": 15,
  "status": "pending",
  "periodStart": "2024-01-01T00:00:00.000Z",
  "periodEnd": "2024-01-31T23:59:59.999Z",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Obtener liquidación por ID
```
GET /api/v1/settlements/:id
x-api-key: test-api-key
```

### Health check
```
GET /
```
```json
{ "service": "api-gateway", "status": "ok" }
```

## Autenticación

El API Gateway soporta dos mecanismos (en orden de prioridad):

1. **JWT Bearer token** — `Authorization: Bearer <token>`
2. **API Key** — `x-api-key: <key>`

Si se envía un Bearer token inválido el request se rechaza con 401 aunque haya un `x-api-key`. Si no se envía ninguno de los dos, también 401.

## Decisiones de diseño

### Máquina de estados para transacciones
Las transiciones de estado siguen una máquina de estados estricta para garantizar integridad financiera. Intentar una transición inválida devuelve 422 Unprocessable Entity con detalle del estado actual y el solicitado.

### Operaciones atómicas en settlements
`SettlementsService.generate()` usa `prisma.$transaction()` para garantizar que el registro del settlement y el marcado de las transacciones como `settlement_id` ocurren atómicamente. Si falla cualquier parte, se revierte todo.

### Precisión decimal con Prisma
Los montos se almacenan como `Decimal` en PostgreSQL y Prisma los serializa como `string` en JSON (ej. `"100.50"`). Esto evita pérdida de precisión de punto flotante en operaciones financieras.

### Rate limiting en memoria
El rate limiter usa un `Map` en proceso con ventanas deslizantes de 60 s y un límite de 100 req/min por `x-api-key` (o IP como fallback). Un `setInterval` limpia entradas expiradas cada minuto para evitar fugas de memoria. En producción escalar a múltiples instancias requeriría Redis.

### merchant_id en el body de transacciones
El spec requiere `merchant_id` en el body con validación `@IsUUID()`. El guard `ApiKeyGuard` lo valida contra la base de datos y expone el merchant via `@CurrentMerchant()`. Ambos datos son consistentes; el body actúa como declaración explícita del merchant mientras que el guard verifica la autorización.

### Proxy en API Gateway
El middleware de proxy reenvía los headers `x-api-key`, `content-type` y `authorization` al payment-service para que el guard de NestJS pueda validar la API key. Errores de conexión (ECONNREFUSED, timeout) se mapean a 503/504 para mantener semántica HTTP correcta.

### Multi-stage Dockerfile
Ambos servicios usan builds en dos etapas:
- **builder**: instala todas las dependencias (incluyendo devDeps) y compila TypeScript
- **production**: instala solo dependencias de producción y copia el `dist/` compilado

Esto reduce el tamaño final de las imágenes excluyendo compiladores, type definitions y herramientas de desarrollo.
