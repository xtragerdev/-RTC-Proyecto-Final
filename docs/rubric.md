# Correspondencia con la rúbrica

| Requisito | Evidencia |
|---|---|
| Variables en `style.css` | `apps/web/app/style.css`: colores, espaciado, radio, sombras y ancho máximo |
| CSS reutilizable | Shell, cabeceras, tarjetas, estados, formularios, tablas y breakpoints compartidos |
| Dos colecciones relacionadas aparte de usuarios | `Hub`, `Item` y `Reservation`; cuatro colecciones en total |
| Buena arquitectura React | App Router, componentes, contexto, hooks, cliente REST, tipos y datos demo separados |
| Buena UX/UI | Diseño responsive, navegación por teclado, foco visible, estados vacío/carga/éxito/error |
| Componentización | Header, footer, cards, buscador, directorios, paneles y primitivas reutilizables |
| BBDD a partir del Excel | 512 filas; Excel + cuatro CSV; semilla con `node:fs`, validación y upserts |
| Hooks avanzados | `useReducer`, `useDeferredValue`, `useTransition`, `useOptimistic`, custom hooks, Context |
| Usuarios y permisos | `member`, `manager`, `admin`; middleware Auth y alcance por centro |
| Cloudinary | Registro/perfil e imágenes de centros/objetos mediante `multipart/form-data` |
| CRUD completo | Usuarios, centros, objetos y reservas con protección según el rol |
| Calidad adicional | Swagger, transacciones, control de concurrencia, 24 pruebas de API, lint y build |

## Casos críticos cubiertos por pruebas

- El registro público no puede crear un administrador.
- Un miembro no puede cambiar roles ni borrar a otro usuario.
- Un responsable solo actúa sobre sus centros.
- Los favoritos no se duplican.
- Dos reservas concurrentes que se solapan producen una única ganadora.
- Dos reservas adyacentes sí son válidas.
- La duración no supera `maxLoanDays`.
- La semilla conserva todas las relaciones del dataset.
