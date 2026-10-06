import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import HistoricoPanel from './HistoricoPanel.jsx';
import { formatValue } from '../utils/format';

// Panel especial de H2S (PTG, punto 21001) — datos por minuto en Inst_1_min.
// Arriba: tabla de los últimos 24 registros al minuto 0 de cada hora.
// Abajo (opcional): gráfico con TODOS los minutos + filtro de fechas + export CSV.
export default function H2sPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [verGrafico, setVerGrafico] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/api/gas/h2s24h');
      setData(data);
      setError('');
    } catch {
      setError('No se pudo cargar H2S.');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 300_000); // refresca cada 5 min
    return () => clearInterval(id);
  }, [load]);

  const vble = data?.variables?.[0];
  const rows = data?.rows ?? [];

  return (
    <div className="mt-6">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold text-white">H2S · PTG (21001)</h2>
        <span className="text-xs text-gray-500">últimos 24 valores a minuto 0 de cada hora</span>
        <button
          onClick={() => setVerGrafico((v) => !v)}
          className="ml-auto rounded border border-amber-600/50 bg-amber-600/15 px-2 py-1 text-xs font-medium text-amber-300 hover:bg-amber-600/25"
        >
          {verGrafico ? 'Ocultar gráfico' : '📈 Ver gráfico detallado (todos los minutos)'}
        </button>
      </div>

      {error && (
        <div className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && (
        <div className="overflow-auto rounded-lg border border-line" style={{ maxHeight: '40vh' }}>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-panel-2 text-gray-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">Hora</th>
                <th className="px-3 py-2 text-right font-medium">
                  H2S<span className="ml-1 text-[10px] text-gray-600">ppm</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-line/40 hover:bg-panel-2/40">
                  <td className="px-3 py-1.5 text-gray-500">{r.fecha}</td>
                  <td className="px-3 py-1.5 text-gray-300 tabular-nums">{r.hora}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-200">
                    {formatValue(r.values.H2S, vble?.decimals ?? 3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {verGrafico && (
        <HistoricoPanel
          endpoint="/api/gas/h2s-historico"
          params={{}}
          titulo="H2S · PTG (21001) · ppm"
          defaultDays={1}
          onClose={() => setVerGrafico(false)}
        />
      )}
    </div>
  );
}
