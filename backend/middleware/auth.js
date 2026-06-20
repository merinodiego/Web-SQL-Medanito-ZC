// JWT validation middleware. Disabled when AUTH_ENABLED !== 'true' so the data
// slice can run during development without a login wall.
const jwt = require('jsonwebtoken');

const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

function requireAuth(req, res, next) {
  if (!AUTH_ENABLED) return next();

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { requireAuth, AUTH_ENABLED };
