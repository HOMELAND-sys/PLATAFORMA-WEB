@echo off
title Homeland Tours - Servidor Local (Next.js)
color 0a

echo.
echo  =============================================
echo    HOMELAND TOURS - Servidor Local Next.js
echo  =============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [!] Node.js no esta instalado.
    echo  Instalalo desde https://nodejs.org
    pause
    exit /b 1
)

if not exist node_modules (
    echo  [..] Instalando dependencias (primera vez)...
    call npm install
    if %errorlevel% neq 0 (
        echo  [!] Error instalando dependencias.
        pause
        exit /b 1
    )
)

echo  [OK] Iniciando servidor en http://localhost:3001 ...
echo.
echo  Tu navegador se abrira automaticamente en 3 segundos.
echo  Para detener el servidor, cierra esta ventana o presiona Ctrl+C.
echo.
timeout /t 3 >nul
start http://localhost:3001
cd /d "%~dp0"
npm run dev
