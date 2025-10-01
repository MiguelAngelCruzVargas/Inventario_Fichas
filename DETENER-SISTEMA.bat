@echo off
title Sistema Fichas WiFi - Detener Servidores
echo ===============================================
echo   🛑 DETENIENDO SISTEMA DE FICHAS INTERNET
echo ===============================================
echo.

echo 🔍 Buscando procesos de Node.js...

:: Matar procesos de Node que estén usando los puertos específicos
echo 📡 Deteniendo Backend (puerto 8001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do (
    taskkill /f /pid %%a 2>nul
)

echo 🌐 Deteniendo Frontend (puerto 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /f /pid %%a 2>nul
)

:: Matar procesos Node.js que contengan 'vite' o 'nodemon'
echo 🧹 Limpiando procesos restantes...
taskkill /f /im "node.exe" 2>nul
taskkill /f /im "nodemon.exe" 2>nul

echo.
echo ✅ SISTEMA DETENIDO
echo 💡 Todos los servidores han sido cerrados
echo.
pause
