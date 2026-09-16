// Watchdog de comunicación. El SCADA escribe Fecha+Hora del servidor en DBInst
// en cada refresco (~1/min). Si esa marca de tiempo se atrasa más del umbral,
// significa que el SCADA/comunicación se cayó → OFFLINE. Como DBInst se vacía
// unos segundos por minuto, un poller de fondo cachea la última marca buena.
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { buildTimestamp } = require('../lib/wideTable');

const THRESHOLD_SEC = 120; // si la marca del SCADA no avanza en 2 min → OFFLINE
let cache = null; // { fecha, hora, valueKey, lastChangeMs }
let pollerOn = false;

// Watchdog por AVANCE de la marca (no por comparación de relojes): los relojes de
// SCADA, SQL y de la máquina Node difieren entre sí, así que cualquier "ahora"
// absoluto sesga el cálculo. Lo robusto es verificar que la marca Fecha+Hora que
// escribe el SCADA siga cambiando; si se congela > umbral, el SCADA está caído.
async function leer() {
  const pool = await getPool();
  const r = await pool.request().query('SELECT TOP 1 [Fecha], [Hora] FROM [dbo].[DBInst]');
  const row = r.recordset[0];
  if (!row) return; // hueco del refresco → mantenemos el caché
  const ts = buildTimestamp(row.Fecha, row.Hora); // 'YYYY-MM-DD HH:MM:SS'
  if (!ts) return;
  const [fecha, hora] = ts.split(' ');
  const now = Date.now();
  if (!cache || cache.valueKey !== ts) {
    // La marca avanzó (o primera lectura) → sistema vivo, reiniciamos el contador.
    cache = { fecha, hora, valueKey: ts, lastChangeMs: now };
  } else {
    // Misma marca (aún dentro del mismo minuto): no tocamos lastChangeMs.
    cache.fecha = fecha;
    cache.hora = hora;
  }
}

function startPoller() {
  if (pollerOn) return;
  pollerOn = true;
  const tick = () => leer().catch((e) => console.error('watchdog poller:', e.message));
  tick();
  setInterval(tick, 5000);
}

// GET /api/watchdog -> { online, fecha, hora, ts, ageSec }
router.get('/', async (_req, res) => {
  try {
    startPoller();
    if (!cache) {
      try {
        await leer();
      } catch {
        /* la BD puede estar en el hueco o caída; se refleja como OFFLINE */
      }
    }
    if (!cache) {
      return res.json({ online: false, fecha: null, hora: null, ts: null, ageSec: null });
    }
    // Segundos desde que la marca del SCADA cambió por última vez (solo deltas de
    // reloj propio, sin comparar contra relojes ajenos).
    const ageSec = Math.round((Date.now() - cache.lastChangeMs) / 1000);
    res.json({
      online: ageSec < THRESHOLD_SEC,
      fecha: cache.fecha,
      hora: cache.hora,
      ts: `${cache.fecha}T${cache.hora}`, // el front calcula el día de la semana
      ageSec,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error watchdog' });
  }
});

module.exports = router;
