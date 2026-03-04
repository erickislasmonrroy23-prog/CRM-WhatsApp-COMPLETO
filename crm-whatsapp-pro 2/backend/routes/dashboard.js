// backend/routes/dashboard.js
import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard/stats - Estadísticas principales
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const [
      totalContactos,
      nuevosHoy,
      byEtapa,
      mensajesHoy,
      respuestasHoy,
      leadsCalientes,
      actividadSessions,
    ] = await Promise.all([
      query(`SELECT COUNT(*) as total FROM contacts`),
      query(`SELECT COUNT(*) as total FROM contacts WHERE DATE(created_at) = CURRENT_DATE`),
      query(`SELECT etapa_embudo, COUNT(*) as total FROM contacts GROUP BY etapa_embudo`),
      query(`SELECT COUNT(*) as total FROM message_logs WHERE tipo = 'saliente' AND DATE(created_at) = CURRENT_DATE`),
      query(`SELECT COUNT(*) as total FROM message_logs WHERE tipo = 'entrante' AND DATE(created_at) = CURRENT_DATE`),
      query(`SELECT COUNT(*) as total FROM contacts WHERE lead_score >= 25 AND etapa_embudo != 'pagado'`),
      query(`SELECT session_id, nombre, numero, mensajes_hoy, mensajes_hora, estado FROM whatsapp_sessions`),
    ]);

    // Embudo de conversión
    const embudoData = byEtapa.rows.reduce((acc, row) => {
      acc[row.etapa_embudo] = parseInt(row.total);
      return acc;
    }, {});

    // Últimas campañas
    const campanias = await query(
      `SELECT nombre, estado, enviados, fallidos, total_contactos, created_at
       FROM campaigns ORDER BY created_at DESC LIMIT 5`
    );

    // Actividad reciente (últimos 7 días)
    const actividadSemanal = await query(
      `SELECT DATE(created_at) as fecha, COUNT(*) as mensajes
       FROM message_logs
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY fecha ASC`
    );

    res.json({
      totalContactos: parseInt(totalContactos.rows[0].total),
      nuevosHoy: parseInt(nuevosHoy.rows[0].total),
      mensajesHoy: parseInt(mensajesHoy.rows[0].total),
      respuestasHoy: parseInt(respuestasHoy.rows[0].total),
      leadsCalientes: parseInt(leadsCalientes.rows[0].total),
      conversiones: embudoData.pagado || 0,
      embudo: {
        nuevo: embudoData.nuevo || 0,
        interesado: embudoData.interesado || 0,
        info_enviada: embudoData.info_enviada || 0,
        pago_pendiente: embudoData.pago_pendiente || 0,
        pagado: embudoData.pagado || 0,
      },
      sessions: actividadSessions.rows,
      ultimasCampanias: campanias.rows,
      actividadSemanal: actividadSemanal.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
