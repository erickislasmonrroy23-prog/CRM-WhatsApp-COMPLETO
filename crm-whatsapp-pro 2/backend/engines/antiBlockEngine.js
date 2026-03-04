// backend/engines/antiBlockEngine.js
import logger from '../utils/logger.js';
import { query } from '../config/database.js';

/**
 * Motor Anti-Bloqueo Profesional
 * Gestiona delays, pausas y límites de envío para evitar baneos de WhatsApp
 */

const config = {
  maxDiario: parseInt(process.env.MAX_DIARIO) || 80,
  maxHora: parseInt(process.env.MAX_HORA) || 20,
  delayMin: parseInt(process.env.DELAY_MIN) || 8000,
  delayMax: parseInt(process.env.DELAY_MAX) || 20000,
  pausaCada: parseInt(process.env.PAUSA_CADA) || 15,
  pausaMin: parseInt(process.env.PAUSA_MIN) || 120000,
  pausaMax: parseInt(process.env.PAUSA_MAX) || 300000,
};

// Contadores en memoria por sesión
const sessionCounters = new Map();

/**
 * Obtiene o inicializa contadores para una sesión
 */
const getCounters = (sessionId) => {
  if (!sessionCounters.has(sessionId)) {
    sessionCounters.set(sessionId, {
      enviadosHora: 0,
      enviadosDia: 0,
      enviadosDesdeUltimaPausa: 0,
      ultimoReset: Date.now(),
      ultimoResetDia: new Date().toDateString(),
    });
  }
  const c = sessionCounters.get(sessionId);

  // Reset por hora
  if (Date.now() - c.ultimoReset > 3600000) {
    c.enviadosHora = 0;
    c.ultimoReset = Date.now();
  }

  // Reset diario
  if (new Date().toDateString() !== c.ultimoResetDia) {
    c.enviadosDia = 0;
    c.ultimoResetDia = new Date().toDateString();
  }

  return c;
};

/**
 * Verifica si se puede enviar un mensaje
 */
export const canSend = (sessionId) => {
  const c = getCounters(sessionId);

  if (c.enviadosDia >= config.maxDiario) {
    logger.warn(`Límite DIARIO alcanzado para sesión ${sessionId}`, {
      enviados: c.enviadosDia,
      limite: config.maxDiario,
    });
    return { ok: false, motivo: 'limite_diario' };
  }

  if (c.enviadosHora >= config.maxHora) {
    logger.warn(`Límite HORA alcanzado para sesión ${sessionId}`, {
      enviados: c.enviadosHora,
      limite: config.maxHora,
    });
    return { ok: false, motivo: 'limite_hora' };
  }

  return { ok: true };
};

/**
 * Registra un envío exitoso
 */
export const registerSend = (sessionId) => {
  const c = getCounters(sessionId);
  c.enviadosHora += 1;
  c.enviadosDia += 1;
  c.enviadosDesdeUltimaPausa += 1;
};

/**
 * Aplica delay aleatorio entre mensajes (simula comportamiento humano)
 */
export const applyDelay = async (sessionId, mensajeNum) => {
  const c = getCounters(sessionId);

  // Pausa larga cada N mensajes
  if (c.enviadosDesdeUltimaPausa >= config.pausaCada && mensajeNum > 0) {
    const pausaMs = randomBetween(config.pausaMin, config.pausaMax);
    const pausaSec = Math.round(pausaMs / 1000);
    logger.info(`Pausa anti-bloqueo activada: ${pausaSec}s`, { sessionId });
    c.enviadosDesdeUltimaPausa = 0;
    await sleep(pausaMs);
    return;
  }

  // Delay normal con variación aleatoria
  const delay = randomBetween(config.delayMin, config.delayMax);
  // Añadir micro-variación adicional para simular tipeo humano
  const microVariacion = Math.random() * 2000;
  logger.debug(`Delay entre mensajes: ${Math.round((delay + microVariacion) / 1000)}s`, { sessionId });
  await sleep(delay + microVariacion);
};

/**
 * Variación de frases para mensajes masivos (evita detección de spam)
 */
export const variarMensaje = (mensaje) => {
  const variaciones = [
    (m) => m,
    (m) => m + ' ',
    (m) => ' ' + m,
    (m) => m.replace('!', '!!'),
    (m) => m,
  ];
  const fn = variaciones[Math.floor(Math.random() * variaciones.length)];
  return fn(mensaje);
};

/**
 * Obtiene estadísticas actuales de una sesión
 */
export const getStats = (sessionId) => {
  const c = getCounters(sessionId);
  return {
    enviadosDia: c.enviadosDia,
    enviadosHora: c.enviadosHora,
    limiteDiario: config.maxDiario,
    limiteHora: config.maxHora,
    porcentajeDia: Math.round((c.enviadosDia / config.maxDiario) * 100),
    proximaPausa: config.pausaCada - c.enviadosDesdeUltimaPausa,
  };
};

// ---- Helpers ----
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export default { canSend, registerSend, applyDelay, variarMensaje, getStats };
