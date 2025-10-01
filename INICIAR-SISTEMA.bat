@echo off
title Sistema Fichas WiFi - Inicio Completo
echo ===============================================
echo   🌐 SISTEMA DE FICHAS INTERNET
echo   Backend (Node.js) + Frontend (React)
echo ===============================================
echo.

echo 📋 Verificando dependencias...

:: Verificar e instalar dependencias del backend
echo 🔧 Backend (Node.js + Express + MySQL)...
cd backend
if not exist "node_modules" (
    echo   📥 Instalando dependencias del backend...
    npm install
) else (
    echo   ✅ Dependencias del backend OK
)
cd ..

:: Verificar e instalar dependencias del frontend
echo 🎨 Frontend (React + Vite)...
if not exist "node_modules" (
    echo   📥 Instalando dependencias del frontend...
    npm install
) else (
    echo   ✅ Dependencias del frontend OK
)

echo.
echo 🚀 Iniciando servidores...
echo.

:: Iniciar backend en ventana separada (puerto 8001)
echo 📡 Iniciando Backend en puerto 8001...
start "Backend Server" cmd /k "cd backend && set PORT=8001 && npm run dev"

:: Esperar 3 segundos para que el backend se inicie
echo ⏳ Esperando que el backend se inicie...
timeout 3 > nul

:: Iniciar frontend en ventana separada
echo 🌐 Iniciando Frontend en puerto 5173...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ✅ SISTEMA INICIADO CORRECTAMENTE
echo.
echo 🌍 URLs del sistema:
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8001
echo.
echo  Credenciales de prueba:
echo    Admin:        admin / admin2025
echo    Trabajador:   carlos / carlos123  
echo    Revendedor:   maria / maria456
echo.
echo  Ambos servidores están corriendo en ventanas separadas
echo  Para detener: cierra las ventanas del backend y frontend
echo  O presiona Ctrl+C en cada ventana
echo.
echo  ALTERNATIVA CON NPM (recomendado para producción):
echo   npm run dev:full        # Iniciar todo con un comando
echo   npm run dev:backend     # Solo backend
echo   npm run dev:frontend    # Solo frontend
echo   npm run build           # Construir para producción
echo.
pause
