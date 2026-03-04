// backend/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { mkdirSync } from 'fs';
import logger from './utils/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initAllSessions } from './services/whatsappManager.js';
import { initAutomationCron } from './engines/automationEngine.js';

// Rutas
import authRoutes from './routes/auth.js';
import whatsappRoutes from './routes/whatsapp.js';
import contactsRoutes from './routes/contacts.js';
import campaignsRoutes from './routes/campaigns.js';
import dashboardRoutes from './routes/dashboard.js';
import automationsRoutes from './routes/automations.js';
import documentsRoutes from './routes/documents.js';

// Crear directorios necesarios
['sessions', 'uploads', 'logs'].forEach((dir) => {
  mkdirSync(dir, { recursive: true });
});

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================
// MIDDLEWARES GLOBALES
// =============================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Archivos estáticos (adjuntos)
app.use('/uploads', express.static('uploads'));

// Log de requests
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// =============================================
// RUTAS API
// =============================================
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/automations', automationsRoutes);
app.use('/api/documents', documentsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// =============================================
// MANEJO DE ERRORES
// =============================================
app.use(notFound);
app.use(errorHandler);

// =============================================
// INICIO DEL SERVIDOR
// =============================================
app.listen(PORT, async () => {
  logger.info(`🚀 CRM WhatsApp Pro corriendo en puerto ${PORT}`);
  logger.info(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);

  // Inicializar sesiones de WhatsApp guardadas
  await initAllSessions();

  // Inicializar motor de automatización
  initAutomationCron();

  logger.info('✅ Sistema listo');
});

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
  logger.error('Error no capturado', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Promise rechazada no manejada', { reason });
});

export default app;
