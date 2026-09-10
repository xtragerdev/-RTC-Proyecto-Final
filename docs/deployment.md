# Guía de despliegue · ReNodo

Esta guía deja el **backend** y el **frontend** publicados con enlaces accesibles desde el
README, tal como exige el enunciado del proyecto. Todo el proceso usa planes gratuitos.

| Pieza | Proveedor recomendado | Coste |
|---|---|---|
| Base de datos | MongoDB Atlas (M0) | Gratis |
| API (Express) | Render | Gratis |
| Frontend (Next.js) | Vercel (opción A) o Render (opción B) | Gratis |
| Imágenes | Cloudinary | Gratis |

> **Nota sobre el plan gratuito de Render:** el servicio se "duerme" tras 15 minutos sin
> tráfico y tarda ~30-60 s en despertar. La primera carga puede ser lenta; no es un error.

---

## 0. Requisitos previos

- Cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas), [Render](https://render.com)
  y [Cloudinary](https://cloudinary.com) (y [Vercel](https://vercel.com) si eliges la
  opción A para el frontend).
- El repositorio actualizado en GitHub (con el `render.yaml` que incluye `renodo-api` y
  `renodo-web`).

## 1. Base de datos (MongoDB Atlas)

1. Crea un clúster **M0 (Free)**.
2. En **Database Access**, crea un usuario con contraseña y rol `readWrite` sobre la base
   `renodo`.
3. En **Network Access**, añade `0.0.0.0/0` (necesario para que Render se conecte).
4. En **Connect → Drivers → Node.js**, copia la cadena de conexión:
   `mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/renodo`

## 2. API en Render

El archivo `render.yaml` de la raíz ya describe el servicio `renodo-api`.

1. En Render: **New + → Blueprint → Connect repository** y selecciona el repo.
   Render detecta `render.yaml` y crea los servicios.
2. Antes de aplicar, rellena las variables marcadas como `sync: false`:
   - `MONGODB_URI`: la cadena de Atlas del paso 1.
   - `CLIENT_ORIGINS`: déjala vacía de momento; la completarás en el paso 5 con la URL del
     frontend.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: desde el
     dashboard de Cloudinary (opcional; sin ellas la API funciona, pero fallan las subidas
     de imagen con un error claro).
   - `JWT_SECRET` se genera sola (`generateValue: true`).
3. Aplica el blueprint y espera a que `renodo-api` quede **Live**.
4. Comprueba: `https://<tu-api>.onrender.com/api/v1/health` debe responder `200` y
   `https://<tu-api>.onrender.com/api-docs` debe mostrar Swagger UI.

## 3. Sembrar la base de datos de producción

El plan gratuito de Render no incluye shell, así que la semilla se ejecuta **desde tu
equipo** apuntando a Atlas:

```bash
cd apps/api
cp .env.example .env
# Edita .env:
#   MONGODB_URI=<cadena de Atlas>
#   SEED_USER_PASSWORD=<una contraseña segura para las 60 cuentas sembradas>
npm run seed
```

Debe terminar con algo como
`Semilla ReNodo completada: { users: 60, hubs: 12, items: 180, reservations: 260, ... }`.

> Anota `SEED_USER_PASSWORD`: será la contraseña de cualquier cuenta `*@renodo.example`
> para demostraciones reales. El modo demo del frontend sigue funcionando sin tocar la
> base.

## 4. Frontend

### Opción A — Vercel (recomendada para Next.js)

1. En Vercel: **Add New → Project → Import** el repositorio.
2. **Root Directory:** `apps/web`.
3. Variables de entorno (se incrustan en el build, deben existir **antes** de desplegar):
   - `NEXT_PUBLIC_API_URL=https://<tu-api>.onrender.com`
   - `NEXT_PUBLIC_APP_URL=https://<tu-proyecto>.vercel.app`
4. Deploy. La URL final será `https://<tu-proyecto>.vercel.app`.

### Opción B — Render (todo en un proveedor)

El `render.yaml` ya incluye el servicio `renodo-web`. Solo rellena:

- `NEXT_PUBLIC_API_URL=https://<tu-api>.onrender.com`
- `NEXT_PUBLIC_APP_URL=https://renodo-web.onrender.com`

> Si cambias una variable `NEXT_PUBLIC_*` después, Render/Vercel deben **recompilar**
> (Manual Deploy → Clear build cache & deploy), porque esos valores van dentro del bundle.

## 5. Conectar API ↔ frontend (CORS)

1. En Render → `renodo-api` → **Environment**, edita `CLIENT_ORIGINS` con la URL exacta del
   frontend, sin barra final:
   `https://<tu-proyecto>.vercel.app` (o `https://renodo-web.onrender.com`).
2. Guarda los cambios: el servicio se redeploya solo.

## 6. Verificación final

- [ ] `GET /api/v1/health` responde `200` en la URL de producción.
- [ ] Swagger carga en `/api-docs`.
- [ ] El frontend carga el catálogo con datos reales de Atlas.
- [ ] Registro real + login funcionan; los tres accesos demo también.
- [ ] Una subida de avatar funciona (si configuraste Cloudinary).
- [ ] No hay errores CORS en la consola del navegador.

## 7. Actualizar el README con los enlaces reales

Sustituye los marcadores `TODO` de la sección **Enlaces** del `README.md`:

```md
- **Frontend:** https://<tu-frontend>
- **API:** https://<tu-api>/api/v1 · **Swagger:** https://<tu-api>/api-docs
```

Haz commit y push: el enunciado indica que los correctores accederán a los despliegues
únicamente desde el enlace de GitHub.

## Problemas habituales

| Síntoma | Causa probable | Solución |
|---|---|---|
| `NetworkError` / CORS en el navegador | `CLIENT_ORIGINS` no coincide exactamente | URL exacta, sin `/` final, redeploy de la API |
| El front habla con `localhost:4000` | `NEXT_PUBLIC_API_URL` ausente en el build | Definirla y recompilar (clear cache) |
| La API no arranca | Falta `MONGODB_URI` o `JWT_SECRET` | Revisar Environment en Render y los logs |
| `SEMILLA: SEED_USER_PASSWORD es obligatoria` | Sembrar producción sin contraseña | Definirla en `.env` local antes de `npm run seed` |
| Primera carga muy lenta | Spin-down del plan gratuito | Esperar ~60 s; es comportamiento esperado |
