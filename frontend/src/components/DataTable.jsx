import { formatValue } from '../utils/format';

// Generic point-snapshot table: rows = points, columns = variables.
// Heterogeneous points are fine — missing variables render as "—".
// columns: [{ key, label, unit, decimals }]
// rows:    [{ punto, values: { <key>: number } }]
export default function DataTable({ columns, rows, onRowClick, selected }) {
  return (
    <div className="overflow-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-panel-2 text-gray-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Punto</th>
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
            // Status dot only applies to points that measure flow (FQI).
            const flow = row.values.FQI;
            const hasFlow = flow !== undefined && flow !== null;
            const dot = !hasFlow ? 'bg-gray-600' : flow === 0 ? 'bg-red-500' : 'bg-emerald-500';
            return (
              <tr
                key={row.punto}
                onClick={() => onRowClick?.(row)}
                className={`cursor-pointer border-t border-line/60 hover:bg-panel-2/60 ${
                  selected === row.punto ? 'bg-amber-500/10' : ''
                }`}
              >
                <td className="px-3 py-1.5 font-medium text-gray-200">
                  <span className={`mr-2 inline-block h-2 w-2 rounded-full ${dot}`} />
                  {row.punto}
                </td>
                {columns.map((c) => {
                  const v = row.values[c.key];
                  const isFlow = c.key === 'FQI';
                  const color =
                    !isFlow || v === undefined || v === null
                      ? 'text-gray-300'
                      : v === 0
                      ? 'text-red-400'
                      : 'text-emerald-400';
                  return (
                    <td key={c.key} className={`px-3 py-1.5 text-right tabular-nums ${color}`}>
                      {formatValue(v, c.decimals)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
