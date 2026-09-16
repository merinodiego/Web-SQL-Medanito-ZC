import { NavLink, useNavigate } from 'react-router-dom';
import Watchdog from './Watchdog.jsx';

const links = [
  { to: '/produccion', label: 'Producción' },
  { to: '/instantaneos', label: 'Instantáneos' },
  { to: '/inyeccion', label: 'Inyección' },
  { to: '/equipos', label: 'Equipos' },
  { to: '/gestion', label: 'Gestión' },
];

export default function NavBar() {
  const navigate = useNavigate();
  const authEnabled = localStorage.getItem('token');

  function logout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <header className="flex items-center gap-5 border-b border-line bg-panel-2 px-5 py-3">
      {/* Logo Ribeiro. El JPG viene con fondo casi negro; mix-blend lighten lo
          funde con la barra oscura y deja ver solo el logo. */}
      <img
        src="/logo-ribeiro.jpg"
        alt="Ribeiro"
        className="h-7 w-auto shrink-0 [mix-blend-mode:lighten]"
      />
      <span className="border-l border-line pl-5 font-semibold tracking-wide text-white">
        Portal de Datos <span className="text-amber-400">· Campo</span>
      </span>
      <nav className="flex gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `rounded px-3 py-1.5 text-sm transition ${
                isActive ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-gray-200'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <Watchdog />
      {authEnabled && (
        <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300">
          Salir
        </button>
      )}
    </header>
  );
}
