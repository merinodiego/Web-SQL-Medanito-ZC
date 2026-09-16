// Watchdog de comunicación. El SCADA escribe Fecha+Hora del servidor en DBInst
// en cada refresco (~1/min). Si esa marca de tiempo se atrasa más del umbral,
// significa que el SCADA/comunicación se cayó → OFFLINE. Como DBInst se vacía
// unos segundos por minuto, un poller de fondo cachea la última marca buena.
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { buildTimestamp } = require('../lib/wideTable');

const THRESHOLD_MS = 120000; // 2 min sin actualización → OFFLINE
let cache = null; // { fecha, hora, scadaMs }
let pollerOn = false;

async function leer() {
  const pool = await getPool();
  const r = await pool.request().query('SELECT TOP 1 [Fecha], [Hora] FROM [dbo].[DBInst]');
  const row = r.recordset[0];
  if (!row) return; // hueco del refresco → mantenemos el caché
  const ts = buildTimestamp(row.Fecha, row.Hora); // 'YYYY-MM-DD HH:MM:SS' (hora de pared)
  if (!ts) return;
  const [fecha, hora] = ts.split(' ');
  // La app corre en el mismo server que el SCADA → interpretamos la marca en la
  // hora local del server para compararla con Date.now().
  const scadaMs = new Date(`${fecha}T${hora}`).getTime();
  if (!Number.isNaN(scadaMs)) cache = { fecha, hora, scadaMs };
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
    const ageMs = Date.now() - cache.scadaMs;
    res.json({
      online: ageMs < THRESHOLD_MS,
      fecha: cache.fecha,
      hora: cache.hora,
      ts: `${cache.fecha}T${cache.hora}`, // el front calcula el día de la semana
      ageSec: Math.round(ageMs / 1000),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error watchdog' });
  }
});

module.exports = router;
