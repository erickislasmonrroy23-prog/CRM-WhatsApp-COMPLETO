// backend/middleware/errorHandler.js
import logger from '../utils/logger.js';

/**
 * Middleware global de manejo de errores
 */
export const errorHandler = (err, req, res, next) => {
  logger.error('Error no controlado', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    body: req.body,
  });

  // Errores de validación de PostgreSQL
  if (err.code === '23505') {
    return res.status(409).json({ error: 'El recurso ya existe (duplicado)' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referencia a recurso inexistente' });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Middleware para rutas no encontradas
 */
export const notFound = (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.url}` });
};
