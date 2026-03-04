// backend/services/whatsappManager.js
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { processIncomingMessage } from '../engines/automationEngine.js';

// Mapa global de clientes activos
const clients = new Map();
const qrCodes = new Map();

/**
 * Inicializa una sesión de WhatsApp
 */
export const initSession = async (sessionId, sessionName) => {
  if (clients.has(sessionId)) {
    logger.info(`Sesión ${sessionId} ya existe`);
    return { status: 'already_exists' };
  }

  logger.info(`Inicializando sesión WhatsApp: ${sessionId}`);

  await query(
    `UPDATE whatsapp_sessions SET estado = 'inicializando', updated_at = NOW() WHERE session_id = $1`,
    [sessionId]
  );

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: sessionId,
      dataPath: process.env.SESSIONS_DIR || './sessions',
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    },
  });

  // Evento: QR generado
  client.on('qr', async (qr) => {
    logger.info(`QR generado para sesión: ${sessionId}`);
    const qrDataUrl = await qrcode.toDataURL(qr);
    qrCodes.set(sessionId, qrDataUrl);
    await query(
      `UPDATE whatsapp_sessions SET estado = 'qr_pendiente', updated_at = NOW() WHERE session_id = $1`,
      [sessionId]
    );
  });

  // Evento: Autenticado
  client.on('authenticated', async () => {
    logger.info(`Sesión autenticada: ${sessionId}`);
    qrCodes.delete(sessionId);
  });

  // Evento: Listo
  client.on('ready', async () => {
    logger.info(`Sesión lista: ${sessionId}`);
    const info = client.info;
    await query(
      `UPDATE whatsapp_sessions SET estado = 'conectado', numero = $1, ultima_actividad = NOW(), updated_at = NOW() WHERE session_id = $2`,
      [info?.wid?.user || null, sessionId]
    );
  });

  // Evento: Desconectado
  client.on('disconnected', async (reason) => {
    logger.warn(`Sesión desconectada: ${sessionId}`, { reason });
    clients.delete(sessionId);
    await query(
      `UPDATE whatsapp_sessions SET estado = 'desconectado', updated_at = NOW() WHERE session_id = $1`,
      [sessionId]
    );
    // Reconexión automática después de 30s
    setTimeout(() => {
      logger.info(`Intentando reconexión: ${sessionId}`);
      initSession(sessionId, sessionName);
    }, 30000);
  });

  // Evento: Mensaje recibido
  client.on('message', async (msg) => {
    try {
      if (!msg.fromMe) {
        await processIncomingMessage(msg, sessionId);
      }
    } catch (err) {
      logger.error(`Error procesando mensaje entrante`, { sessionId, error: err.message });
    }
  });

  clients.set(sessionId, client);

  await client.initialize();
  return { status: 'initializing' };
};

/**
 * Envía un mensaje de texto
 */
export const sendMessage = async (sessionId, telefono, mensaje) => {
  const client = clients.get(sessionId);
  if (!client) throw new Error(`Sesión ${sessionId} no disponible`);

  const chatId = telefono.includes('@c.us') ? telefono : `${telefono}@c.us`;
  const result = await client.sendMessage(chatId, mensaje);

  await query(
    `UPDATE whatsapp_sessions SET mensajes_hoy = mensajes_hoy + 1, mensajes_hora = mensajes_hora + 1, ultima_actividad = NOW() WHERE session_id = $1`,
    [sessionId]
  );

  return result;
};

/**
 * Envía un mensaje con adjunto (PDF, imagen, etc.)
 */
export const sendMessageWithAttachment = async (sessionId, telefono, mensaje, filePath, mimeType) => {
  const client = clients.get(sessionId);
  if (!client) throw new Error(`Sesión ${sessionId} no disponible`);

  const { MessageMedia } = await import('whatsapp-web.js');
  const media = MessageMedia.fromFilePath(filePath);
  const chatId = telefono.includes('@c.us') ? telefono : `${telefono}@c.us`;

  await client.sendMessage(chatId, media, { caption: mensaje });

  await query(
    `UPDATE whatsapp_sessions SET mensajes_hoy = mensajes_hoy + 1, ultima_actividad = NOW() WHERE session_id = $1`,
    [sessionId]
  );
};

/**
 * Obtiene el QR de una sesión
 */
export const getQR = (sessionId) => qrCodes.get(sessionId) || null;

/**
 * Desconecta una sesión
 */
export const disconnectSession = async (sessionId) => {
  const client = clients.get(sessionId);
  if (client) {
    await client.destroy();
    clients.delete(sessionId);
  }
  await query(
    `UPDATE whatsapp_sessions SET estado = 'desconectado', updated_at = NOW() WHERE session_id = $1`,
    [sessionId]
  );
};

/**
 * Verifica si una sesión está lista
 */
export const isSessionReady = (sessionId) => {
  const client = clients.get(sessionId);
  return client ? client.info !== undefined : false;
};

/**
 * Inicializa todas las sesiones guardadas al arrancar el servidor
 */
export const initAllSessions = async () => {
  try {
    const result = await query(`SELECT session_id, nombre FROM whatsapp_sessions`);
    for (const session of result.rows) {
      await initSession(session.session_id, session.nombre);
      await new Promise((r) => setTimeout(r, 2000)); // Pequeño delay entre sesiones
    }
    logger.info(`${result.rows.length} sesiones inicializadas`);
  } catch (err) {
    logger.error('Error al inicializar sesiones', { error: err.message });
  }
};

export default { initSession, sendMessage, sendMessageWithAttachment, getQR, disconnectSession, isSessionReady, initAllSessions };
