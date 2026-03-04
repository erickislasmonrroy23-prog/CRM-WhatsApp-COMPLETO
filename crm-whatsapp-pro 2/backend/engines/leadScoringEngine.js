// backend/engines/leadScoringEngine.js
import { GoogleGenAI } from '@google/genai';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Puntajes por intención detectada
 */
const SCORE_MAP = {
  informacion: 10,
  precio: 15,
  inscripcion: 25,
  no_interesado: -10,
};

/**
 * Etapa del embudo según puntaje acumulado
 */
const getEtapaByScore = (score) => {
  if (score >= 50) return 'pago_pendiente';
  if (score >= 35) return 'info_enviada';
  if (score >= 20) return 'interesado';
  return 'nuevo';
};

/**
 * Detecta la intención de un mensaje usando Gemini AI
 */
export const detectarIntencion = async (mensaje) => {
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY no configurada, usando detección básica');
    return detectarIntencionBasica(mensaje);
  }

  try {
    const prompt = `Analiza el siguiente mensaje de WhatsApp de un potencial cliente y clasifica su intención en UNA de estas categorías:
- informacion: El cliente pide información general sobre el producto/servicio
- precio: El cliente pregunta por precios, costos, tarifas o pagos
- inscripcion: El cliente quiere inscribirse, comprar o contratar
- no_interesado: El cliente no está interesado, pide que no lo contacten

Responde SOLO con la categoría exacta, sin explicación adicional.

Mensaje: "${mensaje}"`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: prompt,
    });
    const intencion = result.text.trim().toLowerCase();

    if (SCORE_MAP.hasOwnProperty(intencion)) {
      return intencion;
    }

    // Si la respuesta no coincide exactamente, intentar mapear
    if (intencion.includes('precio') || intencion.includes('costo')) return 'precio';
    if (intencion.includes('inscri') || intencion.includes('compra')) return 'inscripcion';
    if (intencion.includes('no_inter') || intencion.includes('no inter')) return 'no_interesado';
    return 'informacion';
  } catch (err) {
    logger.error('Error en Gemini AI, usando detección básica', { error: err.message });
    return detectarIntencionBasica(mensaje);
  }
};

/**
 * Detección básica por palabras clave (fallback sin API)
 */
const detectarIntencionBasica = (mensaje) => {
  const m = mensaje.toLowerCase();
  if (/precio|costo|cuánto|cuanto|valor|tarifa|pago|cobran/.test(m)) return 'precio';
  if (/inscrib|quiero|comprar|contratar|me apunto|cómo pago|cómo me inscribo/.test(m)) return 'inscripcion';
  if (/no gracias|no me interesa|no quiero|quita|baja|elimina|deja de/.test(m)) return 'no_interesado';
  return 'informacion';
};

/**
 * Procesa un mensaje entrante: detecta intención, actualiza score y embudo
 */
export const procesarMensajeLeadScoring = async (contactId, mensaje) => {
  try {
    const intencion = await detectarIntencion(mensaje);
    const scoreChange = SCORE_MAP[intencion] || 0;

    // Actualizar score y etapa del contacto
    const result = await query(
      `UPDATE contacts 
       SET lead_score = GREATEST(0, lead_score + $1),
           ultimo_contacto = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING lead_score, etapa_embudo`,
      [scoreChange, contactId]
    );

    if (!result.rows.length) return { intencion, scoreChange };

    const { lead_score: newScore } = result.rows[0];
    const nuevaEtapa = getEtapaByScore(newScore);

    // Actualizar etapa si corresponde
    await query(
      `UPDATE contacts SET etapa_embudo = $1 WHERE id = $2`,
      [nuevaEtapa, contactId]
    );

    logger.info(`Lead scoring aplicado`, {
      contactId,
      intencion,
      scoreChange,
      newScore,
      nuevaEtapa,
    });

    return { intencion, scoreChange, newScore, nuevaEtapa };
  } catch (err) {
    logger.error('Error en lead scoring', { contactId, error: err.message });
    return { intencion: 'informacion', scoreChange: 0 };
  }
};

export default { detectarIntencion, procesarMensajeLeadScoring };
