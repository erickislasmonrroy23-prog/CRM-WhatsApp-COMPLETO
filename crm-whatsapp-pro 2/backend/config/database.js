// backend/config/database.js
import pg from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'crm_whatsapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Error inesperado en el pool de PostgreSQL', { error: err.message });
});

/**
 * Ejecuta una query con parámetros
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query ejecutada', { text: text.substring(0, 80), duration, rows: res.rowCount });
    return res;
  } catch (err) {
    logger.error('Error en query', { text: text.substring(0, 80), error: err.message });
    throw err;
  }
};

/**
 * Obtiene un cliente del pool para transacciones
 */
export const getClient = () => pool.connect();

export default pool;
