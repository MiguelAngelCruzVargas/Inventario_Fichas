import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Puerto del backend para el proxy en desarrollo
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '8001', 10)
const backendTarget = `http://localhost:${BACKEND_PORT}`

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@context': resolve(__dirname, './src/context'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@services': resolve(__dirname, './src/services'),
      '@utils': resolve(__dirname, './src/utils'),
      '@router': resolve(__dirname, './src/router'),
      '@assets': resolve(__dirname, './src/assets'),
  '@shared': resolve(__dirname, './src/shared'),
    }
  },
  server: {
    port: 5173,
    open: true,
     allowedHosts: ['.loca.lt'],
    // Permitir elegir el puerto del backend por variable de entorno en desarrollo
    // Por defecto usamos 8001 para coincidir con INICIAR-SISTEMA.bat
    // PowerShell: $env:BACKEND_PORT=3001; npm run dev
    // CMD: set BACKEND_PORT=3001 && npm run dev
    // Bash: BACKEND_PORT=3001 npm run dev
    host: true,
    proxy: {
      // Dedicated SSE proxy: keep connection open indefinitely
      '/api/stream': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        ws: false,
        // Disable timeouts for Server-Sent Events to prevent ERR_EMPTY_RESPONSE
        timeout: 0,
        proxyTimeout: 0,
        configure: (proxy, options) => {
          console.log(`Proxy configurado para SSE /api/stream -> ${backendTarget}`);
          proxy.on('error', (err, req, res) => {
            console.error('❌ Error en proxy SSE:', err.message);
          });
        }
      },
      // Nuevo: servir archivos de imágenes subidas (/uploads/*) desde el backend
      // Esto permite que rutas como /uploads/notas/archivo.jpg funcionen en desarrollo
      '/uploads': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          console.log(`Proxy configurado para /uploads -> ${backendTarget}`);
          proxy.on('error', (err, req) => {
            console.error('❌ Error en proxy /uploads:', err.message, req.url);
          });
        }
      },
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        timeout: 10000, // 10 segundos timeout
        configure: (proxy, options) => {
          console.log(`Proxy configurado para /api -> ${backendTarget}`);
          
          proxy.on('error', (err, req, res) => {
            console.error('❌ Error en proxy:', err.message);
            console.error('   Request URL:', req.url);
            console.error('   Target:', backendTarget);
          });
          
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔄 Proxy request:', req.method, req.url, '-> ' + backendTarget + req.url);
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('✅ Proxy response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})
