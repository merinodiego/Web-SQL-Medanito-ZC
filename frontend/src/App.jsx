import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import Login from './pages/Login.jsx';
import Produccion from './pages/Produccion.jsx';
import Instantaneos from './pages/Instantaneos.jsx';
import Inyeccion from './pages/Inyeccion.jsx';
import Equipos from './pages/Equipos.jsx';
import Placeholder from './pages/Placeholder.jsx';

export default function App() {
  const { pathname } = useLocation();
  const isLogin = pathname === '/login';

  return (
    <div className="flex min-h-full flex-col">
      {!isLogin && <NavBar />}
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/produccion" element={<Produccion />} />
          <Route path="/instantaneos" element={<Instantaneos />} />
          <Route path="/inyeccion" element={<Inyeccion />} />
          <Route path="/equipos" element={<Equipos />} />
          <Route
            path="/gestion"
            element={<Placeholder titulo="Gestión" detalle="KPIs y eficiencia de campo" />}
          />
          <Route path="*" element={<Navigate to="/produccion" replace />} />
        </Routes>
      </main>
    </div>
  );
}
