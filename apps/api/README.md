# ReNodo API

API REST de Node.js, Express y MongoDB para la red de préstamo comunitario ReNodo.

## Desarrollo

```bash
cp .env.example .env
npm install
npm run seed
npm run dev
```

- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api-docs`
- Salud: `GET /api/v1/health`
- Disponibilidad de Mongo: `GET /api/v1/ready`

La semilla lee con `node:fs` los cuatro CSV de `../../data/csv`. Es idempotente: usa las
claves externas de cada fila para actualizar o insertar sin duplicar. El dataset contiene
60 usuarios, 12 nodos, 180 objetos y 260 reservas relacionadas. Primero valida claves,
relaciones, roles, fechas, duración máxima y solapamientos; después aplica todos los
`bulkWrite` en una única transacción para no dejar una carga parcial.

Las cuentas de la semilla usan el valor de `SEED_USER_PASSWORD` o, solo en desarrollo,
`ReNodoDemo2026!`. El registro público siempre crea el rol `member` aunque el cliente trate
de enviar otro rol.

## Seguridad y reservas

- JWT Bearer, contraseñas bcrypt y usuario activo consultado en cada petición.
- Roles `member`, `manager` y `admin`; los managers quedan limitados a sus propios nodos.
- Zod valida body, params y query. Helmet, CORS, rate limit y límite de payload incluidos.
- Una solicitud `requested` no bloquea el objeto. El intervalo semiabierto
  `[startDate, endDate)` queda bloqueado al aprobarla y mientras está `approved`,
  `collected` u `overdue`.
- Crear, reprogramar y aprobar incrementa `Item.bookingVersion` dentro de una transacción.
  Esto serializa las operaciones por objeto; dos solicitudes pueden coincidir, pero solo
  una aprobación solapada puede confirmar el préstamo.
- Los borrados son lógicos para conservar el historial.

## Imágenes

Cloudinary es opcional. Con credenciales configuradas, registro, nodos y objetos aceptan
`multipart/form-data`. El archivo se envía en `avatar` para registro/perfil y en `image`
para nodos/objetos. Se aceptan JPG, PNG o WebP de hasta 5 MB. Las sustituciones limpian el
asset anterior y un fallo de Mongo elimina el asset recién subido.

## Calidad

```bash
npm run format:check
npm run lint
npm test
```

Las pruebas de integración usan Supertest y `MongoMemoryReplSet`, ya que una instancia
Mongo aislada no soporta las transacciones necesarias para probar la concurrencia real.
