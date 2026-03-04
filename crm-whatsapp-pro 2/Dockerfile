# =============================================
# CRM WhatsApp Pro - Dockerfile Backend
# =============================================
FROM node:20-slim

# Instalar dependencias de Chromium/Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copiar dependencias primero (cache)
COPY backend/package*.json ./

RUN npm install --omit=dev

# Copiar el resto del código
COPY backend/ .

# Crear directorios necesarios
RUN mkdir -p sessions uploads logs

EXPOSE 3001

CMD ["node", "server.js"]
