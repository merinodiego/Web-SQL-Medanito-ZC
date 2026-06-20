# CLAUDE.md — Portal de Datos SCADA · Campo Petrolero

## ¿Qué es este proyecto?

Portal web interno (intranet) de **solo lectura** que consume una base de datos SQL Server
alimentada por un SCADA industrial de producción y gestión de campo petrolero.
El objetivo es que todos los empleados de la compañía puedan ver datos operativos
en tiempo real e históricos desde cualquier navegador de la red interna,
sin necesidad de acceso directo al SCADA ni a la base de datos.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Base de datos | SQL Server (fuente: SCADA industrial) |
| Backend API | Node.js + Express (o FastAPI si se indica) |
| Frontend | React + Vite |
| Visualización | Recharts (gráficos de series de tiempo) |
| Estilos | Tailwind CSS |
| Autenticación | JWT local o integración LDAP/Active Directory |
| Despliegue | Windows Server · IIS o PM2 · red interna |

---

## Reglas críticas de seguridad

- **SOLO LECTURA**: Todas las queries a SQL Server son exclusivamente SELECT.
  Nunca INSERT, UPDATE, DELETE, ni EXEC de stored procedures que modifiquen datos.
- El usuario de SQL Server configurado es `grafana_reader` con rol `db_datareader`.
  No cambiar este usuario ni sus permisos.
- Las credenciales de base de datos van SIEMPRE en variables de entorno (`.env`),
  nunca hardcodeadas en el código.
- El backend nunca expone el esquema completo de la base de datos a los clientes.
- No hay endpoints de escritura. Si alguien pide crear uno, rechazarlo y consultarme.

---

## Estructura del proyecto

```
/
├── CLAUDE.md                  ← este archivo
├── .env                       ← credenciales (no commitear)
├── .env.example               ← template de variables de entorno
├── backend/
│   ├── index.js               ← servidor Express principal
│   ├── db.js                  ← pool de conexión a SQL Server (mssql)
│   ├── routes/
│   │   ├── produccion.js      ← endpoints de producción de pozos
│   │   ├── inyeccion.js       ← endpoints de inyección
│   │   ├── equipos.js         ← endpoints de estado de equipos
│   │   └── gestion.js         ← endpoints de KPIs y gestión
│   └── middleware/
│       └── auth.js            ← validación JWT
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Produccion.jsx
│   │   │   ├── Inyeccion.jsx
│   │   │   ├── Equipos.jsx
│   │   │   └── Gestion.jsx
│   │   ├── components/
│   │   │   ├── DataTable.jsx  ← tabla genérica reutilizable
│   │   │   ├── TrendChart.jsx ← gráfico de series de tiempo
│   │   │   └── NavBar.jsx
│   │   └── api/
│   │       └── client.js      ← axios configurado con baseURL
│   └── vite.config.js
└── README.md
```

---

## Variables de entorno (.env)

```
# SQL Server
DB_SERVER=192.168.X.X
DB_PORT=1433
DB_NAME=NombreDeLaBDSCADA
DB_USER=grafana_reader
DB_PASSWORD=contraseña_segura

# Backend
PORT=4000
JWT_SECRET=clave_secreta_larga

# Frontend (Vite)
VITE_API_URL=http://192.168.X.X:4000
```

---

## Conexión a SQL Server

Usar el paquete `mssql`. El pool de conexión va en `backend/db.js`:

```js
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,           // true solo si tienen TLS configurado
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => { console.log('Conectado a SQL Server'); return pool; })
  .catch(err => console.error('Error de conexión:', err));

module.exports = { sql, poolPromise };
```

---

## Patrón de endpoints del backend

Cada ruta sigue este patrón — SELECT con parámetros de fecha para filtrado histórico:

```js
// GET /api/produccion/caudales?desde=2024-01-01&hasta=2024-01-31&pozo=POZO-01
router.get('/caudales', async (req, res) => {
  try {
    const { desde, hasta, pozo } = req.query;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('desde', sql.DateTime, desde)
      .input('hasta', sql.DateTime, hasta)
      .input('pozo', sql.NVarChar, pozo || '%')
      .query(`
        SELECT fecha_hora, nombre_pozo, caudal_bopd, presion_boca
        FROM produccion_pozos
        WHERE fecha_hora BETWEEN @desde AND @hasta
          AND nombre_pozo LIKE @pozo
        ORDER BY fecha_hora ASC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});
```

**IMPORTANTE**: Siempre usar `.input()` con parámetros tipados — nunca interpolación
de strings en las queries (previene SQL injection).

---

## Sub-páginas del portal

| Página | Ruta frontend | Endpoint backend | Descripción |
|--------|--------------|-----------------|-------------|
| Producción | `/produccion` | `/api/produccion` | Caudales y presiones por pozo |
| Inyección | `/inyeccion` | `/api/inyeccion` | Agua, gas y químicos por punto |
| Equipos | `/equipos` | `/api/equipos` | Estado operativo y alarmas |
| Gestión | `/gestion` | `/api/gestion` | KPIs y eficiencia de campo |

---

## Funcionalidades actuales (fase 1)

- [x] Tablas de datos con filtro por fecha y pozo/punto
- [x] Refresco automático configurable (cada N minutos)
- [x] Autenticación básica con JWT
- [ ] Exportación CSV/Excel — PENDIENTE (fase 2)
- [ ] Gráficos de tendencias históricas — PENDIENTE (fase 2)
- [ ] Integración LDAP/Active Directory — PENDIENTE (fase 3)

---

## Convenciones de código

- Idioma del código: inglés (variables, funciones, comentarios)
- Idioma de la UI: español
- Siempre manejar errores con try/catch en el backend
- Componentes React funcionales con hooks — no class components
- No usar `console.log` en producción — usar un logger o eliminarlos
- Todas las fechas se manejan en hora local del servidor (sin conversión UTC)
  a menos que se indique lo contrario

---

## Comandos útiles

```bash
# Instalar dependencias del backend
cd backend && npm install

# Instalar dependencias del frontend
cd frontend && npm install

# Correr backend en desarrollo
cd backend && npm run dev

# Correr frontend en desarrollo
cd frontend && npm run dev

# Build de producción del frontend
cd frontend && npm run build
```

---

## Lo que NO hacer

- No instalar dependencias innecesarias — mantener el proyecto liviano
- No crear endpoints que modifiquen la base de datos
- No exponer el puerto 1433 de SQL Server fuera de la red interna
- No hardcodear IPs ni credenciales en el código
- No usar ORM (Sequelize, Prisma) — las queries SQL directas son suficientes
  y más controlables para este caso de uso

---

## Contexto de negocio

- Industria: Oil & Gas · extracción de petróleo
- Entorno: campo petrolero · red interna corporativa
- Usuarios: operadores, supervisores, personal de gestión (no técnicos)
- La fuente de datos (SCADA) es un sistema crítico — no se toca bajo ningún concepto
- Los datos son confidenciales — el portal debe estar protegido con autenticación
