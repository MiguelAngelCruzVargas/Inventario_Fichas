import axios from 'axios';
import { handleApiError, isExpectedError } from '@utils/errorHandler';
import { cacheManager, cachedRequest } from '@utils/cacheManager';

// --- CAMBIO CLAVE ---
// Con proxy configurado en Vite - el frontend usa rutas relativas
// Vite redirige automáticamente /api/* a http://localhost:3000/api/*
const API_BASE_URL = '/api';

// Detectar si estamos en un dominio de túnel (más latencia) para ampliar timeout
let baseTimeout = 30000;
try {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (/\.loca\.lt$|ngrok\.(io|app)$/i.test(host)) {
    baseTimeout = 45000; // 45s para túneles
  }
} catch {}

// Crear instancia de axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: baseTimeout,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Throttling global para prevenir rate limiting - CONFIGURACIÓN MEJORADA
const requestThrottle = new Map();
const requestCounts = new Map();
const THROTTLE_TIME = 200; // Aumentado a 200ms para mayor estabilidad

// Función para verificar si una petición debe ser throttled
const shouldThrottleRequest = (endpoint) => {
  const now = Date.now();
  
  // Obtener datos del endpoint
  const lastRequest = requestThrottle.get(endpoint) || 0;
  const requestCount = requestCounts.get(endpoint) || 0;
  
  // Resetear contador cada 10 segundos (más frecuente)
  const tenSecondsAgo = now - 10000;
  if (lastRequest < tenSecondsAgo) {
    requestCounts.set(endpoint, 0);
  }
  
  // Ser más permisivo con endpoints críticos para actualizaciones en tiempo real
  const criticalEndpoints = [
    '/usuarios',
    '/tareas/trabajadores/disponibles',
    '/tareas',
    // Cortes de caja: evitar cancelaciones y permitir lecturas frecuentes
    '/cortes-caja/historial',
    '/cortes-caja/estadisticas',
    '/cortes-caja/mis-cortes'
  ];
  const isCritical = criticalEndpoints.some(critical => endpoint?.includes(critical));
  
  if (isCritical) {
    // Para endpoints críticos: permitir primeras 3 peticiones sin throttling
    if (requestCount < 3) {
      requestCounts.set(endpoint, requestCount + 1);
      requestThrottle.set(endpoint, now);
      return false;
    }
    
    // Solo throttle si es MUY frecuente (menos de 300ms para dar más margen)
    const timeDiff = now - lastRequest;
    const shouldThrottle = timeDiff < 300; // Aumentado de 200ms a 300ms
    
    if (!shouldThrottle) {
      requestCounts.set(endpoint, requestCount + 1);
      requestThrottle.set(endpoint, now);
    } else {
      // En lugar de throttling duro, agregar delay pequeño y permitir
  if (globalThis.__APP_DEBUG__) console.log(`⏳ Retrasando petición a ${endpoint} por ${300 - timeDiff}ms`);
      return false; // No throttlear, solo logear
    }
    
    return false; // Nunca throttlear endpoints críticos después del primer intento
  }
  
  // Para otros endpoints: lógica original más permisiva
  if (requestCount < 8) {
    requestCounts.set(endpoint, requestCount + 1);
    requestThrottle.set(endpoint, now);
    return false;
  }
  
  // Solo throttle si hay más de 15 peticiones por minuto
  if (requestCount > 15) {
    const timeDiff = now - lastRequest;
    const shouldThrottle = timeDiff < THROTTLE_TIME;
    
    if (!shouldThrottle) {
      requestCounts.set(endpoint, requestCount + 1);
      requestThrottle.set(endpoint, now);
    }
    
    return shouldThrottle;
  }
  
  // Para uso normal, no hacer throttling
  requestCounts.set(endpoint, requestCount + 1);
  requestThrottle.set(endpoint, now);
  return false;
};

// Helper: determinar si se puede reintentar
const isIdempotent = (method) => ['get','head','options'].includes(String(method).toLowerCase());
const shouldRetry = (error) => {
  if (!error || !error.config) return false;
  const code = error.code;
  if (code === 'ECONNABORTED') return true; // timeout
  if (code === 'ERR_NETWORK') return true;  // pérdida momentánea
  // Algunos navegadores no ponen code, pero sí message
  if (!code && /timeout/i.test(error.message)) return true;
  return false;
};

// Interceptor responses con retry/backoff para timeouts en GET
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const cfg = error.config || {};
    const status = error.response?.status;
    const url = cfg.url || '';
    const errorData = error.response?.data;

    // Retry: solo para métodos idempotentes y condiciones de red/timeout
    if (shouldRetry(error) && isIdempotent(cfg.method) && !cfg.__retryDisabled) {
      cfg.__retryCount = (cfg.__retryCount || 0) + 1;
      const maxRetries = 2; // total de reintentos
      if (cfg.__retryCount <= maxRetries) {
        const backoff = 400 * Math.pow(cfg.__retryCount, 2); // 400ms, 1600ms
        if (globalThis.__APP_DEBUG__) console.warn(`⏳ Retry ${cfg.__retryCount}/${maxRetries} tras ${backoff}ms → ${url}`);
        await new Promise(r => setTimeout(r, backoff));
        return apiClient(cfg); // reintentar
      }
    }

    // Silenciar errores esperados de autenticación para mantener consola limpia
    const isAuthEndpoint = url.startsWith('/auth/');
    const isAuthExpected = isAuthEndpoint && (status === 401 || status === 404);

    if (!isAuthExpected && (status >= 500 || (!status && error.code !== 'ERR_NETWORK'))) {
      handleApiError(error, 'API Client');
    }

    // Manejo de 401
    if (status === 401 && !url.includes('/auth/login')) {
      if (url.includes('/auth/me')) {
        return Promise.reject(error); // silencioso
      }
      if (errorData?.expired) {
        console.warn('🕒 Sesión expirada detectada por API');
        window.dispatchEvent(new CustomEvent('sessionExpired', {
          detail: { 
            message: errorData.detail || 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
            source: 'apiClient'
          }
        }));
      }
      if (!window.location.pathname.includes('/login') && !url?.includes('/auth/me')) {
        setTimeout(() => { window.location.href = '/login'; }, 100);
      }
    }

    return Promise.reject(error);
  }
);

// Interceptor para requests - throttling inteligente
apiClient.interceptors.request.use(
  (config) => {
    const endpoint = config.url;
    
    // Verificar si esta petición debe ser throttled
    if (shouldThrottleRequest(endpoint)) {
      const lastRequest = requestThrottle.get(endpoint);
      const timeDiff = Date.now() - (lastRequest || 0);
      const waitMs = Math.max(THROTTLE_TIME - timeDiff, 60);
      if (import.meta.env.DEV) {
        console.warn(`⏳ Delay request to ${endpoint} by ${waitMs}ms (too soon: ${timeDiff}ms < ${THROTTLE_TIME}ms)`);
      }
      // En lugar de cancelar, retrasar la petición y continuar
      return new Promise((resolve) => {
        setTimeout(() => {
          // Marcar nuevo timestamp para este endpoint
          requestThrottle.set(endpoint, Date.now());
          const cnt = (requestCounts.get(endpoint) || 0) + 1;
          requestCounts.set(endpoint, cnt);
          resolve(config);
        }, waitMs);
      });
    }
    
    // Limpiar entradas antiguas cada 10 peticiones para evitar memory leaks
    if (requestThrottle.size > 20) {
      const now = Date.now();
      const fiveMinutesAgo = now - 300000;
      
      for (const [key, timestamp] of requestThrottle.entries()) {
        if (timestamp < fiveMinutesAgo) {
          requestThrottle.delete(key);
          requestCounts.delete(key);
        }
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Funciones helper para diferentes tipos de requests
export const apiHelpers = {
  // GET request
  async get(url, config = {}) {
    try {
      const response = await apiClient.get(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // POST request
  async post(url, data = {}, config = {}) {
    try {
      const response = await apiClient.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // PUT request
  async put(url, data = {}, config = {}) {
    try {
      const response = await apiClient.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // PATCH request
  async patch(url, data = {}, config = {}) {
    try {
      const response = await apiClient.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // DELETE request
  async delete(url, config = {}) {
    try {
      const response = await apiClient.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Upload de archivos
  async upload(url, file, onProgress = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }

      const response = await apiClient.post(url, formData, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Manejo centralizado de errores
  handleError(error) {
    // Solo hacer log en desarrollo y solo para errores del servidor
    if (import.meta.env.DEV && error.response?.status >= 500) {
      console.debug('API Error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        url: error.config?.url
      });
    }
    
    const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         error.message || 
                         'Error desconocido';

    const errorCode = error.response?.status || 'UNKNOWN';
    
    return {
      message: errorMessage,
      code: errorCode,
      originalError: error
    };
  },

  // Health check
  async healthCheck() {
    try {
      // La petición real será a /api/health
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'error', message: 'API no disponible' };
    }
  },

  // Métodos con cache inteligente
  async getCached(url, options = {}) {
    const { forceRefresh = false, cacheDuration = 30000 } = options;
    
    return cachedRequest(
      async (url) => {
        const response = await apiClient.get(url);
        return response.data;
      },
      url,
      {},
      { forceRefresh, cacheDuration }
    );
  },

  // Invalidar cache específico
  invalidateCache(pattern) {
    cacheManager.invalidate(pattern);
  },

  // Obtener estadísticas del cache
  getCacheStats() {
    return cacheManager.getStats();
  }
};

export { apiClient };
