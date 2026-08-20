#!/bin/bash
# Homeland Tours - Next.js Local Server Launcher
# Mac / Linux

GREEN='\033[0;32m'
NC='\033[0m'

cd "$(dirname "$0")"

echo ""
echo "============================================="
echo " HOMELAND TOURS - Servidor Local Next.js"
echo "============================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "[!] Node.js no esta instalado"
    echo "Instala Node.js desde https://nodejs.org"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[..] Instalando dependencias (primera vez)..."
    npm install
fi

echo -e "${GREEN}[OK]${NC} Iniciando servidor en http://localhost:3001"
echo "Para detener: presiona Ctrl+C"
echo ""

# Open browser
if command -v open &> /dev/null; then
    (sleep 3 && open "http://localhost:3001") &
elif command -v xdg-open &> /dev/null; then
    (sleep 3 && xdg-open "http://localhost:3001") &
fi

npm run dev
