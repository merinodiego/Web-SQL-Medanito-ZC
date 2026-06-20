// Tag dictionary and schema discovery for the "wide" SCADA tables.
//
// Columns in Horarios_Oil follow the pattern <PREFIX>_<POINTID>, e.g. FQI_02010.
// The prefix identifies the variable; the suffix identifies an oil measurement
// point at a battery outlet. The point id's first two digits are the battery
// number (02 = Batería 2, 03 = Batería 3). Each point carries the 6 variables
// below. Points are discovered dynamically from INFORMATION_SCHEMA so a new one
// appears with no code change.
const { sql, getPool } = require('./db');

// Known variables, in the order they should appear in the screener.
// decimals = how many decimals to display (SCADA values are floats).
const TAG_DEFS = {
  FQI: { label: 'Caudal', unit: 'm³/h', decimals: 1 },
  FQH: { label: 'Vol. Hoy', unit: 'm³', decimals: 1 },
  FQA: { label: 'Vol. Ayer', unit: 'm³', decimals: 1 },
  PI: { label: 'Presión', unit: 'kg/cm²', decimals: 1 },
  TI: { label: 'Temperatura', unit: '°C', decimals: 1 },
  DI: { label: 'Densidad', unit: 'gr/cm³', decimals: 4 },
};

// Battery number derived from a point id (first two digits): 02010 -> 2.
function batteryOf(pointId) {
  const n = parseInt(String(pointId).slice(0, 2), 10);
  return Number.isNaN(n) ? null : n;
}

// Point type derived from the id's last three digits (the suffix):
//   010 -> "Salida de Batería", 011 -> "Descarga de Camión".
const POINT_TYPES = {
  '010': 'Salida de Batería',
  '011': 'Descarga de Camión',
};
function pointType(pointId) {
  return POINT_TYPES[String(pointId).slice(-3)] || null;
}

const TABLE = process.env.PROD_TABLE || 'Horarios_Oil';
const SCHEMA = process.env.PROD_SCHEMA || 'dbo';
const COLUMN_RE = /^([A-Za-z]+)_([A-Za-z0-9]+)$/;

let cache = null; // discovered schema, cached after first read

// Parse a column name into { prefix, well } or null if it isn't a data column.
function parseColumn(name) {
  const m = COLUMN_RE.exec(name);
  if (!m) return null;
  return { prefix: m[1].toUpperCase(), well: m[2] };
}

// Read the column list once and build:
//  - wells:   sorted list of well ids
//  - tagsByWell: { well: [prefix, ...] }  (only known prefixes)
//  - unknownPrefixes: prefixes found in the table but not in TAG_DEFS (e.g. DI)
async function getSchema() {
  if (cache) return cache;
  const pool = await getPool();
  const result = await pool
    .request()
    .input('schema', sql.NVarChar, SCHEMA)
    .input('table', sql.NVarChar, TABLE)
    .query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
      ORDER BY ORDINAL_POSITION
    `);

  const wells = new Set();
  const tagsByWell = {};
  const unknownPrefixes = new Set();

  for (const { COLUMN_NAME } of result.recordset) {
    const parsed = parseColumn(COLUMN_NAME);
    if (!parsed) continue; // Id / Fecha / Hora and similar
    const { prefix, well } = parsed;
    if (!(prefix in TAG_DEFS)) {
      unknownPrefixes.add(prefix);
      continue;
    }
    wells.add(well);
    (tagsByWell[well] ||= []).push(prefix);
  }

  cache = {
    wells: [...wells].sort(),
    tagsByWell,
    unknownPrefixes: [...unknownPrefixes],
    variables: Object.entries(TAG_DEFS).map(([key, def]) => ({ key, ...def })),
  };
  if (cache.unknownPrefixes.length) {
    console.log('Prefijos sin definir en TAG_DEFS:', cache.unknownPrefixes.join(', '));
  }
  return cache;
}

// Bracket-quote a column name. Names come from the schema (trusted), never from
// user input, but we validate the shape anyway as defense in depth.
function col(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`Nombre de columna inválido: ${name}`);
  return `[${name}]`;
}

module.exports = { TAG_DEFS, TABLE, SCHEMA, getSchema, parseColumn, batteryOf, pointType, col };
