import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Control centralizado de debug/logs.
// Objetivos:
// 1. En producción: silenciar (excepto errores) como ya se hacía.
// 2. En túneles públicos (*.loca.lt, *.ngrok.io/app) tratar como prod para no exponer detalles.
// 3. Permitir forzar debug con ?debug=1 en la URL, incluso en túnel.
// 4. Permitir forzar silencio con ?debug=0.
(() => {
  const env = (import.meta && import.meta.env) || {};
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const params = new URLSearchParams(search);
  const debugParam = params.get('debug');

  const isTunnel = /(?:\.loca\.lt|ngrok\.(?:io|app))$/i.test(host);
  const forcedDebug = debugParam === '1';
  const forcedSilent = debugParam === '0';

  let debug = !!env.DEV; // Base: en DEV sí
  if (env.PROD) debug = false; // Producción siempre false salvo override
  if (isTunnel) debug = false; // Túnel se trata como producción
  if (forcedDebug) debug = true; // Override manual
  if (forcedSilent) debug = false; // Override manual a silencio

  // Exponer flag global para que otros módulos lo utilicen
  // eslint-disable-next-line no-underscore-dangle
  globalThis.__APP_DEBUG__ = debug;

  if (!debug) {
    const noop = () => {};
    // Mantener errores visibles
    // eslint-disable-next-line no-console
    console.debug = noop;
    // eslint-disable-next-line no-console
    console.log = noop;
    // eslint-disable-next-line no-console
    console.info = noop;
    // eslint-disable-next-line no-console
    console.warn = noop;
  } else {
    // Pequeño banner útil para saber que estamos en modo debug
    // eslint-disable-next-line no-console
    console.info('[DEBUG ACTIVO]', { host, isTunnel, forcedDebug, forcedSilent });
  }
})();

function Root() {
  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')).render(<Root />)
