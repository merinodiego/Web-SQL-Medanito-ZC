// Conversión entre coordenadas DMS (grados/minutos/segundos, formato Google Earth
// p. ej. 38°0'5.22"S) y decimal. Sur y Oeste son negativos.

// Parsea un string DMS a grados decimales. Devuelve null si no matchea.
// Acepta separadores variados: 38°0'5.22"S · 38 0 5.22 S · -38.00145 (ya decimal).
export function parseDMS(str) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim();
  if (s === '') return null;
  // ¿ya es decimal?
  if (/^[+-]?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const m = s.match(/(\d+(?:\.\d+)?)[°\s]+(\d+(?:\.\d+)?)['’\s]+(\d+(?:\.\d+)?)["”\s]*([NSEWnsew])?/);
  if (!m) return null;
  const [, g, min, seg, hemi] = m;
  let dec = parseFloat(g) + parseFloat(min) / 60 + parseFloat(seg) / 3600;
  if (hemi && /[SWsw]/.test(hemi)) dec = -dec;
  return dec;
}

// Formatea grados decimales a DMS. isLat elige hemisferio N/S (true) o E/O (false).
export function toDMS(dec, isLat) {
  if (dec === null || dec === undefined || Number.isNaN(dec)) return '';
  const hemi = isLat ? (dec < 0 ? 'S' : 'N') : dec < 0 ? 'W' : 'E';
  const abs = Math.abs(dec);
  const g = Math.floor(abs);
  const minFloat = (abs - g) * 60;
  const min = Math.floor(minFloat);
  const seg = (minFloat - min) * 60;
  return `${g}°${min}'${seg.toFixed(2)}"${hemi}`;
}
