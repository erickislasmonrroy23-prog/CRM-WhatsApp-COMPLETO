// backend/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await query(
      `SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    if (!user.activo) {
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`Login exitoso: ${user.email}`);

    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register (solo admin puede crear usuarios)
router.post('/register', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { nombre, email, password, rol = 'operador' } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }

    if (!['admin', 'operador'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol`,
      [nombre.trim(), email.toLowerCase().trim(), passwordHash, rol]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

// GET /api/auth/users (solo admin)
router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
