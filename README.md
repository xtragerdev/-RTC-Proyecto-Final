# ReNodo · La biblioteca de objetos de tu barrio

![ReNodo](apps/web/public/og.png)

ReNodo es una plataforma FullStack de economía circular para que los vecinos reserven
objetos de uso ocasional —herramientas, material de acampada, equipamiento para eventos o
tecnología— y los recojan en centros comunitarios cercanos.

El problema es sencillo: muchos objetos se compran para utilizarlos una o dos veces, ocupan
espacio y terminan convirtiéndose en residuo. ReNodo transforma esa compra aislada en un
inventario compartido, trazable y cuidado por el barrio.

## Enlaces

- **Repositorio:** [github.com/xtragerdev/-RTC-Proyecto-Final](https://github.com/xtragerdev/-RTC-Proyecto-Final)
- **Frontend:** pendiente de publicación en un dominio neutral
- **API:** pendiente de completar la publicación
- **Documentación REST local:** `http://localhost:4000/api-docs`
- **Dataset:** [`data/ReNodo-dataset.xlsx`](data/ReNodo-dataset.xlsx)
- **Memoria del proyecto:** [`docs/ReNodo-Memoria-Proyecto.pdf`](docs/ReNodo-Memoria-Proyecto.pdf)

> El frontend ofrece accesos demostrativos para miembro, responsable y administrador. No
> utiliza datos personales ni modifica la base real en ese modo.

## Público y propuesta de valor

ReNodo está pensado para personas que viven en ciudad y necesitan objetos de forma puntual,
pero no quieren comprarlos, almacenarlos o desecharlos. También ayuda a asociaciones y
centros vecinales a gestionar inventario, solicitudes, entregas y devoluciones desde una
interfaz común.

La experiencia responde siempre a tres preguntas:

1. **¿Está disponible?** El catálogo filtra por categoría, centro y estado.
2. **¿Qué tengo que hacer?** Cada ficha explica fechas, fianza, recogida y devolución.
3. **¿Quién puede cambiarlo?** Los permisos se aplican en la API, no solo en la interfaz.

## Funcionalidades

### Experiencia de miembro

- Registro seguro: todas las cuentas nacen con rol `member`.
- Login JWT y sesión persistida.
- Catálogo con búsqueda diferida, categoría, centro, disponibilidad y ordenación.
- Ficha de objeto con condición, duración máxima, fianza, impacto y centro.
- Reserva por fechas con validación de rango y duración.
- Favoritos sin duplicados.
- Historial de reservas y cancelación optimista.
- Perfil, seguridad y eliminación de la propia cuenta.
- Avatar mediante `multipart/form-data` y Cloudinary.

### Operación de centros

- Cola de solicitudes con aprobación o rechazo.
- Seguimiento de recogida, devolución y retrasos.
- CRUD del inventario del centro asignado.
- Estado de objetos: disponible, reservado, mantenimiento o retirado.
- Métricas operativas y resumen de actividad.

### Administración

- CRUD de usuarios y centros.
- Asignación de responsables a centros.
- Cambio de roles sin permitir autoelevación.
- Supervisión global de inventario y reservas.
- Documentación OpenAPI mediante Swagger UI.

## Captura conceptual

La dirección visual evita el aspecto de un comercio electrónico. La paleta crema, verde
bosque, lima y terracota comunica comunidad, cuidado y circularidad. Las tarjetas muestran
primero disponibilidad y centro; el precio no ocupa el lugar principal porque el préstamo es
gratuito.

Variables principales en `apps/web/app/style.css`:

```css
:root {
  --background: #f4f1e9;
  --foreground: #17372e;
  --primary: #245941;
  --secondary: #ddec94;
  --accent: #f2c86f;
  --space-4: 1rem;
  --space-7: 3rem;
  --radius: 0.9rem;
}
```

La interfaz incluye foco visible, enlace para saltar al contenido, etiquetas accesibles,
estados de carga, vacío, error y éxito, reducción de movimiento y diseños específicos para
móvil, tableta y escritorio.

## Arquitectura

```text
renodo/
├── apps/
│   ├── api/                 # Express, MongoDB, seguridad, seed y pruebas
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── controllers/
│   │   │   ├── docs/
│   │   │   ├── middlewares/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── seeds/
│   │   │   ├── services/
│   │   │   └── validators/
│   │   └── tests/
│   └── web/                 # React 19, Next.js, componentes y rutas
│       ├── app/
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── lib/
│       └── public/
├── data/
│   ├── csv/                 # Cuatro fuentes leídas con node:fs
│   ├── ReNodo-dataset.xlsx
│   └── manifest.json
├── docs/
│   ├── architecture.md
│   └── rubric.md
├── render.yaml
└── README.md
```

Más detalle en [`docs/architecture.md`](docs/architecture.md).

## Modelo de datos

| Colección | Registros iniciales | Relaciones principales |
|---|---:|---|
| `users` | 60 | centro preferido, favoritos, reservas |
| `hubs` | 12 | managers, objetos y reservas |
| `items` | 180 | centro y reservas |
| `reservations` | 260 | usuario, objeto y centro |
| **Total** | **512** | **4 colecciones relacionadas** |

### User

Nombre, email único, contraseña cifrada, rol, distrito, avatar, centro preferido, favoritos
sin duplicados y estado activo.

### Hub

Código estable, nombre, slug, dirección, distrito, coordenadas GeoJSON, horarios, contacto,
imagen, responsables y estado activo.

### Item

Código estable, nombre, categoría, descripción, centro, condición, estado, fianza, duración
máxima, coste de reposición, impacto estimado, etiquetas, imagen, préstamos acumulados y
versión de reserva.

### Reservation

Código estable, usuario, objeto, centro, inicio, fin, estado, nota, fechas de aprobación,
recogida, devolución y cancelación.

## Excel, CSV y semilla

El libro [`ReNodo-dataset.xlsx`](data/ReNodo-dataset.xlsx) incluye cinco hojas:

- **Resumen:** conteos, gráfico por categoría y controles de integridad.
- **Usuarios:** 60 perfiles sintéticos.
- **Centros:** 12 nodos de barrio.
- **Objetos:** 180 objetos, 30 por categoría.
- **Reservas:** 260 operaciones con relaciones verificadas.

Controles finales del libro y del auditor de la API:

- 512 registros.
- 0 relaciones huérfanas.
- 0 rangos de fecha inválidos.
- 0 reservas que superen `maxLoanDays`.
- 0 solapamientos entre estados bloqueantes.
- 260/260 reservas con usuario, objeto y centro válidos.

La semilla de `apps/api/src/seeds/seedDatabase.js`:

1. Lee los cuatro CSV con `fs.promises.readFile()`.
2. Convierte el CSV mediante `csv-parse`.
3. Valida tipos, fechas, enums y relaciones.
4. Resuelve códigos externos a `_id` de MongoDB.
5. Ejecuta todos los `bulkWrite` idempotentes dentro de una única transacción.
6. Informa de insertados, actualizados y totales sin duplicar documentos.

## Reglas de autorización

| Acción | Miembro | Responsable | Admin |
|---|:---:|:---:|:---:|
| Ver catálogo y centros | ✓ | ✓ | ✓ |
| Reservar y cancelar lo propio | ✓ | ✓ | ✓ |
| Editar/eliminar su cuenta | ✓ | ✓ | ✓ |
| Eliminar otra cuenta | — | — | ✓ |
| Gestionar objetos | — | Solo sus centros | Todos |
| Cambiar estado de reservas | — | Solo sus centros | Todas |
| Crear/eliminar centros | — | — | ✓ |
| Asignar responsables | — | — | ✓ |
| Cambiar roles | — | — | ✓ |

El frontend adapta la navegación, pero la API repite cada comprobación. Cambiar el HTML o
enviar una petición manual no permite saltarse los permisos.

## Reserva sin dobles asignaciones

Una solicitud `requested` todavía no bloquea el objeto. La aprobación vuelve a comprobar
la disponibilidad dentro de una transacción y los estados `approved`, `collected` y
`overdue` sí bloquean el intervalo. Dos rangos se solapan cuando:

```text
existing.startDate < requested.endDate
AND
existing.endDate > requested.startDate
```

La comprobación y la escritura se ejecutan en una transacción. Además, cada intento
incrementa `Item.bookingVersion`, provocando un conflicto de escritura cuando dos peticiones
concurrentes intentan reservar el mismo objeto. Las pruebas confirman que solo una puede
ganar; los rangos adyacentes sí se permiten.

## Tecnologías

### Frontend

- React 19 y TypeScript.
- Next.js con App Router y despliegue compatible con proveedores Node.js.
- TanStack Query.
- React Hook Form + Zod.
- Sonner para feedback no bloqueante.
- Base UI, shadcn y Lucide.
- CSS responsive con variables y `color-mix()`.

### Backend

- Node.js 22 y Express 5.
- MongoDB Atlas y Mongoose.
- JWT + bcryptjs.
- Zod.
- Multer + Cloudinary.
- Pino HTTP, Helmet, CORS, compression y rate limiting.
- Swagger UI / OpenAPI.
- Vitest, Supertest y MongoMemoryReplSet.

## Hooks avanzados con propósito

| Hook | Uso real |
|---|---|
| `useReducer` | Estado de filtros, autenticación y cola de reservas |
| `useDeferredValue` | La escritura del buscador no se bloquea por el filtrado |
| `useTransition` | Categorías, estados y acciones operativas de menor prioridad |
| `useOptimistic` | Cancelación inmediata antes de confirmar el servidor |
| `useMemo` | Ordenación, favoritos, centros y datos derivados |
| Hook `useFavorites` | Persistencia local y deduplicación mediante `Set` |
| Context | Sesión, token, rol y modo demostración |
| TanStack Query | Caché de catálogo, reintentos y estado de red |

## Instalación local

### Requisitos

- Node.js `>= 22.13.0`.
- Una base MongoDB local o de Atlas.
- Credenciales de Cloudinary solo si se desean probar imágenes.

### 1. Instalar

```bash
git clone https://github.com/xtragerdev/-RTC-Proyecto-Final.git
cd ./-RTC-Proyecto-Final
npm --prefix apps/api ci
npm --prefix apps/web ci
```

### 2. Configurar la API

```bash
cp apps/api/.env.example apps/api/.env
```

Variables obligatorias:

```dotenv
PORT=4000
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/renodo
JWT_SECRET=un-secreto-aleatorio-de-al-menos-32-caracteres
CLIENT_ORIGINS=http://localhost:3000
```

Variables opcionales para imágenes:

```dotenv
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=renodo
```

### 3. Configurar el frontend

```bash
cp apps/web/.env.example apps/web/.env.local
```

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Crear la base de datos

```bash
npm run seed
```

En producción también debe definirse `SEED_USER_PASSWORD`. En desarrollo, la contraseña de
las cuentas sembradas es `ReNodoDemo2026!` si no se indica otra.

### 5. Arrancar

En dos terminales:

```bash
npm run dev:api
npm run dev:web
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api-docs`

## Accesos demostrativos del frontend

En `/acceso` aparecen tres botones:

- **Miembro:** catálogo, favoritos, cuenta y reservas.
- **Responsable:** panel de solicitudes e inventario.
- **Admin:** panel global y cambio de roles.

Son sesiones locales pensadas para revisar UX y permisos sin depender de servicios externos.
El botón de registro real utiliza la API y nunca permite elegir un rol superior.

## API principal

Todas las respuestas siguen una forma coherente:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Público |
| `POST` | `/api/v1/auth/login` | Público |
| `GET/PATCH/DELETE` | `/api/v1/auth/me` | Autenticado |
| `GET` | `/api/v1/items` | Público |
| `GET` | `/api/v1/items/:id` | Público |
| `POST/PATCH/DELETE` | `/api/v1/items/*` | Manager del centro / admin |
| `GET` | `/api/v1/hubs` | Público |
| `POST/DELETE` | `/api/v1/hubs` | Admin |
| `PATCH` | `/api/v1/hubs/:id` | Manager del centro / admin |
| `GET/POST/PATCH/DELETE` | `/api/v1/reservations/*` | Según propietario o centro |
| `PATCH` | `/api/v1/users/:id/role` | Admin |
| `PUT/DELETE` | `/api/v1/users/me/favorites/:itemId` | Autenticado |
| `GET` | `/api/v1/health` | Público |
| `GET` | `/api/v1/ready` | Público |

El contrato completo y los ejemplos están disponibles en Swagger.

## Imágenes y Cloudinary

- Registro y perfil: campo `avatar`.
- Centros y objetos: campo `image`.
- Formato: JPG, PNG o WebP.
- Tamaño máximo: 5 MB.
- Multer mantiene el fichero en memoria; no quedan temporales en disco.
- Una sustitución elimina el recurso anterior.
- Un fallo posterior de MongoDB elimina el recurso recién subido.

Sin credenciales de Cloudinary, el resto de la API sigue funcionando y devuelve un error
claro únicamente cuando se intenta subir una imagen.

## Calidad y pruebas

```bash
npm run check
```

El control completo ejecuta:

- Prettier check y ESLint en la API.
- 24 pruebas de integración y reglas de negocio.
- Oxlint con type checking en React.
- Build de producción de las ocho rutas del frontend.

Las pruebas del backend usan una réplica MongoDB efímera porque las transacciones no están
disponibles en una instancia aislada. Entre otros casos cubren registro, roles, alcance por
centro, favoritos, CRUD y concurrencia de reservas.

## Decisiones destacadas

- **Borrado lógico:** conserva trazabilidad sin mostrar datos desactivados al público.
- **Códigos externos:** permiten seguir una fila desde Excel hasta MongoDB.
- **Modo demo:** la evaluación del frontend no depende de credenciales privadas.
- **Fianza visible:** se explica como reembolsable y nunca se presenta como precio.
- **Centro primero:** dirección y horario aparecen antes de solicitar una reserva.
- **Estados comprensibles:** el lenguaje de UI traduce estados técnicos a acciones humanas.

## Comprobación de la rúbrica

La correspondencia punto por punto está documentada en [`docs/rubric.md`](docs/rubric.md).

Resumen:

- Variables y reutilización correcta de CSS.
- Tres colecciones relacionadas aparte de usuarios.
- Arquitectura React comprensible.
- UX/UI responsive y accesible.
- Componentes reutilizables.
- MongoDB creada desde Excel/CSV mediante `fs`.
- Hooks avanzados aplicados a necesidades concretas.
- Roles, Cloudinary, CRUD, documentación y pruebas adicionales.

## Licencia

[MIT](LICENSE) · Proyecto educativo FullStack.
