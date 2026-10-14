import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const COLORS = [
  '#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#fb923c', '#f472b6',
  '#a3e635', '#38bdf8', '#c084fc', '#facc15', '#4ade80', '#e879f9', '#fca5a5', '#93c5fd',
];

// Gráfico de series temporales con checkbox por variable: cada una se puede
// mostrar u ocultar, y al ocultarla el eje Y se reescala a las visibles (útil
// cuando hay rangos muy dispares). variables: [{ key, label, unit }].
export default function TrendChart({ data, variables }) {
  const [hidden, setHidden] = useState(() => new Set());

  if (!data?.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-500">
        Sin datos en el rango seleccionado
      </div>
    );
  }

  const colorDe = (i) => COLORS[i % COLORS.length];
  const toggle = (key) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div>
      {/* Leyenda con checkboxes para elegir qué graficar */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {variables.map((v, i) => (
          <label key={v.key} className="flex cursor-pointer select-none items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={!hidden.has(v.key)}
              onChange={() => toggle(v.key)}
              className="h-3.5 w-3.5 cursor-pointer"
              style={{ accentColor: colorDe(i) }}
            />
            <span style={{ color: hidden.has(v.key) ? '#6b7280' : colorDe(i) }}>
              {v.label}
              {v.unit ? ` (${v.unit})` : ''}
            </span>
          </label>
        ))}
        {variables.length > 2 && (
          <span className="ml-2 text-[11px] text-gray-500">
            <button onClick={() => setHidden(new Set())} className="hover:text-gray-300">
              Todas
            </button>
            {' · '}
            <button
              onClick={() => setHidden(new Set(variables.map((v) => v.key)))}
              className="hover:text-gray-300"
            >
              Ninguna
            </button>
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#2a2f3a" strokeDasharray="3 3" />
          <XAxis dataKey="ts" tick={{ fill: '#6b7280', fontSize: 11 }} minTickGap={40} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#1b1f27', border: '1px solid #2a2f3a', fontSize: 12 }}
            labelStyle={{ color: '#9ca3af' }}
          />
          {variables.map((v, i) =>
            hidden.has(v.key) ? null : (
              <Line
                key={v.key}
                type="monotone"
                dataKey={v.key}
                name={`${v.label} (${v.unit})`}
                stroke={colorDe(i)}
                dot={false}
                strokeWidth={1.5}
                connectNulls
                isAnimationActive={false}
              />
            )
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
