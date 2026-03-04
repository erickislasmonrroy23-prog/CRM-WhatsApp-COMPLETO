// backend/routes/campaigns.js
import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { ejecutarCampaña, cancelarCampaña } from '../engines/campaignEngine.js';

const router = express.Router();

// GET /api/campaigns
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, ws.nombre as session_nombre, ws.numero as session_numero,
              u.nombre as creador
       FROM campaigns c
       LEFT JOIN whatsapp_sessions ws ON ws.session_id = c.session_id
       LEFT JOIN usuarios u ON u.id = c.usuario_id
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, ws.nombre as session_nombre FROM campaigns c
       LEFT JOIN whatsapp_sessions ws ON ws.session_id = c.session_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Campaña no encontrada' });

    // Obtener logs de la campaña
    const logs = await query(
      `SELECT ml.*, ct.nombre as contact_nombre, ct.telefono
       FROM message_logs ml
       LEFT JOIN contacts ct ON ct.id = ml.contact_id
       WHERE ml.campaign_id = $1
       ORDER BY ml.created_at DESC LIMIT 100`,
      [req.params.id]
    );

    res.json({ ...result.rows[0], logs: logs.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns - Crear campaña con adjunto opcional
router.post('/', authenticate, upload.single('adjunto'), async (req, res, next) => {
  try {
    const { nombre, mensaje, session_id, programada_para, contact_ids } = req.body;

    if (!nombre || !mensaje || !session_id) {
      return res.status(400).json({ error: 'Nombre, mensaje y sesión son requeridos' });
    }

    const adjunto_path = req.file ? req.file.path : null;
    const adjunto_tipo = req.file ? req.file.mimetype : null;

    // Crear campaña
    const campResult = await query(
      `INSERT INTO campaigns (nombre, mensaje, session_id, adjunto_path, adjunto_tipo, programada_para, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombre, mensaje, session_id, adjunto_path, adjunto_tipo, programada_para || null, req.user.id]
    );

    const campaign = campResult.rows[0];

    // Agregar contactos a la campaña
    if (contact_ids) {
      const ids = JSON.parse(contact_ids);
      for (const contactId of ids) {
        await query(
          `INSERT INTO campaign_contacts (campaign_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [campaign.id, contactId]
        );
      }

      await query(
        `UPDATE campaigns SET total_contactos = $1 WHERE id = $2`,
        [ids.length, campaign.id]
      );
    }

    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/send - Enviar campaña inmediatamente
router.post('/:id/send', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar que existe y está en borrador o programada
    const result = await query(
      `SELECT * FROM campaigns WHERE id = $1 AND estado IN ('borrador', 'programada', 'pausada')`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(400).json({ error: 'Campaña no disponible para envío' });
    }

    // Ejecutar en background
    ejecutarCampaña(id).catch((err) => {
      console.error(`Error en campaña ${id}:`, err.message);
    });

    res.json({ mensaje: 'Campaña iniciada', campaignId: id });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/cancel
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    await cancelarCampaña(req.params.id);
    res.json({ mensaje: 'Campaña cancelada' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await query(`DELETE FROM campaigns WHERE id = $1`, [req.params.id]);
    res.json({ mensaje: 'Campaña eliminada' });
  } catch (err) {
    next(err);
  }
});

export default router;
