import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import TrendChart from './TrendChart.jsx';

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Reusable histórico panel for any wide-table endpoint.
// endpoint: e.g. '/api/inyeccion/historico'  ·  responds { serie, variables }
export default function HistoricoPanel({ endpoint, punto, onClose }) {
  const [desde, setDesde] = useState(isoDaysAgo(7));
  const [hasta, setHasta] = useState(isoDaysAgo(0));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await client.get(endpoint, { params: { punto, desde, hasta } });
      setData(data);
      setError('');
    } catch {
      setError('No se pudo cargar el histórico.');
    }
  }, [endpoint, punto, desde, hasta]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mt-5 rounded-lg border border-line bg-panel-2 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="font-medium text-white">Histórico · Punto {punto}</h2>
        <label className="text-xs text-gray-400">
          Desde{' '}
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="ml-1 rounded border border-line bg-panel px-2 py-1 text-gray-200"
          />
        </label>
        <label className="text-xs text-gray-400">
          Hasta{' '}
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="ml-1 rounded border border-line bg-panel px-2 py-1 text-gray-200"
          />
        </label>
        <button onClick={onClose} className="ml-auto text-xs text-gray-500 hover:text-gray-300">
          Cerrar ✕
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : data ? (
        <TrendChart data={data.serie} variables={data.variables} />
      ) : (
        <p className="text-sm text-gray-500">Cargando…</p>
      )}
    </div>
  );
}
