// SQL Server connection pool (read-only).
// The configured user must only have db_datareader — the app never writes.
//
// Connection is lazy and self-healing: the server boots even if SQL Server is
// momentarily unreachable, requests fail with a clean error while it's down,
// and the next request reconnects automatically once it's back. This matters on
// an intranet where the DB host may restart independently of the portal.
require('dotenv').config();
const sql = require('mssql');

const useInstance = Boolean(process.env.DB_INSTANCE);

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Fail fast when the DB host is unreachable, so requests return a clean error
  // instead of hanging (default is 15s).
  connectionTimeout: 8000,
  requestTimeout: 15000,
  options: {
    encrypt: false, // true only if TLS is configured on the server
    trustServerCertificate: true,
    // Named instance (e.g. SERVER\INSTANCIA) resolves the port via SQL Browser,
    // so we set instanceName instead of a fixed port.
    ...(useInstance ? { instanceName: process.env.DB_INSTANCE } : {}),
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// A fixed port and a named instance are mutually exclusive in mssql.
if (!useInstance) {
  config.port = parseInt(process.env.DB_PORT || '1433', 10);
}

let poolPromise = null;

// Returns a connected pool, (re)connecting on demand. On connection failure the
// cached promise is cleared so the next call retries instead of staying broken.
function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(config);
    // If the pool drops after connecting, clear the cache so we reconnect next time.
    pool.on('error', (err) => {
      console.error('Pool de SQL Server con error:', err.message);
      poolPromise = null;
    });
    poolPromise = pool
      .connect()
      .then((p) => {
        console.log(`Conectado a SQL Server (${process.env.DB_NAME})`);
        return p;
      })
      .catch((err) => {
        console.error('Error de conexión a SQL Server:', err.message);
        poolPromise = null; // allow the next request to retry
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
