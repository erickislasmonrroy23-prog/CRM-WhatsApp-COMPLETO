// backend/engines/importEngine.js
import { readFileSync } from 'fs';
import xlsx from 'xlsx';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Limpia y normaliza un número de teléfono
 */
const limpiarTelefono = (tel) => {
  if (!tel) return null;
  let t = String(tel).replace(/[^0-9+]/g, '');
  // Si empieza con 0, quitarlo (números locales)
  if (t.startsWith('0') && t.length > 10) t = t.substring(1);
  // Si tiene menos de 7 dígitos, inválido
  if (t.replace('+', '').length < 7) return null;
  return t;
};

/**
 * Detecta columnas relevantes automáticamente
 */
const detectarColumnas = (headers) => {
  const lower = headers.map((h) => String(h).toLowerCase().trim());
  const find = (patterns) => {
    const idx = lower.findIndex((h) => patterns.some((p) => h.includes(p)));
    return idx >= 0 ? headers[idx] : null;
  };

  return {
    nombre: find(['nombre', 'name', 'cliente', 'contacto', 'contact']),
    telefono: find(['telefono', 'teléfono', 'phone', 'cel', 'móvil', 'movil', 'whatsapp', 'numero', 'número']),
    email: find(['email', 'correo', 'mail', 'e-mail']),
    origen: find(['origen', 'fuente', 'source', 'canal']),
  };
};

/**
 * Parsea un archivo CSV o XLSX y retorna rows como objetos
 */
const parseFile = (filePath, ext) => {
  const workbook = xlsx.readFile(filePath, { type: 'file', raw: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
};

/**
 * Previsualización: analiza el archivo sin guardar
 */
export const previewImport = async (filePath, originalName) => {
  const ext = originalName.split('.').pop().toLowerCase();
  const rows = parseFile(filePath, ext);

  if (!rows.length) throw new Error('El archivo está vacío');

  const headers = Object.keys(rows[0]);
  const columnas = detectarColumnas(headers);
  const preview = rows.slice(0, 10).map((row, i) => ({
    _rowIndex: i,
    nombre: row[columnas.nombre] || '',
    telefono: limpiarTelefono(row[columnas.telefono]),
    email: row[columnas.email] || '',
    origen: row[columnas.origen] || 'importacion',
    _raw: row,
  }));

  return {
    totalFilas: rows.length,
    columnasDetectadas: columnas,
    headersOriginales: headers,
    preview,
  };
};

/**
 * Importa contactos desde un archivo CSV/XLSX
 */
export const importarContactos = async (filePath, originalName, usuarioId, columnaOverrides = {}) => {
  const ext = originalName.split('.').pop().toLowerCase();
  const rows = parseFile(filePath, ext);

  if (!rows.length) throw new Error('El archivo está vacío');

  const headers = Object.keys(rows[0]);
  const columnas = { ...detectarColumnas(headers), ...columnaOverrides };

  if (!columnas.telefono) throw new Error('No se encontró columna de teléfono');

  let importados = 0;
  let duplicados = 0;
  let invalidos = 0;
  const errores = [];

  for (const row of rows) {
    const telefono = limpiarTelefono(row[columnas.telefono]);

    if (!telefono) {
      invalidos++;
      continue;
    }

    const nombre = String(row[columnas.nombre] || telefono).trim().substring(0, 150);
    const email = row[columnas.email] ? String(row[columnas.email]).trim() : null;
    const origen = row[columnas.origen] ? String(row[columnas.origen]).trim() : 'importacion';

    try {
      await query(
        `INSERT INTO contacts (nombre, telefono, email, origen, usuario_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (telefono) DO NOTHING`,
        [nombre, telefono, email, origen, usuarioId]
      );
      importados++;
    } catch (err) {
      if (err.code === '23505') {
        duplicados++;
      } else {
        invalidos++;
        errores.push({ telefono, error: err.message });
      }
    }
  }

  logger.info('Importación completada', { importados, duplicados, invalidos, archivo: originalName });

  return { importados, duplicados, invalidos, errores };
};

export default { previewImport, importarContactos };
