// Gas endpoints — read-only sobre la tabla ancha dbo.Horarios_Gas.
// Mismo criterio de tags que Petróleo (<PREFIX>_<IDPUNTO>), pero con 5 variables
// (sin densidad). Por ahora solo las baterías 2-5; luego se suman más locaciones.
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { createWideTable } = require('../lib/wideTable');

const TAGS_GAS = {
  FQI: { label: 'Caudal', unit: 'SKm³/d', decimals: 1 },
  FQH: { label: 'Acum. Hoy', unit: 'Skm³', decimals: 3 },
  FQA: { label: 'Acum. Ayer', unit: 'Skm³', decimals: 3 },
  PI: { label: 'Presión', unit: 'kg/cm²', decimals: 1 },
  TI: { label: 'Temperatura', unit: '°C', decimals: 1 },
};

const wide = createWideTable({ table: 'Horarios_Gas', schema: 'dbo', tagDefs: TAGS_GAS });
const { getSchema, col, buildTimestamp, qTable } = wide;

const BATERIAS_GAS = [2, 3, 4, 5]; // por ahora solo estas
const HORAS_24H = 24;
const batteryOf = (id) => parseInt(String(id).slice(0, 2), 10);

// Tipo según los 2 últimos dígitos del ID: 01/03 = Gas General, 02 = Gas Control.
// (Bat 4 es la excepción con dos medidores generales: 01 y 03.)
function gasTipo(id) {
  const suf = String(id).slice(-2);
  if (suf === '01' || suf === '03') return 'Gas General';
  if (suf === '02') return 'Gas Control';
  return null; // otras locaciones (se sumarán más adelante)
}

// Puntos en alcance: baterías 2-5 y tipo reconocido.
const puntosEnScope = (schema) =>
  schema.points.filter((p) => BATERIAS_GAS.includes(batteryOf(p)) && gasTipo(p) !== null);

const bateriasDe = (puntos) => [...new Set(puntos.map(batteryOf))].sort((a, b) => a - b);

// GET /api/gas/puntos
router.get('/puntos', async (_req, res) => {
  try {
    const schema = await getSchema();
    const puntos = puntosEnScope(schema);
    res.json({
      puntos: puntos.map((id) => ({ punto: id, bateria: batteryOf(id), tipo: gasTipo(id) })),
      baterias: bateriasDe(puntos),
      variables: schema.variables,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// GET /api/gas/ultimas24h -> una fila por (hora × punto), últimas 24 h.
router.get('/ultimas24h', async (_req, res) => {
  try {
    const schema = await getSchema();
    const points = puntosEnScope(schema);
    if (!points.length) return res.json({ variables: schema.variables, baterias: BATERIAS_GAS, rows: [] });

    const dataCols = [];
    for (const p of points) for (const prefix of schema.tagsByPoint[p]) dataCols.push(`${prefix}_${p}`);
    const selectCols = ['[Fecha]', '[Hora]', ...dataCols.map(col)].join(', ');

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP ${HORAS_24H} ${selectCols}
      FROM ${qTable}
      ORDER BY [Fecha] DESC, [Hora] DESC
    `);

    const rows = [];
    for (const r of result.recordset) {
      const ts = buildTimestamp(r.Fecha, r.Hora) || ' ';
      const [fecha, hora] = ts.split(' ');
      for (const p of points) {
        const values = {};
        for (const prefix of schema.tagsByPoint[p]) values[prefix] = r[`${prefix}_${p}`] ?? null;
        rows.push({ fecha, hora, bateria: batteryOf(p), punto: p, tipo: gasTipo(p), values });
      }
    }

    res.json({ variables: schema.variables, baterias: bateriasDe(points), rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// GET /api/gas/historico?punto=02001&desde=...&hasta=...
router.get('/historico', async (req, res) => {
  try {
    const { punto, desde, hasta } = req.query;
    const schema = await getSchema();
    if (!punto || !schema.points.includes(punto)) {
      return res.status(400).json({ error: 'Punto inválido o no encontrado' });
    }

    const tags = schema.tagsByPoint[punto];
    const dataCols = tags.map((prefix) => col(`${prefix}_${punto}`));
    const selectCols = ['[Fecha]', '[Hora]', ...dataCols].join(', ');

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

    const serie = result.recordset.map((r) => {
      const point = { ts: buildTimestamp(r.Fecha, r.Hora) };
      for (const prefix of tags) point[prefix] = r[`${prefix}_${punto}`] ?? null;
      return point;
    });

    res.json({
      punto,
      bateria: batteryOf(punto),
      variables: schema.variables.filter((v) => tags.includes(v.key)),
      serie,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
