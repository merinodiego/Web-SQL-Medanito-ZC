import { formatValue } from '../utils/format';

// Tank-level table: one row per (hour × battery), columns = tanks A/B/C/D.
// columns: [{ key, label, unit, decimals }]
// rows:    [{ fecha, hora, bateria, values: { <key>: number } }]
export default function TanquesTable({ columns, rows }) {
  let prevTs = null;
  return (
    <div className="overflow-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-panel-2 text-gray-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Fecha</th>
            <th className="px-3 py-2 text-left font-medium">Hora</th>
            <th className="px-3 py-2 text-left font-medium">Batería</th>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-right font-medium">
                {c.label}
                {c.unit && <span className="ml-1 text-[10px] text-gray-600">{c.unit}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const ts = `${row.fecha} ${row.hora}`;
            const newHour = ts !== prevTs;
            prevTs = ts;
            return (
              <tr
                key={`${ts}-${row.bateria}`}
                className={newHour ? 'border-t-2 border-line' : 'border-t border-line/30'}
              >
                <td className="px-3 py-1.5 text-gray-500">{row.fecha}</td>
                <td className="px-3 py-1.5 text-gray-300 tabular-nums">{row.hora}</td>
                <td className="px-3 py-1.5 text-gray-400">Batería {row.bateria}</td>
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-1.5 text-right tabular-nums text-gray-300">
                    {formatValue(row.values[c.key], c.decimals)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
