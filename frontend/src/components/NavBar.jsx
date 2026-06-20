import { NavLink, useNavigate } from 'react-router-dom';

const links = [
  { to: '/produccion', label: 'Producción' },
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
    <header className="flex items-center gap-6 border-b border-line bg-panel-2 px-5 py-3">
      <span className="font-semibold tracking-wide text-white">
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
      {authEnabled && (
        <button onClick={logout} className="ml-auto text-xs text-gray-500 hover:text-gray-300">
          Salir
        </button>
      )}
    </header>
  );
}
