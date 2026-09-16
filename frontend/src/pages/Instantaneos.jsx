import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import { formatValue } from '../utils/format';

const REFRESH_MS = 15_000; // la vista es "en vivo": refresca cada 15 s

export default function Instantaneos() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/api/instantaneos');
      setData(data);
      setError('');
    } catch {
      setError('No se pudieron cargar los instantáneos. ¿Backend y base de datos disponibles?');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const actualizado = data?.ts ? new Date(data.ts).toLocaleTimeString('es-AR') : null;

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-white">Instantáneos · Tiempo real</h1>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          en vivo · refresca cada 15 s
        </span>
        {actualizado && (
          <span className="ml-auto text-xs text-gray-500">Última lectura: {actualizado}</span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && data.baterias.length === 0 && !error && (
        <p className="text-sm text-gray-500">Esperando datos del SCADA…</p>
      )}

      {data && data.baterias.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.baterias.map((b) => (
            <BateriaCard key={b.bateria} bateria={b.bateria} variables={data.variables} values={b.values} />
          ))}
        </div>
      )}
    </div>
  );
}

function BateriaCard({ bateria, variables, values }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-4">
      <h2 className="mb-3 text-base font-semibold text-amber-300">Batería {bateria}</h2>
      <table className="w-full text-sm">
        <tbody>
          {variables.map((v) => {
            const val = values[v.key];
            const isFlow = v.key === 'FQI';
            const color = isFlow ? (val ? 'text-emerald-400' : 'text-red-400') : 'text-gray-200';
            return (
              <tr key={v.key} className="border-t border-line/40 first:border-t-0">
                <td className="py-1.5 text-gray-400">{v.label}</td>
                <td className={`py-1.5 text-right tabular-nums font-medium ${color}`}>
                  {formatValue(val, v.decimals)}
                  <span className="ml-1 text-[10px] text-gray-500">{v.unit}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
