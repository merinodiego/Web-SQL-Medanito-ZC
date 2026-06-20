# Portal de Datos SCADA · Campo Petrolero

Portal web interno de **solo lectura** sobre la base SQL Server alimentada por el SCADA.
Fase 1 implementada: **Producción** (screener de pozos de petróleo + histórico).

## Cómo correrlo

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # luego editar .env con los datos reales
npm run dev               # http://localhost:4000
```

Editar `backend/.env`:
- `DB_SERVER`, `DB_INSTANCE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` → conexión a SQL Server.
- `PROD_TABLE=Horarios_Oil` → tabla de datos horarios de Producción.
- `AUTH_ENABLED=false` para probar sin login; `true` en producción.

Probar la API:
```
GET http://localhost:4000/api/health
GET http://localhost:4000/api/produccion/screener
GET http://localhost:4000/api/produccion/historico?punto=02010&desde=2020-08-24&hasta=2020-08-26
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

El dev server proxea `/api` al backend automáticamente.

## Cómo funciona Producción

La tabla `Horarios_Oil` es **"ancha"**: una columna por punto×variable, con el patrón
`<TAG>_<IDPUNTO>` (ej. `FQI_02010`). Cada **punto de medición** está a la salida de
una batería; los **2 primeros dígitos del ID son la batería** (`02` = Batería 2,
`03` = Batería 3). El backend:

1. **Descubre** los puntos leyendo los nombres de columna desde `INFORMATION_SCHEMA`
   (no hay nombres hardcodeados — un punto nuevo aparece solo).
2. **Pivotea** la última fila a un screener de filas = puntos, agrupables por batería.

Variables reconocidas (en `backend/tags.js`), 6 por punto:

| Prefijo | Variable | Unidad | Decimales |
|---|---|---|---|
| FQI | Caudal | m³/h | 1 |
| FQH | Vol. Acumulado Hoy | m³ | 1 |
| FQA | Vol. Acumulado Ayer | m³ | 1 |
| PI | Presión | kg/cm² | 1 |
| TI | Temperatura | °C | 1 |
| DI | Densidad | gr/cm³ | 4 |

## Roadmap (no implementado aún)
- Exportación CSV/Excel
- Páginas Inyección / Equipos / Gestión (hoy son placeholders)
- Integración LDAP/Active Directory (hoy: credencial compartida en `.env`)
