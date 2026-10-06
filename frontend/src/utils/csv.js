// Exporta una serie a CSV estándar: separador ',' y decimal '.'. Incluye BOM
// UTF-8 para que acentos y unidades (°, ³) se vean bien al abrirlo.
// Descarga única por el método clásico (funciona en HTTP del server). Para elegir
// la carpeta en cada descarga, activar en el navegador "Preguntar dónde guardar
// cada archivo antes de descargarlo".
export function exportarSerieCSV({ nombre, variables, serie, campoFecha = 'ts' }) {
  const sep = ',';
  const head = ['Fecha y Hora', ...variables.map((c) => (c.unit ? `${c.label} [${c.unit}]` : c.label))];
  const lineas = serie.map((f) => {
    const vals = variables.map((c) => {
      const v = f[c.key];
      if (v === null || v === undefined || Number.isNaN(v)) return '';
      return Number(v).toFixed(c.decimals ?? 2); // decimal con punto
    });
    return [f[campoFecha] ?? '', ...vals].join(sep);
  });
  const csv = '﻿' + [head.join(sep), ...lineas].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Nombre de archivo seguro a partir de un título + rango de fechas.
export function nombreArchivoCSV(base, desde, hasta) {
  const limpio = String(base)
    .replace(/[^\w\dáéíóúüñ -]/gi, '')
    .replace(/\s+/g, '_')
    .slice(0, 60);
  return `${limpio}_${desde}_a_${hasta}.csv`;
}
