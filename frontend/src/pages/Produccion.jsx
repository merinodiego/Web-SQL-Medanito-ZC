import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import HourlyTable from '../components/HourlyTable.jsx';
import TanquesTable from '../components/TanquesTable.jsx';
import HistoricoPanel from '../components/HistoricoPanel.jsx';
import ControlesPanel from '../components/ControlesPanel.jsx';
import MedidoresPanel from '../components/MedidoresPanel.jsx';

const REFRESH_OPTIONS = [
  { label: 'Manual', ms: 0 },
  { label: '5 min', ms: 300_000 },
  { label: '15 min', ms: 900_000 },
  { label: '30 min', ms: 1_800_000 },
];

// Locaciones "medidores" de Petróleo (no baterías): cada una tiene un segundo
// filtro (estilo "Tipo") para elegir el item. 'Todas' apila los medidores que
// comparten columnas (endpoint base); 'extra' son items con endpoint/columnas
// propias (no entran en 'Todas'). Los nombres de 'items' deben coincidir con los
// medidores definidos en el backend (routes/produccion.js).
const MEDIDORES_LOCS = {
  PTC: {
    label: 'Item',
    base: '/api/produccion/ptc',
    items: ['FW2', 'FW3'],
    extra: [{ nombre: 'Niveles PTC', endpointBase: '/api/produccion/ptc-niveles', metaLabel: 'Tanque' }],
  },
  'UAM RefiPampa': {
    label: 'Medidor',
    base: '/api/produccion/refipampa',
    items: ['Medidor 1', 'Masico PTC', 'Gas RP'],
    extra: [],
  },
  'UAM Oldelval': {
    label: 'Medidor',
    base: '/api/produccion/oldelval',
    items: ['Medidor 1', 'Medidor 2', 'Masico PTC'],
    extra: [],
  },
};
const LOCACIONES_EXTRA = Object.keys(MEDIDORES_LOCS); // botones de locación no-batería

export default function Produccion() {
  const [data, setData] = useState(null);
  const [tanques, setTanques] = useState(null);
  const [error, setError] = useState('');
  const [refreshMs, setRefreshMs] = useState(0);
  const [selected, setSelected] = useState(null);
  const [selTanque, setSelTanque] = useState(null); // batería seleccionada (vista tanques)
  const [bateria, setBateria] = useState(null); // null = todas
  const [tipo, setTipo] = useState(null); // null = todos
  const [medidor, setMedidor] = useState('Todas'); // item/medidor en locaciones de medidores
  const [vista, setVista] = useState('produccion'); // 'produccion' | 'tanques'

  const load = useCallback(async () => {
    try {
      const [prod, tks] = await Promise.all([
        client.get('/api/produccion/ultimas24h'),
        client.get('/api/produccion/tanques24h'),
      ]);
      setData(prod.data);
      setTanques(tks.data);
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

  const medCfg = MEDIDORES_LOCS[bateria] || null;
  const esMedidores = !!medCfg;
  // Item "extra" seleccionado (endpoint propio, p. ej. Niveles PTC), si aplica.
  const extraSel = medCfg?.extra.find((e) => e.nombre === medidor) || null;
  const tipos = data ? [...new Set(data.rows.map((r) => r.tipo))] : [];
  const rows = data
    ? data.rows.filter(
        (r) => (bateria === null || r.bateria === bateria) && (tipo === null || r.tipo === tipo)
      )
    : [];

  return (
    <div>
      {/* Franja superior fija: título, pestañas y filtros */}
      <div className="sticky top-14 z-20 border-b border-line bg-panel px-5 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-lg font-semibold text-white">
            Petróleo · Últimas 24 h (salida de baterías 02–05)
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
          <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Selector de vista */}
            <div className="mt-3 flex items-center gap-2 text-sm">
              <button
                onClick={() => setVista('produccion')}
                className={`rounded px-3 py-1.5 ${
                  vista === 'produccion' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Producción
              </button>
              <button
                onClick={() => setVista('tanques')}
                className={`rounded px-3 py-1.5 ${
                  vista === 'tanques' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Niveles de Tanque
              </button>
              <button
                onClick={() => setVista('controles')}
                className={`rounded px-3 py-1.5 ${
                  vista === 'controles' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Controles de Pozo
              </button>
            </div>

            {/* Filtros (Controles tiene los suyos propios) */}
            {vista !== 'controles' && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-500">Locación:</span>
                  <FilterButton active={bateria === null} onClick={() => setBateria(null)}>
                    Todas
                  </FilterButton>
                  {data.baterias.map((b) => (
                    <FilterButton
                      key={b}
                      active={bateria === b}
                      onClick={() => {
                        setBateria(b);
                        setTipo(null);
                        setMedidor('Todas');
                      }}
                    >
                      Batería {b}
                    </FilterButton>
                  ))}
                  {LOCACIONES_EXTRA.map((p) => (
                    <FilterButton
                      key={p}
                      active={bateria === p}
                      onClick={() => {
                        setBateria(p);
                        setTipo(null);
                        setMedidor('Todas');
                        setSelected(null);
                        setSelTanque(null);
                      }}
                    >
                      {p}
                    </FilterButton>
                  ))}
                </div>
                {vista === 'produccion' && !esMedidores && (
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
                )}
                {esMedidores && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-gray-500">{medCfg.label}:</span>
                    <FilterButton active={medidor === 'Todas'} onClick={() => setMedidor('Todas')}>
                      Todas
                    </FilterButton>
                    {[...medCfg.items, ...medCfg.extra.map((e) => e.nombre)].map((m) => (
                      <FilterButton key={m} active={medidor === m} onClick={() => setMedidor(m)}>
                        {m}
                      </FilterButton>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Contenido scrolleable */}
      <div className="px-5 pb-5 pt-3">
        {data && (
          <>
            {esMedidores &&
              vista !== 'controles' &&
              (extraSel ? (
                <MedidoresPanel
                  key={extraSel.endpointBase}
                  titulo={`${bateria} · ${extraSel.nombre}`}
                  endpointBase={extraSel.endpointBase}
                  metaLabel={extraSel.metaLabel}
                />
              ) : (
                <MedidoresPanel
                  key={medCfg.base}
                  titulo={medidor === 'Todas' ? bateria : `${bateria} · ${medidor}`}
                  endpointBase={medCfg.base}
                  filtroMedidor={medidor === 'Todas' ? null : medidor}
                />
              ))}

            {vista === 'produccion' && !esMedidores && (
              <>
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

            {vista === 'tanques' && !esMedidores && tanques && (
              <>
                <p className="mb-2 text-xs text-gray-500">
                  Nivel de cada tanque por batería · una fila por hora · en cm · clic en una fila para ver el histórico
                </p>
                <TanquesTable
                  columns={tanques.variables}
                  rows={tanques.rows.filter((r) => bateria === null || r.bateria === bateria)}
                  selected={selTanque?.bateria}
                  onRowClick={setSelTanque}
                />
              </>
            )}

            {vista === 'controles' && <ControlesPanel />}
          </>
        )}

        {vista === 'produccion' && selected && (
          <HistoricoPanel
            endpoint="/api/produccion/historico"
            params={{ punto: selected.punto }}
            titulo={`Histórico · Punto ${selected.punto}`}
            onClose={() => setSelected(null)}
          />
        )}

        {vista === 'tanques' && selTanque && (
          <HistoricoPanel
            endpoint="/api/produccion/tanques-historico"
            params={{ bateria: selTanque.bateria }}
            titulo={`Niveles de Tanque · Batería ${selTanque.bateria} (cm)`}
            onClose={() => setSelTanque(null)}
          />
        )}
      </div>
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
