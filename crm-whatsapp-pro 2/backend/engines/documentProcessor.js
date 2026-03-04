// backend/engines/documentProcessor.js
import pdfParse from 'pdf-parse';
import { readFileSync } from 'fs';
import { GoogleGenAI } from '@google/genai';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Procesa un PDF con IA para extraer datos de cursos/productos
 */
export const procesarPDF = async (filePath, nombreArchivo) => {
  try {
    // 1. Extraer texto del PDF
    const buffer = readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    const textoPDF = pdfData.text.trim().substring(0, 8000); // Limitar tokens

    if (!textoPDF) throw new Error('No se pudo extraer texto del PDF');

    logger.info(`PDF procesado: ${nombreArchivo}`, { chars: textoPDF.length });

    // 2. Enviar a Gemini para análisis
    let datos;
    if (process.env.GEMINI_API_KEY) {
      datos = await analizarConGemini(textoPDF);
    } else {
      datos = extraerDatosBasico(textoPDF);
    }

    // 3. Guardar en tabla cursos
    const result = await query(
      `INSERT INTO cursos (nombre, descripcion, beneficios, duracion, precio_sugerido, archivo_origen)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        datos.nombre,
        datos.descripcion,
        datos.beneficios,
        datos.duracion,
        datos.precio_sugerido,
        nombreArchivo,
      ]
    );

    logger.info(`Curso guardado en DB`, { cursoId: result.rows[0].id, nombre: datos.nombre });
    return result.rows[0];
  } catch (err) {
    logger.error('Error procesando PDF', { error: err.message, archivo: nombreArchivo });
    throw err;
  }
};

/**
 * Analiza el texto del PDF con Gemini y retorna datos estructurados
 */
const analizarConGemini = async (texto) => {
  const prompt = `Analiza el siguiente documento y extrae la información de un curso o producto.
Responde SOLO con un JSON válido (sin markdown, sin explicaciones extra) con esta estructura exacta:
{
  "nombre": "nombre del curso o producto",
  "descripcion": "descripción breve de 2-3 oraciones",
  "beneficios": "lista de beneficios separados por coma",
  "duracion": "duración estimada (ej: 3 meses, 40 horas)",
  "precio_sugerido": 999.99
}

Si no encuentras algún dato, usa null para números y "No especificado" para texto.

Documento:
${texto}`;

  const result = await genAI.models.generateContent({
    model: 'gemini-2.5-flash-preview-05-20',
    contents: prompt,
  });
  let responseText = result.text.trim();

  // Limpiar posibles markdown fences
  responseText = responseText.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(responseText);
  } catch {
    logger.warn('Gemini no retornó JSON válido, usando extracción básica');
    return extraerDatosBasico(texto);
  }
};

/**
 * Extracción básica por patrones cuando no hay API de Gemini
 */
const extraerDatosBasico = (texto) => {
  const lineas = texto.split('\n').filter((l) => l.trim().length > 5);
  const precioMatch = texto.match(/\$[\d,]+\.?\d*|\d+\.?\d*\s*(USD|MXN|€)/i);

  return {
    nombre: lineas[0]?.trim().substring(0, 150) || 'Documento importado',
    descripcion: lineas.slice(1, 4).join(' ').substring(0, 500),
    beneficios: 'Ver documento adjunto para más detalles',
    duracion: 'No especificado',
    precio_sugerido: precioMatch ? parseFloat(precioMatch[0].replace(/[^0-9.]/g, '')) : null,
  };
};

export default { procesarPDF };
