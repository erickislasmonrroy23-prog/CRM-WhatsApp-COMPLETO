// backend/engines/automationEngine.js
import cron from 'node-cron';
import { query } from '../config/database.js';
import { procesarMensajeLeadScoring } from './leadScoringEngine.js';
import { sendMessage } from '../services/whatsappManager.js';
import logger from '../utils/logger.js';

/**
 * Procesa un mensaje entrante de WhatsApp y aplica automatizaciones
 */
export const processIncomingMessage = async (msg, sessionId) => {
  try {
    const telefono = msg.from.replace('@c.us', '');
    const cuerpo = msg.body;

    // Buscar o crear contacto
    let contactResult = await query(
      `SELECT id FROM contacts WHERE telefono = $1`,
      [telefono]
    );

    if (!contactResult.rows.length) {
      contactResult = await query(
        `INSERT INTO contacts (nombre, telefono, origen) VALUES ($1, $2, 'whatsapp_entrante') RETURNING id`,
        [telefono, telefono]
      );
    }

    const contactId = contactResult.rows[0].id;

    // Aplicar lead scoring con IA
    const scoring = await procesarMensajeLeadScoring(contactId, cuerpo);

    // Registrar mensaje entrante
    await query(
      `INSERT INTO message_logs (contact_id, session_id, mensaje, tipo, estado, intencion_detectada, lead_score_cambio)
       VALUES ($1, $2, $3, 'entrante', 'entregado', $4, $5)`,
      [contactId, sessionId, cuerpo, scoring.intencion, scoring.scoreChange]
    );

    // Ejecutar reglas de automatización
    await ejecutarReglas(contactId, scoring.intencion, sessionId, telefono);

    logger.info(`Mensaje entrante procesado`, {
      telefono,
      intencion: scoring.intencion,
      scoreChange: scoring.scoreChange,
    });
  } catch (err) {
    logger.error('Error procesando mensaje entrante', { error: err.message });
  }
};

/**
 * Ejecuta reglas de automatización basadas en la intención detectada
 */
const ejecutarReglas = async (contactId, intencion, sessionId, telefono) => {
  try {
    const rules = await query(
      `SELECT * FROM automation_rules WHERE activa = true AND condicion_tipo = 'intencion' AND condicion_valor = $1`,
      [intencion]
    );

    for (const rule of rules.rows) {
      if (rule.accion_tipo === 'enviar_mensaje') {
        await sendMessage(sessionId, telefono, rule.accion_valor);
        logger.info(`Automatización ejecutada: ${rule.nombre}`, { contactId, intencion });
      }
    }
  } catch (err) {
    logger.error('Error ejecutando reglas de automatización', { error: err.message });
  }
};

/**
 * Cron: Verificar contactos sin respuesta en 24h y enviar recordatorio
 * Ejecuta cada hora
 */
export const initAutomationCron = () => {
  cron.schedule('0 * * * *', async () => {
    logger.info('Cron: verificando contactos sin respuesta en 24h...');
    try {
      const rules = await query(
        `SELECT * FROM automation_rules WHERE activa = true AND condicion_tipo = 'sin_respuesta_24h'`
      );

      if (!rules.rows.length) return;

      // Contactos con último contacto hace más de 24h y que no son "pagados" ni "no_interesados"
      const contacts = await query(
        `SELECT c.id, c.telefono, c.nombre
         FROM contacts c
         WHERE c.ultimo_contacto < NOW() - INTERVAL '24 hours'
         AND c.etapa_embudo NOT IN ('pagado')
         AND c.ultimo_contacto IS NOT NULL
         LIMIT 20`
      );

      for (const contact of contacts.rows) {
        for (const rule of rules.rows) {
          if (rule.accion_tipo === 'enviar_recordatorio') {
            // Buscar sesión activa
            const session = await query(
              `SELECT session_id FROM whatsapp_sessions WHERE estado = 'conectado' LIMIT 1`
            );
            if (!session.rows.length) continue;

            await sendMessage(session.rows[0].session_id, contact.telefono, rule.accion_valor);
            await query(
              `UPDATE contacts SET ultimo_contacto = NOW() WHERE id = $1`,
              [contact.id]
            );
            logger.info(`Recordatorio enviado a ${contact.telefono}`);
          }
        }
      }
    } catch (err) {
      logger.error('Error en cron de recordatorios', { error: err.message });
    }
  });

  // Reset contadores de mensajes por hora en sesiones
  cron.schedule('0 * * * *', async () => {
    await query(`UPDATE whatsapp_sessions SET mensajes_hora = 0`);
  });

  // Reset contadores diarios a medianoche
  cron.schedule('0 0 * * *', async () => {
    await query(`UPDATE whatsapp_sessions SET mensajes_hoy = 0`);
    logger.info('Contadores diarios reseteados');
  });

  logger.info('Motor de automatización (cron) iniciado');
};

export default { processIncomingMessage, initAutomationCron };
