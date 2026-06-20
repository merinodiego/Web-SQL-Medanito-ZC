import axios from 'axios';

// baseURL is empty in dev (Vite proxies /api); set VITE_API_URL for production.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

// Attach the JWT (when present) to every request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, drop the token and bounce to login.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (location.pathname !== '/login') location.assign('/login');
    }
    return Promise.reject(err);
  }
);

export default client;
