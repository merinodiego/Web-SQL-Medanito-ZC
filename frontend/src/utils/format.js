// Format a SCADA float for display. Values arrive as floats; the dashboard shows
// a fixed number of decimals (1 by default) using es-AR grouping.
export function formatValue(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatTimestamp(ts) {
  if (!ts) return '—';
  return ts.replace('T', ' ').substring(0, 19);
}
