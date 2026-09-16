// Instantáneos — valores en tiempo real desde dbo.DBInst (una sola fila que el
// SCADA refresca cada ~1 minuto por delete+insert; la tabla queda VACÍA varios
// segundos en cada ciclo). Columnas <TAG>_<IDPUNTO>, una por batería
// (02010=Bat 2, ...). Un poller de fondo lee cada 5 s y cachea la última lectura
// buena, así el endpoint nunca devuelve vacío durante el hueco del refresco.
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { createWideTable } = require('../lib/wideTable');

const TAGS = {
  FQI: { label: 'Caudal', unit: 'm³/h', decimals: 1 },
  FQH: { label: 'Vol. Hoy', unit: 'm³', decimals: 1 },
  FQA: { label: 'Vol. Ayer', unit: 'm³', decimals: 1 },
  PI: { label: 'Presión', unit: 'kg/cm²', decimals: 1 },
  TI: { label: 'Temperatura', unit: '°C', decimals: 1 },
  DI: { label: 'Densidad', unit: 'gr/cm³', decimals: 4 },
};

const wide = createWideTable({ table: 'DBInst', schema: 'dbo', tagDefs: TAGS });
const { getSchema, col, qTable } = wide;
const batteryOf = (id) => parseInt(String(id).slice(0, 2), 10);

let ultimoBueno = null; // { baterias, ts }
let refresherOn = false;

// Lee la fila actual de DBInst; si hay datos, actualiza el caché.
async function leerFila() {
  const schema = await getSchema();
  const pool = await getPool();

  const dataCols = [];
  for (const p of schema.points) {
    for (const prefix of schema.tagsByPoint[p]) dataCols.push(`${prefix}_${p}`);
  }
  const selectCols = dataCols.map(col).join(', ');

  const result = await pool.request().query(`SELECT TOP 1 ${selectCols} FROM ${qTable}`);
  const row = result.recordset[0];
  if (!row) return; // tabla en el hueco del refresco → mantenemos el caché

  const baterias = schema.points
    .map((p) => {
      const values = {};
      for (const prefix of schema.tagsByPoint[p]) values[prefix] = row[`${prefix}_${p}`] ?? null;
      return { bateria: batteryOf(p), values };
    })
    .sort((a, b) => a.bateria - b.bateria);
  ultimoBueno = { baterias, ts: new Date().toISOString() };
}

// Arranca el poller de fondo la primera vez que se usa la vista.
function startRefresher() {
  if (refresherOn) return;
  refresherOn = true;
  const tick = () => leerFila().catch((e) => console.error('instantaneos poller:', e.message));
  tick();
  setInterval(tick, 5000);
}

// GET /api/instantaneos -> valores actuales por batería (desde el caché)
router.get('/', async (_req, res) => {
  try {
    startRefresher();
    const schema = await getSchema();
    if (!ultimoBueno) await leerFila(); // primer request: intentar una lectura ya
    res.json({
      variables: schema.variables,
      baterias: ultimoBueno ? ultimoBueno.baterias : [],
      ts: ultimoBueno ? ultimoBueno.ts : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
