import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import HourlyTable from './HourlyTable.jsx';
import HistoricoPanel from './HistoricoPanel.jsx';

// Panel genérico para locaciones con "medidores" (RefiPampa, Oldelval, etc.):
// vista de 24 h por (hora × medidor) + histórico por medidor con filtro y export.
// endpointBase: ej. '/api/produccion/refipampa' -> /ultimas24h y /historico.
// filtroMedidor (opcional): muestra solo ese medidor y oculta la columna Medidor.
export default function MedidoresPanel({ titulo, endpointBase, filtroMedidor = null, metaLabel = 'Medidor' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await client.get(`${endpointBase}/ultimas24h`);
      setData(data);
      setError('');
    } catch {
      setError('No se pudo cargar. ¿Backend y base de datos disponibles?');
    }
  }, [endpointBase]);

  // Al cambiar de locación, limpiar selección previa.
  useEffect(() => {
    setSelected(null);
    load();
  }, [load]);

  // Al cambiar el filtro de medidor, limpiar la selección (histórico).
  useEffect(() => {
    setSelected(null);
  }, [filtroMedidor]);

  const rows = data
    ? filtroMedidor
      ? data.rows.filter((r) => r.medidor === filtroMedidor)
      : data.rows
    : [];
  const metaBefore = filtroMedidor ? [] : [{ label: metaLabel, get: (r) => r.medidor }];

  return (
    <div>
      {titulo && (
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-white">{titulo}</h2>
          <span className="text-xs text-gray-500">
            últimas 24 h{filtroMedidor ? '' : ` · ${data?.medidores?.length ?? ''} medidores`}
          </span>
        </div>
      )}

      {error && (
        <div className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && (
        <>
          <p className="mb-2 text-xs text-gray-500">
            {rows.length} filas · una por hora{filtroMedidor ? '' : ' y medidor'} · clic en una fila para ver el histórico
          </p>
          <HourlyTable
            columns={data.variables}
            rows={rows}
            selected={selected?.punto}
            onRowClick={setSelected}
            metaBefore={metaBefore}
          />
          {selected && (
            <HistoricoPanel
              endpoint={`${endpointBase}/historico`}
              params={{ punto: selected.punto }}
              titulo={`${titulo || ''} · ${selected.medidor} (${selected.punto})`}
              onClose={() => setSelected(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
