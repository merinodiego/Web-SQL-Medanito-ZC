import { useEffect, useState } from 'react';
import client from '../api/client';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Indicador de comunicación: consulta la marca de tiempo que el SCADA escribe en
// DBInst. ONLINE si está fresca; OFFLINE si se atrasa o el backend no responde.
export default function Watchdog() {
  const [wd, setWd] = useState(null);
  const [reachable, setReachable] = useState(true);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const { data } = await client.get('/api/watchdog');
        if (!stop) {
          setWd(data);
          setReachable(true);
        }
      } catch {
        if (!stop) setReachable(false); // backend/servidor caído → OFFLINE
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  const online = reachable && !!wd?.online;

  let dia = '';
  let fecha = '—';
  let hora = '';
  if (wd?.fecha) {
    const d = new Date(`${wd.ts}`);
    if (!Number.isNaN(d.getTime())) dia = DIAS[d.getDay()];
    const [Y, M, D] = wd.fecha.split('-');
    fecha = `${D}/${M}/${Y}`;
    hora = wd.hora;
  }

  return (
    <div className="ml-auto flex items-center gap-3">
      <div className="text-right text-xs leading-tight">
        <div className="text-gray-300">
          {dia} {fecha}
        </div>
        <div className="tabular-nums text-gray-400">{hora}</div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full ${
            online
              ? 'bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.55)] animate-pulse'
              : 'bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.55)]'
          }`}
        />
        <span className={`text-sm font-semibold ${online ? 'text-emerald-400' : 'text-red-400'}`}>
          Server {online ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
    </div>
  );
}
