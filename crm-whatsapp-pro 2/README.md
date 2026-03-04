# 💬 CRM WhatsApp Pro

**CRM empresarial completo con automatización de WhatsApp usando IA (Gemini)**

> Sistema SaaS profesional para gestión de contactos, campañas masivas, lead scoring con IA y automatizaciones inteligentes.

---

## ✨ Características Principales

| Feature | Descripción |
|---------|-------------|
| 📱 **Multi-sesión WhatsApp** | Conecta múltiples números con QR |
| 👥 **CRM Completo** | Contactos, embudo de ventas, lead scoring |
| 📢 **Campañas Masivas** | Envíos con variables dinámicas y adjuntos |
| 🤖 **IA con Gemini** | Detección de intención y procesamiento de PDFs |
| 🛡️ **Motor Anti-bloqueo** | Delays aleatorios, pausas automáticas, límites configurables |
| ⚙️ **Automatizaciones** | Reglas SI/ENTONCES basadas en intención o tiempo |
| 📊 **Dashboard** | Estadísticas en tiempo real con gráficos |
| 🔐 **Multiusuario** | Roles admin/operador con JWT |

---

## 🛠️ Stack Tecnológico

**Backend:** Node.js (ES Modules) · Express · PostgreSQL · JWT · whatsapp-web.js · Gemini AI · node-cron

**Frontend:** React · React Router · Recharts · Axios

**Infraestructura:** Docker · docker-compose · PostgreSQL 16

---

## 🚀 Instalación Rápida

### Prerrequisitos
- Node.js 20+
- PostgreSQL 14+ (o Docker)
- Google Chrome/Chromium (para Puppeteer)

### 1. Clonar y configurar

```bash
git clone https://github.com/tu-usuario/crm-whatsapp-pro.git
cd crm-whatsapp-pro

# Copiar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores
```

### 2. Instalar dependencias

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Configurar base de datos

```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE crm_whatsapp;"

# Ejecutar schema
psql -U postgres -d crm_whatsapp -f backend/config/schema.sql
```

### 4. Iniciar en desarrollo

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm start
```

Abrir: http://localhost:3000

**Credenciales por defecto:**
- Email: `admin@crm.com`
- Password: `Admin1234!`

---

## 🐳 Despliegue con Docker

### Variables requeridas (.env en raíz)

```env
DB_PASSWORD=tu_password_seguro
JWT_SECRET=tu_secret_muy_largo_aqui
GEMINI_API_KEY=tu_api_key_gemini
FRONTEND_URL=https://tu-dominio.com
```

### Levantar todo

```bash
docker-compose up -d --build
```

El backend estará en: `http://localhost:3001`

---

## 🖥️ Despliegue en VPS (Ubuntu 22.04)

```bash
# 1. Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Clonar proyecto
git clone https://github.com/tu-usuario/crm-whatsapp-pro.git
cd crm-whatsapp-pro

# 3. Configurar variables
cp backend/.env.example .env
nano .env  # Editar con tus valores

# 4. Levantar
docker-compose up -d --build

# 5. Ver logs
docker-compose logs -f backend

# 6. Configurar Nginx como proxy
# /etc/nginx/sites-available/crm
server {
    listen 80;
    server_name tu-dominio.com;
    location /api { proxy_pass http://localhost:3001; }
    location / { proxy_pass http://localhost:3000; }
}
```

---

## 📊 Motor Anti-Bloqueo

Configura en tu `.env` los límites de seguridad:

```env
MAX_DIARIO=80        # Máximo mensajes por día por sesión
MAX_HORA=20          # Máximo mensajes por hora
DELAY_MIN=8000       # Delay mínimo entre mensajes (ms)
DELAY_MAX=20000      # Delay máximo entre mensajes (ms)
PAUSA_CADA=15        # Pausa larga cada N mensajes
PAUSA_MIN=120000     # Duración mínima de pausa larga (ms)
PAUSA_MAX=300000     # Duración máxima de pausa larga (ms)
```

> ⚠️ Se recomienda NO superar 80 mensajes/día por número para evitar baneos.

---

## 🤖 Variables Dinámicas en Mensajes

Usa estas variables en tus mensajes de campaña:

| Variable | Reemplaza con |
|----------|---------------|
| `{{nombre}}` | Nombre del contacto |
| `{{telefono}}` | Teléfono del contacto |

---

## 📁 Estructura del Proyecto

```
crm-whatsapp-pro/
├── backend/
│   ├── config/         # DB, schema SQL
│   ├── engines/        # Motores: campañas, IA, anti-bloqueo, importación
│   ├── middleware/      # Auth JWT, upload, errores
│   ├── routes/         # Endpoints API REST
│   ├── services/       # WhatsApp manager
│   ├── utils/          # Logger
│   └── server.js       # Punto de entrada
├── frontend/
│   └── src/
│       ├── pages/      # Dashboard, Contactos, Campañas, etc.
│       └── services/   # Axios API client
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🔐 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/dashboard/stats` | Estadísticas |
| GET | `/api/contacts` | Listar contactos |
| POST | `/api/contacts/import` | Importar CSV/XLSX |
| GET | `/api/contacts/export/csv` | Exportar CSV |
| GET | `/api/whatsapp/sessions` | Sesiones WhatsApp |
| POST | `/api/whatsapp/sessions` | Crear sesión |
| GET | `/api/whatsapp/sessions/:id/qr` | Obtener QR |
| GET | `/api/campaigns` | Listar campañas |
| POST | `/api/campaigns` | Crear campaña |
| POST | `/api/campaigns/:id/send` | Enviar campaña |
| POST | `/api/documents/upload` | Procesar PDF con IA |
| GET | `/api/automations` | Reglas de automatización |

---

## ⚠️ Aviso Legal

Este sistema usa `whatsapp-web.js` (librería no oficial). El uso para envíos masivos puede violar los Términos de Servicio de WhatsApp. Úsalo bajo tu propia responsabilidad y con moderación.

---

## 📄 Licencia

MIT License - libre para uso comercial y personal.
