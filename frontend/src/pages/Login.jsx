import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/api/auth/login', { usuario, password });
      localStorage.setItem('token', data.token);
      navigate('/produccion');
    } catch {
      setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={submit} className="w-80 rounded-lg border border-line bg-panel-2 p-6">
        <h1 className="mb-1 text-lg font-semibold text-white">Portal de Datos</h1>
        <p className="mb-5 text-xs text-gray-500">Acceso a consulta · red interna</p>

        <label className="mb-1 block text-xs text-gray-400">Usuario</label>
        <input
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="mb-3 w-full rounded border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-amber-500"
          autoFocus
        />

        <label className="mb-1 block text-xs text-gray-400">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-amber-500"
        />

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded bg-amber-500 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
