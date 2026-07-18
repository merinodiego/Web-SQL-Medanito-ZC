// Main Express server for the SCADA data portal (read-only API).
const path = require('path');
const fs = require('fs');
// Load .env from this file's own folder (works regardless of the launch cwd).
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const { requireAuth, AUTH_ENABLED } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const produccionRoutes = require('./routes/produccion');
const inyeccionRoutes = require('./routes/inyeccion');

const app = express();
app.use(cors());
app.use(express.json());

// Health check (unprotected)
app.get('/api/health', (_req, res) => res.json({ ok: true, authEnabled: AUTH_ENABLED }));

// Auth
app.use('/api/auth', authRoutes);

// Data routes (protected when AUTH_ENABLED=true)
app.use('/api/produccion', requireAuth, produccionRoutes);
app.use('/api/inyeccion', requireAuth, inyeccionRoutes);

// --- Production: serve the built frontend from this same process ---
// After `cd frontend && npm run build`, the SPA lives in frontend/dist. Serving
// it here means one process, one origin, one URL for the whole portal (no CORS).
// In dev this folder doesn't exist and Vite serves the frontend instead.
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback: any non-API GET returns index.html so client-side routing works.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('Sirviendo frontend estático desde', distPath);
}

const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, () => {
  console.log(`Portal escuchando en http://localhost:${PORT} (auth: ${AUTH_ENABLED ? 'on' : 'off'})`);
});
