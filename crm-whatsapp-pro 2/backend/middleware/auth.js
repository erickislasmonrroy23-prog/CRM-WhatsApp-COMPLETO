// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Middleware de autenticación JWT
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows.length || !result.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    logger.error('Error en middleware de autenticación', { error: err.message });
    return res.status(401).json({ error: 'Token inválido' });
  }
};

/**
 * Middleware de autorización por rol
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Rol requerido: ${roles.join(' o ')}`,
      });
    }
    next();
  };
};
