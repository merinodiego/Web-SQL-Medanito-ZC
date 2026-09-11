// Equipos — tabla de referencia ESTÁTICA de tanques y piletas.
// Los datos viven acá (no en la base). A futuro puede pasarse a backend/BD.
const GRUPOS = [
  {
    titulo: 'Batería 2',
    filas: [
      { tanque: 'A', tag: 'LI-02021', tipo: 'Tanque', h: 245, vol: 40, cte: 0.163 },
      { tanque: 'B', tag: 'LI-02022', tipo: 'Tanque', h: 370, vol: 80, cte: 0.216 },
      { tanque: 'C', tag: 'LI-02023', tipo: 'Tanque', h: 455, vol: 160, cte: 0.352, obs: 'Fuera Servicio' },
    ],
  },
  {
    titulo: 'Batería 3',
    filas: [
      { tanque: 'A', tag: 'LI-03021', tipo: 'Tanque', h: 450, vol: 60, cte: 0.134 },
      { tanque: 'B', tag: 'LI-03022', tipo: 'Tanque', h: 450, vol: 80, cte: 0.185 },
      { tanque: 'C', tag: 'LI-03023', tipo: 'Tanque', h: 350, vol: 115, cte: 0.331 },
    ],
  },
  {
    titulo: 'Batería 4',
    filas: [
      { tanque: 'A', tag: 'LI-04021', tipo: 'Tanque', h: 230, vol: 150, cte: 0.667 },
      { tanque: 'B', tag: 'LI-04022', tipo: 'Tanque', h: 240, vol: 85, cte: 0.363 },
      { tanque: 'C', tag: 'LI-04023', tipo: 'Tanque', h: 365, vol: 65, cte: 0.181 },
      { tanque: 'D', tag: 'LI-04024', tipo: 'Tanque', h: 450, vol: 150, cte: 0.340 },
    ],
  },
  {
    titulo: 'Batería 5',
    filas: [
      { tanque: 'A', tag: 'LI-05021', tipo: 'Tanque', h: 240, vol: 160, cte: 0.667 },
      { tanque: 'B', tag: 'LI-05022', tipo: 'Tanque', h: 240, vol: 80, cte: 0.333 },
      { tanque: 'C', tag: 'LI-05023', tipo: 'Tanque', h: 240, vol: 160, cte: 0.667 },
      { tanque: 'D', tag: 'LI-05024', tipo: 'Tanque', h: 240, vol: 160, cte: 0.667 },
    ],
  },
  {
    titulo: 'Piletas',
    filas: [
      { loc: 'Pozo-2064', tanque: 'TK-2064', tag: 'LI-2064', tipo: 'Tanque', h: 280, vol: 40, cte: 0.163 },
      { loc: 'Pozo-2493', tanque: 'TK-2493', tag: 'LI-2493', tipo: 'Pileta', h: 250, ancho: 239, largo: 1097, vol: 65.55, cte: 0.264 },
      { tipo: 'Pileta', h: 250, ancho: 234, largo: 1183, vol: 69.21, cte: 0.277 },
      { loc: 'Pozo-2479', tanque: 'TK-2479', tag: 'LI-2479', tipo: 'Pileta' },
      { loc: 'Pozo-2499', tanque: 'TK-2499', tag: 'LI-2499', tipo: 'Pileta', cte: 0.286 },
      { loc: 'BDT', tanque: 'A', tag: 'LI-31021', tipo: 'Tanque', vol: 40, cte: 0.667 },
      { loc: 'LS', tanque: 'A', tag: 'LI-37021', tipo: 'Pileta' },
    ],
  },
  {
    titulo: 'PTC',
    filas: [
      { tanque: 'TK-1200', tag: 'LI-20045', tipo: 'Tanque', vol: 1200, cte: 1.333 },
      { tanque: 'TK-80', tag: 'LI-20025', tipo: 'Tanque', vol: 80, cte: 0.340 },
    ],
  },
];

const COLS = [
  { key: 'loc', label: 'Locación' },
  { key: 'tanque', label: 'Tanque' },
  { key: 'tag', label: 'TAG' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'h', label: 'H', unit: 'cm', num: true },
  { key: 'dia', label: 'Diám.', unit: 'cm', num: true },
  { key: 'ancho', label: 'Ancho', unit: 'cm', num: true },
  { key: 'largo', label: 'Largo', unit: 'cm', num: true },
  { key: 'vol', label: 'Vol.', unit: 'm³', num: true },
  { key: 'cte', label: 'Constante', num: true },
  { key: 'obs', label: 'Observación' },
];

function cell(value) {
  return value === undefined || value === null ? '' : value;
}

export default function Equipos() {
  return (
    <div className="p-5">
      <h1 className="mb-1 text-lg font-semibold text-white">Equipos · Tanques y Piletas</h1>
      <p className="mb-4 text-xs text-gray-500">Información de referencia (estática)</p>

      <div className="overflow-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-panel-2 text-gray-400">
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-medium ${c.num ? 'text-right' : 'text-left'}`}>
                  {c.label}
                  {c.unit && <span className="ml-1 text-[10px] text-gray-600">{c.unit}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRUPOS.map((g) => (
              <GroupRows key={g.titulo} grupo={g} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRows({ grupo }) {
  return (
    <>
      <tr className="border-t-2 border-line bg-panel-2/50">
        <td colSpan={COLS.length} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          {grupo.titulo}
        </td>
      </tr>
      {grupo.filas.map((f, i) => (
        <tr key={i} className="border-t border-line/40 hover:bg-panel-2/40">
          {COLS.map((c) => {
            const v = cell(f[c.key]);
            const isObsFueraServicio = c.key === 'obs' && v;
            return (
              <td
                key={c.key}
                className={`px-3 py-1.5 ${c.num ? 'text-right tabular-nums text-gray-300' : 'text-gray-300'} ${
                  isObsFueraServicio ? 'text-amber-400' : ''
                } ${c.key === 'tag' ? 'text-gray-400' : ''}`}
              >
                {v}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
