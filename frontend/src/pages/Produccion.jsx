import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import HourlyTable from '../components/HourlyTable.jsx';
import TrendChart from '../components/TrendChart.jsx';

const REFRESH_OPTIONS = [
  { label: 'Manual', ms: 0 },
  { label: '5 min', ms: 300_000 },
  { label: '15 min', ms: 900_000 },
  { label: '30 min', ms: 1_800_000 },
];

export default function Produccion() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshMs, setRefreshMs] = useState(0);
  const [selected, setSelected] = useState(null);
  const [bateria, setBateria] = useState(null); // null = todas
  const [tipo, setTipo] = useState(null); // null = todos

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/api/produccion/ultimas24h');
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
        <h1 className="text-lg font-semibold text-white">
          Producción · Últimas 24 h (salida de baterías 02–05)
        </h1>
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

      {selected && <Historico punto={selected.punto} onClose={() => setSelected(null)} />}
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

// --- Histórico panel (shown when a point is selected) ---
function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function Historico({ punto, onClose }) {
  const [desde, setDesde] = useState(isoDaysAgo(7));
  const [hasta, setHasta] = useState(isoDaysAgo(0));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/api/produccion/historico', {
        params: { punto, desde, hasta },
      });
      setData(data);
      setError('');
    } catch {
      setError('No se pudo cargar el histórico.');
    }
  }, [punto, desde, hasta]);

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
