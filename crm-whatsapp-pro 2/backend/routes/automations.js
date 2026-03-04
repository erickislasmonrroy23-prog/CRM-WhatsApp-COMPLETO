// backend/routes/automations.js
import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/automations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM automation_rules ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/automations
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { nombre, condicion_tipo, condicion_valor, accion_tipo, accion_valor } = req.body;

    if (!nombre || !condicion_tipo || !accion_tipo || !accion_valor) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const result = await query(
      `INSERT INTO automation_rules (nombre, condicion_tipo, condicion_valor, accion_tipo, accion_valor, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre, condicion_tipo, condicion_valor, accion_tipo, accion_valor, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/automations/:id/toggle
router.put('/:id/toggle', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE automation_rules SET activa = NOT activa WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Regla no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/automations/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await query(`DELETE FROM automation_rules WHERE id = $1`, [req.params.id]);
    res.json({ mensaje: 'Regla eliminada' });
  } catch (err) {
    next(err);
  }
});

export default router;
