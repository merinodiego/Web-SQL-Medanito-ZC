// Inyección endpoints — read-only queries over the wide dbo.Inyeccion table.
//
// Only a fixed set of injection points is used. Each point has its own flow tags
// (FQI/FQH/FQA/FQINV_<punto>) plus a LINE pressure read from a shared PI sensor
// (several points share the same manifold pressure gauge).
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { col, buildTimestamp } = require('../lib/wideTable');

const SCHEMA = 'dbo';
const TABLE = 'Inyeccion';
const qTable = `[${SCHEMA}].[${TABLE}]`;

// Variables shown, in column order.
// FQINV = inventario / total acumulado en la vida del medidor (totalizador).
const TAGS = {
  FQI: { label: 'Caudal', unit: 'm³/h', decimals: 1 },
  FQH: { label: 'Vol. Hoy', unit: 'm³', decimals: 1 },
  FQA: { label: 'Vol. Ayer', unit: 'm³', decimals: 1 },
  FQINV: { label: 'Inventario', unit: 'm³', decimals: 0 },
  PI: { label: 'Presión', unit: 'kg/cm²', decimals: 1 },
};
const VARIABLES = Object.entries(TAGS).map(([key, d]) => ({ key, ...d }));

// Points to use, in this order (defines filter-button and row order).
const PUNTOS = ['2051', '2049', '2030', '2108', '2074', '2274'];
// Own flow tags each point carries.
const FLOW = ['FQI', 'FQH', 'FQA', 'FQINV'];
// Shared line-pressure column per point (several points share one PI sensor).
const PI_COL = {
  '2051': 'PI_47000',
  '2049': 'PI_47000',
  '2030': 'PI_47000',
  '2108': 'PI_48000',
  '2074': 'PI_05100',
  '2274': 'PI_05100',
};

const HORAS_24H = 24; // one row per hour is stored, so 24 rows ≈ last 24 hours

// Columns a point needs: its flow columns + its shared pressure column.
const colsDe = (punto) => [...FLOW.map((t) => `${t}_${punto}`), PI_COL[punto]];

// The unique set of columns across all points (shared PI columns dedupe).
function allDataCols() {
  const cols = new Set();
  for (const p of PUNTOS) for (const c of colsDe(p)) cols.add(c);
  return [...cols];
}

// Read a point's values out of a result row.
function valuesDe(row, punto) {
  const values = {};
  for (const t of FLOW) values[t] = row[`${t}_${punto}`] ?? null;
  values.PI = row[PI_COL[punto]] ?? null;
  return values;
}

// GET /api/inyeccion/puntos -> points used + variables
router.get('/puntos', (_req, res) => {
  res.json({ puntos: PUNTOS, variables: VARIABLES });
});

// GET /api/inyeccion/screener -> latest reading per point (flow + line pressure).
router.get('/screener', async (_req, res) => {
  try {
    const pool = await getPool();
    const selectCols = ['[Fecha]', '[Hora]', ...allDataCols().map(col)].join(', ');

    const result = await pool.request().query(`
      SELECT TOP 1 ${selectCols}
      FROM ${qTable}
      ORDER BY [Fecha] DESC, [Hora] DESC
    `);

    const row = result.recordset[0];
    if (!row) return res.json({ timestamp: null, variables: VARIABLES, puntos: PUNTOS, rows: [] });

    const rows = PUNTOS.map((p) => ({ punto: p, values: valuesDe(row, p) }));
    res.json({
      timestamp: buildTimestamp(row.Fecha, row.Hora),
      variables: VARIABLES,
      puntos: PUNTOS,
      rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// GET /api/inyeccion/ultimas24h
// Last 24 hourly rows, expanded to one row per (hour × point). Each row carries
// Fecha, Hora, Punto and the point's values (flow + shared line pressure).
router.get('/ultimas24h', async (_req, res) => {
  try {
    const pool = await getPool();
    const selectCols = ['[Fecha]', '[Hora]', ...allDataCols().map(col)].join(', ');

    const result = await pool.request().query(`
      SELECT TOP ${HORAS_24H} ${selectCols}
      FROM ${qTable}
      ORDER BY [Fecha] DESC, [Hora] DESC
    `);

    const rows = [];
    for (const r of result.recordset) {
      const ts = buildTimestamp(r.Fecha, r.Hora) || ' ';
      const [fecha, hora] = ts.split(' ');
      for (const p of PUNTOS) rows.push({ fecha, hora, punto: p, values: valuesDe(r, p) });
    }

    res.json({ variables: VARIABLES, puntos: PUNTOS, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// GET /api/inyeccion/historico?punto=2049&desde=2026-07-01&hasta=2026-07-18
router.get('/historico', async (req, res) => {
  try {
    const { punto, desde, hasta } = req.query;
    if (!punto || !PUNTOS.includes(punto)) {
      return res.status(400).json({ error: 'Punto inválido o no encontrado' });
    }

    const selectCols = ['[Fecha]', '[Hora]', ...colsDe(punto).map(col)].join(', ');
    const pool = await getPool();
    const result = await pool
      .request()
      .input('desde', sql.Date, desde)
      .input('hasta', sql.Date, hasta)
      .query(`
        SELECT ${selectCols}
        FROM ${qTable}
        WHERE [Fecha] BETWEEN @desde AND @hasta
        ORDER BY [Fecha] ASC, [Hora] ASC
      `);

    const serie = result.recordset.map((r) => ({
      ts: buildTimestamp(r.Fecha, r.Hora),
      ...valuesDe(r, punto),
    }));

    // The chart excludes FQINV (a large totalizer) so the other series stay legible.
    res.json({
      punto,
      variables: VARIABLES.filter((v) => v.key !== 'FQINV'),
      serie,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
