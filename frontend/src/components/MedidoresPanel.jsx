import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import HourlyTable from './HourlyTable.jsx';
import HistoricoPanel from './HistoricoPanel.jsx';

// Panel genérico para locaciones con "medidores" (RefiPampa, Oldelval, etc.):
// vista de 24 h por (hora × medidor) + histórico por medidor con filtro y export.
// endpointBase: ej. '/api/produccion/refipampa' -> /ultimas24h y /historico.
export default function MedidoresPanel({ titulo, endpointBase }) {
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

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold text-white">{titulo}</h2>
        <span className="text-xs text-gray-500">últimas 24 h · {data?.medidores?.length ?? ''} medidores</span>
      </div>

      {error && (
        <div className="mb-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {data && (
        <>
          <p className="mb-2 text-xs text-gray-500">
            {data.rows.length} filas · una por hora y medidor · clic en una fila para ver el histórico
          </p>
          <HourlyTable
            columns={data.variables}
            rows={data.rows}
            selected={selected?.punto}
            onRowClick={setSelected}
            metaBefore={[{ label: 'Medidor', get: (r) => r.medidor }]}
          />
          {selected && (
            <HistoricoPanel
              endpoint={`${endpointBase}/historico`}
              params={{ punto: selected.punto }}
              titulo={`${titulo} · ${selected.medidor} (${selected.punto})`}
              onClose={() => setSelected(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
