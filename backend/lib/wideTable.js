// Reusable helper for the SCADA "wide" tables (one column per point×variable,
// pattern <PREFIX>_<POINTID>). Given a table name and a tag dictionary, it
// discovers the points dynamically from INFORMATION_SCHEMA and exposes helpers
// to build screener / histórico queries. Used by the Inyección routes; the
// Producción routes keep their own (battery-aware) copy.
const { sql, getPool } = require('../db');

const COLUMN_RE = /^([A-Za-z]+)_([A-Za-z0-9]+)$/;

// Parse a column name into { prefix, id } or null if it isn't a data column.
function parseColumn(name) {
  const m = COLUMN_RE.exec(name);
  if (!m) return null;
  return { prefix: m[1].toUpperCase(), id: m[2] };
}

// Bracket-quote a column name. Names come from the schema (trusted); the shape
// is validated anyway as defense in depth.
function col(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`Nombre de columna inválido: ${name}`);
  return `[${name}]`;
}

// Combine date + time columns into a timestamp string in server local time.
function buildTimestamp(fecha, hora) {
  if (!fecha) return null;
  const d = new Date(fecha);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let time = '00:00:00';
  if (hora instanceof Date) {
    time = hora.toISOString().substr(11, 8); // time(7) comes back as a Date at epoch
  } else if (typeof hora === 'string') {
    time = hora.substr(0, 8);
  }
  return `${date} ${time}`;
}

// Build a wide-table accessor bound to one table + tag dictionary.
// tagDefs: { PREFIX: { label, unit, decimals } } — order defines column order.
function createWideTable({ table, schema = 'dbo', tagDefs }) {
  let cache = null;

  async function getSchema() {
    if (cache) return cache;
    const pool = await getPool();
    const result = await pool
      .request()
      .input('schema', sql.NVarChar, schema)
      .input('table', sql.NVarChar, table)
      .query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
        ORDER BY ORDINAL_POSITION
      `);

    const points = new Set();
    const tagsByPoint = {};
    const unknownPrefixes = new Set();

    for (const { COLUMN_NAME } of result.recordset) {
      const parsed = parseColumn(COLUMN_NAME);
      if (!parsed) continue; // Id / Fecha / Hora
      const { prefix, id } = parsed;
      if (!(prefix in tagDefs)) {
        unknownPrefixes.add(prefix);
        continue;
      }
      points.add(id);
      (tagsByPoint[id] ||= []).push(prefix);
    }

    cache = {
      points: [...points].sort(),
      tagsByPoint,
      unknownPrefixes: [...unknownPrefixes],
      variables: Object.entries(tagDefs).map(([key, def]) => ({ key, ...def })),
    };
    if (cache.unknownPrefixes.length) {
      console.log(`[${table}] prefijos sin definir:`, cache.unknownPrefixes.join(', '));
    }
    return cache;
  }

  return { getSchema, col, buildTimestamp, table, schema, qTable: `[${schema}].[${table}]` };
}

module.exports = { createWideTable, parseColumn, col, buildTimestamp };
