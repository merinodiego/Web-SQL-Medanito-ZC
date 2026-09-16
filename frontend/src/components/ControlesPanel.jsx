import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import { formatValue } from '../utils/format';

function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function primerDiaDelMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const COLS = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'hora', label: 'Hora' },
  { key: 'pozo', label: 'Pozo' },
  { key: 'bateria', label: 'Batería' },
  { key: 'oilAcum', label: 'Oil Acum', unit: 'm³', num: true, dec: 2 },
  { key: 'oilProy', label: 'Oil Proy', unit: 'm³', num: true, dec: 2 },
  // Tiempo_Control viene en minutos → se muestra en horas.
  { key: 'tiempo', label: 'Tiempo', unit: 'h', num: true, dec: 1, transform: (v) => (v == null ? v : v / 60) },
  { key: 'gasAcum', label: 'Gas Acum', unit: 'Skm³', num: true, dec: 2 },
  { key: 'gasProy', label: 'Gas Proy', unit: 'Skm³', num: true, dec: 2 },
];

// Consulta de la tabla Controles: rango de fechas + búsqueda "contiene" en Pozo.
// Por defecto muestra el mes en curso.
export default function ControlesPanel() {
  const [desde, setDesde] = useState(primerDiaDelMes());
  const [hasta, setHasta] = useState(isoLocal(new Date()));
  const [pozo, setPozo] = useState('');
  const [bateria, setBateria] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ov permite pasar overrides (ej. el desplegable aplica su valor al instante,
  // sin esperar el re-render del estado).
  const buscar = useCallback(async (ov = {}) => {
    setLoading(true);
    try {
      const { data } = await client.get('/api/produccion/controles', {
        params: { desde, hasta, pozo, bateria, ...ov },
      });
      setData(data);
      setError('');
    } catch {
      setError('No se pudieron cargar los controles. ¿Backend y base de datos disponibles?');
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, pozo, bateria]);

  // Carga inicial (mes en curso). Luego se refresca con "Buscar".
  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data?.rows ?? [];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-400">
          Desde
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="ml-1 block rounded border border-line bg-panel px-2 py-1 text-sm text-gray-200"
          />
        </label>
        <label className="text-xs text-gray-400">
          Hasta
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="ml-1 block rounded border border-line bg-panel px-2 py-1 text-sm text-gray-200"
          />
        </label>
        <label className="text-xs text-gray-400">
          Pozo (contiene)
          <input
            value={pozo}
            onChange={(e) => setPozo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            placeholder="Ej: EM-2"
            className="ml-1 block w-40 rounded border border-line bg-panel px-2 py-1 text-sm text-gray-200 outline-none focus:border-amber-500"
          />
        </label>
        <label className="text-xs text-gray-400">
          Batería
          <select
            value={bateria}
            onChange={(e) => {
              setBateria(e.target.value);
              buscar({ bateria: e.target.value });
            }}
            className="ml-1 block rounded border border-line bg-panel px-2 py-1 text-sm text-gray-200 outline-none focus:border-amber-500"
          >
            <option value="">Todas</option>
            {(data?.baterias ?? []).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => buscar()}
          disabled={loading}
          className="rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <p className="mb-2 text-xs text-gray-500">
        {rows.length} registro(s)
        {data?.capado && ' · resultado limitado (acotá el rango o el pozo)'}
      </p>

      <div className="overflow-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-panel-2 text-gray-400">
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-medium ${c.num ? 'text-right' : 'text-left'}`}>
                  {c.label}
                  {c.unit && <span className="ml-1 text-[10px] text-gray-600">{c.unit}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line/40 hover:bg-panel-2/40">
                {COLS.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-1.5 ${
                      c.num ? 'text-right tabular-nums text-gray-300' : 'text-gray-300'
                    } ${c.key === 'pozo' ? 'font-medium text-gray-100' : ''}`}
                  >
                    {c.num
                      ? formatValue(c.transform ? c.transform(r[c.key]) : r[c.key], c.dec)
                      : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={COLS.length} className="px-3 py-6 text-center text-sm text-gray-500">
                  Sin registros para el filtro seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
