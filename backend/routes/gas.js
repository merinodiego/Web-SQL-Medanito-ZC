// Gas endpoints — read-only sobre la tabla ancha dbo.Horarios_Gas.
// Mismo criterio de tags que Petróleo (<PREFIX>_<IDPUNTO>) pero con 5 variables
// (sin densidad). Los puntos en uso se declaran EXPLÍCITAMENTE abajo (locación +
// etiqueta), porque hay locaciones con nombre (Mariposa, etc.) y etiquetas que no
// siguen una regla por ID. Se irán sumando más locaciones.
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

// Puntos de Gas en alcance. El ORDEN define el de visualización y filtros.
const PUNTOS = [
  { punto: '02001', locacion: 'Batería 2', etiqueta: 'Gas General' },
  { punto: '02002', locacion: 'Batería 2', etiqueta: 'Gas Consumo' },
  { punto: '03001', locacion: 'Batería 3', etiqueta: 'Gas General' },
  { punto: '03002', locacion: 'Batería 3', etiqueta: 'Gas Consumo' },
  { punto: '04001', locacion: 'Batería 4', etiqueta: 'Gas General' },
  { punto: '04003', locacion: 'Batería 4', etiqueta: 'Gas General' },
  { punto: '11001', locacion: 'Batería 5', etiqueta: 'Gas General' },
  { punto: '05002', locacion: 'Batería 5', etiqueta: 'Gas Consumo' },
  { punto: '10001', locacion: 'Mariposa', etiqueta: 'Compresor 205' },
  { punto: '10003', locacion: 'Mariposa', etiqueta: 'Compresor 208' },
  { punto: '24001', locacion: 'Esquinero y PL', etiqueta: 'Puesto Lara' },
  { punto: '25001', locacion: 'Esquinero y PL', etiqueta: 'Esquinero' },
  { punto: '26001', locacion: 'Busquin', etiqueta: 'Gas General' },
  { punto: '26002', locacion: 'Busquin', etiqueta: 'Gas Control' },
  // Colector Mariposa (28xxx): descartado por ahora (conflicto a resolver).
];

const wide = createWideTable({ table: 'Horarios_Gas', schema: 'dbo', tagDefs: TAGS_GAS });
const { getSchema, col, buildTimestamp, qTable } = wide;

const HORAS_24H = 24;

// Puntos declarados que realmente existen en la tabla, con sus tags disponibles.
async function puntosActivos() {
  const schema = await getSchema();
  return PUNTOS.filter((p) => schema.points.includes(p.punto)).map((p) => ({
    ...p,
    tags: schema.tagsByPoint[p.punto],
  }));
}

const locacionesDe = (activos) => [...new Set(activos.map((p) => p.locacion))];

// GET /api/gas/puntos
router.get('/puntos', async (_req, res) => {
  try {
    const schema = await getSchema();
    const activos = await puntosActivos();
    res.json({
      puntos: activos.map(({ punto, locacion, etiqueta }) => ({ punto, locacion, etiqueta })),
      locaciones: locacionesDe(activos),
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
    const activos = await puntosActivos();
    if (!activos.length) return res.json({ variables: schema.variables, locaciones: [], rows: [] });

    const dataCols = [];
    for (const p of activos) for (const prefix of p.tags) dataCols.push(`${prefix}_${p.punto}`);
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
      for (const p of activos) {
        const values = {};
        for (const prefix of p.tags) values[prefix] = r[`${prefix}_${p.punto}`] ?? null;
        rows.push({ fecha, hora, locacion: p.locacion, etiqueta: p.etiqueta, punto: p.punto, values });
      }
    }

    res.json({ variables: schema.variables, locaciones: locacionesDe(activos), rows });
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
    const def = PUNTOS.find((p) => p.punto === punto);
    if (!def || !schema.points.includes(punto)) {
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
      locacion: def.locacion,
      etiqueta: def.etiqueta,
      variables: schema.variables.filter((v) => tags.includes(v.key)),
      serie,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;
