# Datos de ReNodo

Este directorio contiene la fuente reproducible de la base de datos inicial.

| Archivo | Contenido | Registros |
|---|---|---:|
| `ReNodo-dataset.xlsx` | Libro de trabajo con resumen, filtros, validaciones y controles | 512 |
| `csv/users.csv` | Perfiles sintéticos y centro preferido | 60 |
| `csv/hubs.csv` | Centros comunitarios | 12 |
| `csv/items.csv` | Objetos del inventario | 180 |
| `csv/reservations.csv` | Historial y solicitudes | 260 |
| `manifest.json` | Semilla, fecha de corte, conteos y SHA-256 | — |

## Garantías del dataset

- Datos completamente sintéticos; los correos usan el dominio reservado `.example`.
- Semilla determinista `260831` y fecha de corte `2026-08-31T12:00:00Z`.
- Códigos estables (`USR-*`, `HUB-*`, `ITM-*`, `RSV-*`) para resolver las relaciones.
- Cero claves foráneas huérfanas.
- Cero rangos de fecha inválidos.
- Cero préstamos por encima del máximo permitido por el objeto.
- Cero solapamientos entre reservas que bloquean disponibilidad.

La API ejecuta `fs.promises.readFile()` sobre estos CSV, los valida con Zod y resuelve los
códigos externos a referencias MongoDB antes de hacer los `upsert`.
