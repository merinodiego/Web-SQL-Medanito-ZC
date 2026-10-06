import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import HourlyTable from '../components/HourlyTable.jsx';
import HistoricoPanel from '../components/HistoricoPanel.jsx';

const REFRESH_OPTIONS = [
  { label: 'Manual', ms: 0 },
  { label: '5 min', ms: 300_000 },
  { label: '15 min', ms: 900_000 },
  { label: '30 min', ms: 1_800_000 },
];

export default function Gas() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshMs, setRefreshMs] = useState(0);
  const [selected, setSelected] = useState(null);
  const [bateria, setBateria] = useState(null); // null = todas
  const [tipo, setTipo] = useState(null); // null = todos

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/api/gas/ultimas24h');
      setData(data);
      setError('');
    } catch {
      setError('No se pudo cargar la vista de 24 h. ¿Backend y base de datos disponibles?');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!refreshMs) return;
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, load]);

  const tipos = data ? [...new Set(data.rows.map((r) => r.tipo))] : [];
  const rows = data
    ? data.rows.filter(
        (r) => (bateria === null || r.bateria === bateria) && (tipo === null || r.tipo === tipo)
      )
    : [];

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <h1 className="text-lg font-semibold text-white">Gas · Últimas 24 h (baterías 02–05)</h1>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="text-gray-500">Refresco:</span>
          {REFRESH_OPTIONS.map((o) => (
            <button
              key={o.ms}
              onClick={() => setRefreshMs(o.ms)}
              className={`rounded px-2 py-1 ${
                refreshMs === o.ms ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {o.label}
            </button>
          ))}
          <button
            onClick={load}
            className="rounded border border-line px-2 py-1 text-gray-300 hover:bg-panel-2"
          >
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Batería:</span>
              <FilterButton active={bateria === null} onClick={() => setBateria(null)}>
                Todas
              </FilterButton>
              {data.baterias.map((b) => (
                <FilterButton key={b} active={bateria === b} onClick={() => setBateria(b)}>
                  {b}
                </FilterButton>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Tipo:</span>
              <FilterButton active={tipo === null} onClick={() => setTipo(null)}>
                Todos
              </FilterButton>
              {tipos.map((t) => (
                <FilterButton key={t} active={tipo === t} onClick={() => setTipo(t)}>
                  {t}
                </FilterButton>
              ))}
            </div>
          </div>

          <p className="mb-2 text-xs text-gray-500">
            {rows.length} filas · una por hora y punto · clic en una fila para ver el histórico
          </p>
          <HourlyTable
            columns={data.variables}
            rows={rows}
            selected={selected?.punto}
            onRowClick={setSelected}
            metaBefore={[{ label: 'Batería', get: (r) => `Batería ${r.bateria}` }]}
            metaAfter={[{ label: 'Tipo', get: (r) => r.tipo }]}
          />
        </>
      )}

      {selected && (
        <HistoricoPanel
          endpoint="/api/gas/historico"
          params={{ punto: selected.punto }}
          titulo={`Histórico · Punto ${selected.punto}`}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2 py-1 ${
        active ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
