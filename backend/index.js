// Main Express server for the SCADA data portal (read-only API).
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { requireAuth, AUTH_ENABLED } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const produccionRoutes = require('./routes/produccion');

const app = express();
app.use(cors());
app.use(express.json());

// Health check (unprotected)
app.get('/api/health', (_req, res) => res.json({ ok: true, authEnabled: AUTH_ENABLED }));

// Auth
app.use('/api/auth', authRoutes);

// Data routes (protected when AUTH_ENABLED=true)
app.use('/api/produccion', requireAuth, produccionRoutes);

const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT} (auth: ${AUTH_ENABLED ? 'on' : 'off'})`);
});
