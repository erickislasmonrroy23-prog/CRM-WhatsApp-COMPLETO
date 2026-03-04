-- =============================================
-- CRM WhatsApp Pro - Schema de Base de Datos
-- =============================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: usuarios
-- =============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) DEFAULT 'operador' CHECK (rol IN ('admin', 'operador')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: whatsapp_sessions
-- =============================================
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  numero VARCHAR(20),
  session_id VARCHAR(100) UNIQUE NOT NULL,
  estado VARCHAR(30) DEFAULT 'desconectado' CHECK (estado IN ('conectado', 'desconectado', 'qr_pendiente', 'inicializando')),
  mensajes_hoy INTEGER DEFAULT 0,
  mensajes_hora INTEGER DEFAULT 0,
  ultima_actividad TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: contacts
-- =============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(150),
  etapa_embudo VARCHAR(30) DEFAULT 'nuevo' CHECK (etapa_embudo IN ('nuevo', 'interesado', 'info_enviada', 'pago_pendiente', 'pagado')),
  lead_score INTEGER DEFAULT 0,
  origen VARCHAR(50) DEFAULT 'manual',
  notas TEXT,
  ultimo_contacto TIMESTAMP,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: campaigns
-- =============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(150) NOT NULL,
  mensaje TEXT NOT NULL,
  session_id VARCHAR(100) REFERENCES whatsapp_sessions(session_id) ON DELETE SET NULL,
  adjunto_path VARCHAR(500),
  adjunto_tipo VARCHAR(50),
  estado VARCHAR(30) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'programada', 'enviando', 'pausada', 'completada', 'cancelada')),
  programada_para TIMESTAMP,
  total_contactos INTEGER DEFAULT 0,
  enviados INTEGER DEFAULT 0,
  fallidos INTEGER DEFAULT 0,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: campaign_contacts (contactos por campaña)
-- =============================================
CREATE TABLE IF NOT EXISTS campaign_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'fallido', 'omitido')),
  error_msg TEXT,
  enviado_at TIMESTAMP,
  UNIQUE(campaign_id, contact_id)
);

-- =============================================
-- TABLA: message_logs
-- =============================================
CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  mensaje TEXT,
  tipo VARCHAR(20) DEFAULT 'saliente' CHECK (tipo IN ('saliente', 'entrante')),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'entregado', 'leido', 'fallido')),
  respuesta TEXT,
  intencion_detectada VARCHAR(30),
  lead_score_cambio INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: automation_rules
-- =============================================
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(150) NOT NULL,
  condicion_tipo VARCHAR(50) NOT NULL,
  condicion_valor VARCHAR(100),
  accion_tipo VARCHAR(50) NOT NULL,
  accion_valor TEXT,
  activa BOOLEAN DEFAULT true,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: cursos (procesados por IA desde PDFs)
-- =============================================
CREATE TABLE IF NOT EXISTS cursos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  beneficios TEXT,
  duracion VARCHAR(100),
  precio_sugerido DECIMAL(10,2),
  archivo_origen VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ÍNDICES para rendimiento
-- =============================================
CREATE INDEX IF NOT EXISTS idx_contacts_telefono ON contacts(telefono);
CREATE INDEX IF NOT EXISTS idx_contacts_etapa ON contacts(etapa_embudo);
CREATE INDEX IF NOT EXISTS idx_contacts_score ON contacts(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_message_logs_contact ON message_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_campaign ON message_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_created ON message_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign ON campaign_contacts(campaign_id);

-- =============================================
-- USUARIO ADMIN POR DEFECTO
-- password: Admin1234! (cambiar en producción)
-- =============================================
INSERT INTO usuarios (nombre, email, password_hash, rol)
VALUES (
  'Administrador',
  'admin@crm.com',
  '$2b$10$rOzMfXXTqOOWxJYlL.8SiODMJX1LR.zX1QqLY6OvhRVKxpHxc02li',
  'admin'
) ON CONFLICT (email) DO NOTHING;
