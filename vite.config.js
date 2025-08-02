import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
     allowedHosts: ['.loca.lt'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        timeout: 10000, // 10 segundos timeout
        configure: (proxy, options) => {
          console.log('Proxy configurado para /api -> http://localhost:3000');
          
          proxy.on('error', (err, req, res) => {
            console.error('❌ Error en proxy:', err.message);
            console.error('   Request URL:', req.url);
            console.error('   Target:', 'http://localhost:3000');
          });
          
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔄 Proxy request:', req.method, req.url, '-> http://localhost:3000' + req.url);
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('✅ Proxy response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})
