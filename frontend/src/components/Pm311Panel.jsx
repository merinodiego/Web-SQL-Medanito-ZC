import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import HistoricoPanel from './HistoricoPanel.jsx';
import { formatValue } from '../utils/format';

// Tabla de 24 h (una fila por hora) para un grupo de variables.
function Tabla24({ variables, rows }) {
  return (
    <div className="overflow-auto rounded-lg border border-line" style={{ maxHeight: '40vh' }}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-panel-2 text-gray-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Fecha</th>
            <th className="px-3 py-2 text-left font-medium">Hora</th>
            {variables.map((v) => (
              <th key={v.key} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                {v.label}
                {v.unit && <span className="ml-1 text-[10px] text-gray-600">{v.unit}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line/40 hover:bg-panel-2/40">
              <td className="px-3 py-1.5 text-gray-500">{r.fecha}</td>
              <td className="px-3 py-1.5 tabular-nums text-gray-300">{r.hora}</td>
              {variables.map((v) => (
                <td key={v.key} className="px-3 py-1.5 text-right tabular-nums text-gray-200">
                  {formatValue(r.values[v.key], v.decimals)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Un grupo (Proceso / Cromatografía): tabla + gráfico desplegable con export.
function Grupo({ titulo, variables, rows, grupo }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-3">
        <h3 className="text-sm font-semibold text-amber-300">{titulo}</h3>
        <button
          onClick={() => setVer((v) => !v)}
          className="ml-auto rounded border border-amber-600/50 bg-amber-600/15 px-2 py-1 text-xs font-medium text-amber-300 hover:bg-amber-600/25"
        >
          {ver ? 'Ocultar gráfico' : `📈 Histórico ${titulo}`}
        </button>
      </div>
      <Tabla24 variables={variables} rows={rows} />
      {ver && (
        <HistoricoPanel
          endpoint="/api/gas/pm311-historico"
          params={{ grupo }}
          titulo={`PM-311 · ${titulo}`}
          onClose={() => setVer(false)}
        />
      )}
    </div>
  );
}

// Panel de la locación PM-311 (tabla DB311): Proceso + Cromatografía.
export default function Pm311Panel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/api/gas/pm311-24h');
      setData(data);
      setError('');
    } catch {
      setError('No se pudo cargar PM-311. ¿Backend y base de datos disponibles?');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 300_000); // refresca cada 5 min
    return () => clearInterval(id);
  }, [load]);

  return (
    <div>
      <div className="mb-1 flex items-center gap-3">
        <h2 className="text-base font-semibold text-white">PM-311</h2>
        <span className="text-xs text-gray-500">últimas 24 h · datos horarios</span>
      </div>

      {error && (
        <div className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && (
        <>
          <Grupo titulo="Proceso" grupo="proceso" variables={data.variables.proceso} rows={data.rows} />
          <Grupo titulo="Cromatografía" grupo="croma" variables={data.variables.croma} rows={data.rows} />
        </>
      )}
    </div>
  );
}
