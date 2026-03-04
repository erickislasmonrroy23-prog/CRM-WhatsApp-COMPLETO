// backend/routes/whatsapp.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { initSession, getQR, disconnectSession, isSessionReady } from '../services/whatsappManager.js';
import { getStats } from '../engines/antiBlockEngine.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/whatsapp/sessions
router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, nombre, numero, session_id, estado, mensajes_hoy, mensajes_hora, ultima_actividad, created_at
       FROM whatsapp_sessions ORDER BY created_at DESC`
    );

    const sessions = result.rows.map((s) => ({
      ...s,
      en_memoria: isSessionReady(s.session_id),
      antiBlock: getStats(s.session_id),
    }));

    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/sessions - Crear nueva sesión
router.post('/sessions', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre de sesión requerido' });

    const sessionId = `session_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    await query(
      `INSERT INTO whatsapp_sessions (nombre, session_id) VALUES ($1, $2)`,
      [nombre.trim(), sessionId]
    );

    // Inicializar en background
    initSession(sessionId, nombre).catch((err) => {
      logger.error(`Error iniciando sesión ${sessionId}`, { error: err.message });
    });

    res.status(201).json({ sessionId, mensaje: 'Sesión creada, esperando QR...' });
  } catch (err) {
    next(err);
  }
});

// GET /api/whatsapp/sessions/:sessionId/qr
router.get('/sessions/:sessionId/qr', authenticate, async (req, res, next) => {
  try {
    const qr = getQR(req.params.sessionId);
    if (!qr) {
      return res.status(404).json({ error: 'QR no disponible. La sesión puede estar ya conectada o no inicializada.' });
    }
    res.json({ qr });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/whatsapp/sessions/:sessionId
router.delete('/sessions/:sessionId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    await disconnectSession(sessionId);
    await query(`DELETE FROM whatsapp_sessions WHERE session_id = $1`, [sessionId]);
    res.json({ mensaje: 'Sesión eliminada' });
  } catch (err) {
    next(err);
  }
});

// POST /api/whatsapp/sessions/:sessionId/reconnect
router.post('/sessions/:sessionId/reconnect', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await query(`SELECT nombre FROM whatsapp_sessions WHERE session_id = $1`, [sessionId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Sesión no encontrada' });

    await disconnectSession(sessionId);
    await initSession(sessionId, result.rows[0].nombre);

    res.json({ mensaje: 'Reconexión iniciada' });
  } catch (err) {
    next(err);
  }
});

export default router;
