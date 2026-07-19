// Producción endpoints — read-only queries over the wide Horarios_Oil table.
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');
const { TAG_DEFS, TABLE, SCHEMA, getSchema, batteryOf, pointType, col } = require('../tags');

const qTable = `[${SCHEMA}].[${TABLE}]`;

// Scope of the "últimas 24 h" view: only these batteries, and only points whose
// type is recognized (suffix 010 = Salida de Batería, 011 = Descarga de Camión).
const BATERIAS_24H = [2, 3, 4, 5];
const HORAS_24H = 24; // one row per hour is stored, so 24 rows = last 24 hours

// Combine the date + time columns into a single timestamp string. The mssql
// driver tags `date`/`time` values as UTC, so we read them with UTC getters to
// recover the exact stored wall-clock value (local getters would shift the date
// a day back in negative-offset timezones like AR/UTC-3).
function buildTimestamp(fecha, hora) {
  if (!fecha) return null;
  const d = new Date(fecha);
  const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  let time = '00:00:00';
  if (hora instanceof Date) {
    time = hora.toISOString().substr(11, 8); // time(7) comes back as a Date at epoch
  } else if (typeof hora === 'string') {
    time = hora.substr(0, 8);
  }
  return `${date} ${time}`;
}

// GET /api/produccion/puntos -> measurement points + their battery (+ unknown prefixes)
router.get('/puntos', async (_req, res) => {
  try {
    const schema = await getSchema();
    res.json({
      puntos: schema.wells.map((id) => ({ punto: id, bateria: batteryOf(id) })),
      baterias: [...new Set(schema.wells.map(batteryOf))].sort((a, b) => a - b),
      variables: schema.variables,
      sinDefinir: schema.unknownPrefixes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// GET /api/produccion/screener -> latest reading per well, pivoted to rows.
router.get('/screener', async (_req, res) => {
  try {
    const schema = await getSchema();
    const pool = await getPool();

    // Build the explicit column list (Fecha, Hora + every known data column).
    const dataCols = [];
    for (const well of schema.wells) {
      for (const prefix of schema.tagsByWell[well]) dataCols.push(`${prefix}_${well}`);
    }
    const selectCols = ['[Fecha]', '[Hora]', ...dataCols.map(col)].join(', ');

    const result = await pool.request().query(`
      SELECT TOP 1 ${selectCols}
      FROM ${qTable}
      ORDER BY [Fecha] DESC, [Hora] DESC
    `);

    const row = result.recordset[0];
    if (!row) return res.json({ timestamp: null, variables: schema.variables, rows: [] });

    const rows = schema.wells.map((well) => {
      const values = {};
      for (const prefix of schema.tagsByWell[well]) {
        const v = row[`${prefix}_${well}`];
        values[prefix] = v === undefined ? null : v;
      }
      return { punto: well, bateria: batteryOf(well), values };
    });

    res.json({
      timestamp: buildTimestamp(row.Fecha, row.Hora),
      variables: schema.variables,
      baterias: [...new Set(schema.wells.map(batteryOf))].sort((a, b) => a - b),
      rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// GET /api/produccion/ultimas24h
// Last 24 hourly rows, expanded to one row per (hour × point) for batteries
// 02-05 / known point types. Each row carries Fecha, Hora, Batería and Tipo.
router.get('/ultimas24h', async (_req, res) => {
  try {
    const schema = await getSchema();

    // Points in scope: battery 02-05 and a recognized type (010 / 011).
    const points = schema.wells.filter(
      (w) => BATERIAS_24H.includes(batteryOf(w)) && pointType(w) !== null
    );
    if (!points.length) {
      return res.json({ variables: schema.variables, baterias: BATERIAS_24H, rows: [] });
    }

    const dataCols = [];
    for (const p of points) {
      for (const prefix of schema.tagsByWell[p]) dataCols.push(`${prefix}_${p}`);
    }
    const selectCols = ['[Fecha]', '[Hora]', ...dataCols.map(col)].join(', ');

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP ${HORAS_24H} ${selectCols}
      FROM ${qTable}
      ORDER BY [Fecha] DESC, [Hora] DESC
    `);

    // Expand each hourly snapshot into one long row per point (newest first,
    // then by battery/point — schema.wells is already sorted ascending).
    const rows = [];
    for (const r of result.recordset) {
      const ts = buildTimestamp(r.Fecha, r.Hora) || ' ';
      const [fecha, hora] = ts.split(' ');
      for (const p of points) {
        const values = {};
        for (const prefix of schema.tagsByWell[p]) values[prefix] = r[`${prefix}_${p}`] ?? null;
        rows.push({ fecha, hora, bateria: batteryOf(p), punto: p, tipo: pointType(p), values });
      }
    }

    res.json({ variables: schema.variables, baterias: BATERIAS_24H, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

// GET /api/produccion/historico?punto=02010&desde=2020-08-24&hasta=2020-08-26
// Time series of all known variables for a single measurement point over a range.
router.get('/historico', async (req, res) => {
  try {
    const { punto, desde, hasta } = req.query;
    const schema = await getSchema();

    // Validate the point against the discovered set — this is what makes it safe
    // to interpolate the point id into column names below.
    if (!punto || !schema.wells.includes(punto)) {
      return res.status(400).json({ error: 'Punto inválido o no encontrado' });
    }

    const tags = schema.tagsByWell[punto];
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
