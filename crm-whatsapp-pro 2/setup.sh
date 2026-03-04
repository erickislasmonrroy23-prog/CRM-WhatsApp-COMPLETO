#!/bin/bash
# =============================================
# CRM WhatsApp Pro — Deploy a GitHub + Railway
# Ejecuta: bash setup.sh
# =============================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   CRM WhatsApp Pro — Auto Deploy     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# 1. Verificar Git
if ! command -v git &> /dev/null; then
  echo -e "${RED}✗ Git no instalado. Instala desde https://git-scm.com${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Git detectado${NC}"

# 2. Pedir datos
echo ""
echo -e "${YELLOW}Ingresa tu token de GitHub (Settings > Developer Settings > Tokens):${NC}"
read -s GH_TOKEN
echo ""

echo -e "${YELLOW}Ingresa tu API Key de Gemini (aistudio.google.com):${NC}"
read -s GEMINI_KEY
echo ""

echo -e "${YELLOW}Contraseña para PostgreSQL (elige una segura):${NC}"
read -s DB_PASS
echo ""

echo -e "${YELLOW}JWT Secret (cadena larga aleatoria):${NC}"
read -s JWT_SEC
echo ""

# 3. Crear .env para Railway
cat > .env << EOF
DB_PASSWORD=${DB_PASS}
JWT_SECRET=${JWT_SEC}
GEMINI_API_KEY=${GEMINI_KEY}
NODE_ENV=production
PORT=3001
MAX_DIARIO=80
MAX_HORA=20
DELAY_MIN=8000
DELAY_MAX=20000
PAUSA_CADA=15
PAUSA_MIN=120000
PAUSA_MAX=300000
EOF
echo -e "${GREEN}✓ .env creado${NC}"

# 4. Git init y push
REPO="crm-whatsapp-pro"
GH_USER="erickislasmonrroy23"
REMOTE="https://${GH_USER}:${GH_TOKEN}@github.com/${GH_USER}/${REPO}.git"

git init
git add .
git commit -m "🚀 CRM WhatsApp Pro - deploy inicial"
git branch -M main
git remote remove origin 2>/dev/null
git remote add origin "$REMOTE"
git push -u origin main

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ Código subido a GitHub exitosamente${NC}"
else
  echo -e "${RED}✗ Error al subir a GitHub. Verifica tu token.${NC}"
  exit 1
fi

# 5. Instrucciones Railway
echo ""
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo -e "${BLUE}  PASO FINAL: Despliega en Railway (2 min)${NC}"
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""
echo "1. Ve a: https://railway.app"
echo "2. Login con GitHub"
echo "3. New Project → Deploy from GitHub repo"
echo "4. Selecciona: ${REPO}"
echo "5. New → Database → PostgreSQL"
echo "6. En Variables pega estas (ya están en tu .env):"
echo ""
cat .env
echo ""
echo "7. Settings → Networking → Generate Domain"
echo ""
echo -e "${GREEN}✅ ¡Listo! Tu CRM estará en línea en ~3 minutos${NC}"
echo ""
echo -e "${YELLOW}URL admin: https://tu-app.railway.app${NC}"
echo -e "${YELLOW}Email:     admin@crm.com${NC}"
echo -e "${YELLOW}Password:  Admin1234!  (cámbialo después)${NC}"
