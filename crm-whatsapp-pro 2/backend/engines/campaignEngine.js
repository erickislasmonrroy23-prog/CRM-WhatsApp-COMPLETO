// backend/engines/campaignEngine.js
import { query } from '../config/database.js';
import { sendMessage, sendMessageWithAttachment } from '../services/whatsappManager.js';
import { canSend, registerSend, applyDelay, variarMensaje } from './antiBlockEngine.js';
import logger from '../utils/logger.js';

// Campañas actualmente en ejecución
const runningCampaigns = new Set();

/**
 * Reemplaza variables dinámicas en el mensaje
 */
const renderMensaje = (template, contact) => {
  return template
    .replace(/\{\{nombre\}\}/gi, contact.nombre || '')
    .replace(/\{\{telefono\}\}/gi, contact.telefono || '');
};

/**
 * Ejecuta una campaña de envío masivo
 */
export const ejecutarCampaña = async (campaignId) => {
  if (runningCampaigns.has(campaignId)) {
    logger.warn(`Campaña ${campaignId} ya está en ejecución`);
    return;
  }

  runningCampaigns.add(campaignId);

  try {
    // Obtener datos de la campaña
    const campResult = await query(
      `SELECT c.*, ws.estado as session_estado 
       FROM campaigns c
       LEFT JOIN whatsapp_sessions ws ON ws.session_id = c.session_id
       WHERE c.id = $1`,
      [campaignId]
    );

    if (!campResult.rows.length) throw new Error('Campaña no encontrada');

    const campaign = campResult.rows[0];

    if (campaign.session_estado !== 'conectado') {
      throw new Error(`Sesión WhatsApp no está conectada: ${campaign.session_id}`);
    }

    // Marcar campaña como enviando
    await query(
      `UPDATE campaigns SET estado = 'enviando', updated_at = NOW() WHERE id = $1`,
      [campaignId]
    );

    // Obtener contactos pendientes de la campaña
    const contactsResult = await query(
      `SELECT cc.id as cc_id, c.* 
       FROM campaign_contacts cc
       JOIN contacts c ON c.id = cc.contact_id
       WHERE cc.campaign_id = $1 AND cc.estado = 'pendiente'
       ORDER BY c.created_at ASC`,
      [campaignId]
    );

    logger.info(`Iniciando campaña "${campaign.nombre}"`, {
      campaignId,
      totalContactos: contactsResult.rows.length,
      sessionId: campaign.session_id,
    });

    let enviados = 0;
    let fallidos = 0;

    for (let i = 0; i < contactsResult.rows.length; i++) {
      const contact = contactsResult.rows[i];

      // Verificar límites anti-bloqueo
      const check = canSend(campaign.session_id);
      if (!check.ok) {
        logger.warn(`Campaña pausada por límite: ${check.motivo}`, { campaignId });
        await query(
          `UPDATE campaign_contacts SET estado = 'omitido' WHERE campaign_id = $1 AND contact_id = $2`,
          [campaignId, contact.id]
        );
        continue;
      }

      try {
        // Preparar mensaje personalizado
        const mensajePersonalizado = variarMensaje(renderMensaje(campaign.mensaje, contact));

        // Enviar mensaje (con o sin adjunto)
        if (campaign.adjunto_path) {
          await sendMessageWithAttachment(
            campaign.session_id,
            contact.telefono,
            mensajePersonalizado,
            campaign.adjunto_path,
            campaign.adjunto_tipo
          );
        } else {
          await sendMessage(campaign.session_id, contact.telefono, mensajePersonalizado);
        }

        registerSend(campaign.session_id);
        enviados++;

        // Registrar éxito en campaign_contacts
        await query(
          `UPDATE campaign_contacts SET estado = 'enviado', enviado_at = NOW() WHERE campaign_id = $1 AND contact_id = $2`,
          [campaignId, contact.id]
        );

        // Registrar en message_logs
        await query(
          `INSERT INTO message_logs (contact_id, campaign_id, session_id, mensaje, tipo, estado)
           VALUES ($1, $2, $3, $4, 'saliente', 'enviado')`,
          [contact.id, campaignId, campaign.session_id, mensajePersonalizado]
        );

        // Actualizar último contacto
        await query(
          `UPDATE contacts SET ultimo_contacto = NOW() WHERE id = $1`,
          [contact.id]
        );

        logger.info(`Mensaje enviado [${i + 1}/${contactsResult.rows.length}]`, {
          telefono: contact.telefono,
          campaignId,
        });
      } catch (sendErr) {
        fallidos++;
        logger.error(`Error enviando a ${contact.telefono}`, { error: sendErr.message });

        await query(
          `UPDATE campaign_contacts SET estado = 'fallido', error_msg = $1 WHERE campaign_id = $2 AND contact_id = $3`,
          [sendErr.message, campaignId, contact.id]
        );

        await query(
          `INSERT INTO message_logs (contact_id, campaign_id, session_id, mensaje, tipo, estado)
           VALUES ($1, $2, $3, $4, 'saliente', 'fallido')`,
          [contact.id, campaignId, campaign.session_id, campaign.mensaje]
        );
      }

      // Actualizar progreso en DB
      await query(
        `UPDATE campaigns SET enviados = $1, fallidos = $2, updated_at = NOW() WHERE id = $3`,
        [enviados, fallidos, campaignId]
      );

      // Aplicar delay anti-bloqueo (excepto en el último mensaje)
      if (i < contactsResult.rows.length - 1) {
        await applyDelay(campaign.session_id, i);
      }
    }

    // Marcar campaña como completada
    await query(
      `UPDATE campaigns SET estado = 'completada', enviados = $1, fallidos = $2, updated_at = NOW() WHERE id = $3`,
      [enviados, fallidos, campaignId]
    );

    logger.info(`Campaña completada`, { campaignId, enviados, fallidos });
  } catch (err) {
    logger.error(`Error en campaña ${campaignId}`, { error: err.message });
    await query(
      `UPDATE campaigns SET estado = 'pausada', updated_at = NOW() WHERE id = $1`,
      [campaignId]
    );
    throw err;
  } finally {
    runningCampaigns.delete(campaignId);
  }
};

/**
 * Cancela una campaña en ejecución
 */
export const cancelarCampaña = async (campaignId) => {
  runningCampaigns.delete(campaignId);
  await query(
    `UPDATE campaigns SET estado = 'cancelada', updated_at = NOW() WHERE id = $1`,
    [campaignId]
  );
  logger.info(`Campaña cancelada: ${campaignId}`);
};

export default { ejecutarCampaña, cancelarCampaña };
