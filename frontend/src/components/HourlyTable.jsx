import { Fragment } from 'react';
import { formatValue } from '../utils/format';

// Dense "últimas 24 h" table: one row per (hour × point).
// columns: [{ key, label, unit, decimals }]
// rows:    [{ fecha, hora, bateria, punto, tipo, values: { <key>: number } }]
export default function HourlyTable({ columns, rows, onRowClick, selected }) {
  let prevTs = null;
  return (
    <div className="overflow-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-panel-2 text-gray-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Fecha</th>
            <th className="px-3 py-2 text-left font-medium">Hora</th>
            <th className="px-3 py-2 text-left font-medium">Batería</th>
            <th className="px-3 py-2 text-left font-medium">Punto</th>
            <th className="px-3 py-2 text-left font-medium">Tipo</th>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-right font-medium">
                {c.label}
                <span className="ml-1 text-[10px] text-gray-600">{c.unit}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const ts = `${row.fecha} ${row.hora}`;
            const newHour = ts !== prevTs;
            prevTs = ts;
            const caudal = row.values.FQI;
            const stopped = caudal === 0 || caudal === null || caudal === undefined;
            return (
              <Fragment key={`${ts}-${row.punto}`}>
                <tr
                  onClick={() => onRowClick?.(row)}
                  className={`cursor-pointer hover:bg-panel-2/60 ${
                    newHour ? 'border-t-2 border-line' : 'border-t border-line/30'
                  } ${selected === row.punto ? 'bg-amber-500/10' : ''}`}
                >
                  <td className="px-3 py-1.5 text-gray-500">{row.fecha}</td>
                  <td className="px-3 py-1.5 text-gray-300 tabular-nums">{row.hora}</td>
                  <td className="px-3 py-1.5 text-gray-400">Batería {row.bateria}</td>
                  <td className="px-3 py-1.5 font-medium text-gray-200">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${
                        stopped ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                    />
                    {row.punto}
                  </td>
                  <td className="px-3 py-1.5 text-gray-400">{row.tipo}</td>
                  {columns.map((c) => {
                    const v = row.values[c.key];
                    const isFlow = c.key === 'FQI';
                    const color = !isFlow
                      ? 'text-gray-300'
                      : stopped
                      ? 'text-red-400'
                      : 'text-emerald-400';
                    return (
                      <td key={c.key} className={`px-3 py-1.5 text-right tabular-nums ${color}`}>
                        {formatValue(v, c.decimals)}
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
