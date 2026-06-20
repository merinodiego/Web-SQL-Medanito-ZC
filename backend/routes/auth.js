// Login endpoint. Phase-1 placeholder: a single shared credential from .env.
// Replace with LDAP/Active Directory in phase 3 (see CLAUDE.md roadmap).
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST /api/auth/login  { usuario, password } -> { token }
router.post('/login', (req, res) => {
  const { usuario, password } = req.body || {};
  const okUser = process.env.PORTAL_USER;
  const okPass = process.env.PORTAL_PASSWORD;

  if (usuario === okUser && password === okPass) {
    const token = jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, usuario });
  }
  res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
});

module.exports = router;
