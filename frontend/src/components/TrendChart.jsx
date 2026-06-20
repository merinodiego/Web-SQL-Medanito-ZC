import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa'];

// Time-series chart for a single well's variables.
// data: [{ ts, FQI, PI, TI, ... }]   variables: [{ key, label, unit }]
export default function TrendChart({ data, variables }) {
  if (!data?.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-500">
        Sin datos en el rango seleccionado
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="#2a2f3a" strokeDasharray="3 3" />
        <XAxis dataKey="ts" tick={{ fill: '#6b7280', fontSize: 11 }} minTickGap={40} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1b1f27', border: '1px solid #2a2f3a', fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {variables.map((v, i) => (
          <Line
            key={v.key}
            type="monotone"
            dataKey={v.key}
            name={`${v.label} (${v.unit})`}
            stroke={COLORS[i % COLORS.length]}
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
