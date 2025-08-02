import axios from 'axios';
import { handleApiError, isExpectedError } from '../utils/errorHandler';
import { cacheManager, cachedRequest } from '../utils/cacheManager';

// --- CAMBIO CLAVE ---
// Con proxy configurado en Vite - el frontend usa rutas relativas
// Vite redirige automáticamente /api/* a http://localhost:3000/api/*
const API_BASE_URL = '/api';

// Crear instancia de axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  withCredentials: true, // Importante: envía cookies automáticamente
  headers: {
    'Content-Type': 'application/json',
  },
});

// Throttling global para prevenir rate limiting - MUY LIGERO
const requestThrottle = new Map();
const requestCounts = new Map();
const THROTTLE_TIME = 50; // Reducido a solo 50ms para mejor UX

// Función para verificar si una petición debe ser throttled
const shouldThrottleRequest = (endpoint) => {
  const now = Date.now();
  
  // Obtener datos del endpoint
  const lastRequest = requestThrottle.get(endpoint) || 0;
  const requestCount = requestCounts.get(endpoint) || 0;
  
  // Resetear contador cada 30 segundos
  const thirtySecondsAgo = now - 30000;
  if (lastRequest < thirtySecondsAgo) {
    requestCounts.set(endpoint, 0);
  }
  
  // Permitir primeras 5 peticiones sin throttling
  if (requestCount < 5) {
    requestCounts.set(endpoint, requestCount + 1);
    requestThrottle.set(endpoint, now);
    return false;
  }
  
  // Solo throttle si hay más de 10 peticiones por minuto
  if (requestCount > 10) {
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

// Interceptor para responses - manejo de errores globales
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const errorData = error.response?.data;
    
    // Solo hacer log de errores inesperados (500+), no de errores de negocio (400-499)
    // Silenciar errores 401 de /auth/me (verificación de sesión inicial)
    if (status >= 500 || (!status && error.code !== 'ERR_NETWORK')) {
      handleApiError(error, 'API Client');
    }

    // Si es 401 (no autorizado), manejar según el tipo de error
    if (status === 401 && !url?.includes('/auth/login')) {
      // No mostrar errores para verificaciones de sesión inicial
      if (url?.includes('/auth/me')) {
        // Silencioso - es normal que falle la primera vez
        return Promise.reject(error);
      }
      // Verificar si es una expiración de sesión
      if (errorData?.expired) {
        console.warn('🕒 Sesión expirada detectada por API');
        
        // Disparar evento personalizado para manejo de expiración
        window.dispatchEvent(new CustomEvent('sessionExpired', {
          detail: { 
            message: errorData.detail || 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
            source: 'apiClient'
          }
        }));
      }
      
      // Solo redirigir si no estamos ya en login y no es una llamada a /auth/me
      if (!window.location.pathname.includes('/login') && !url?.includes('/auth/me')) {
        // Pequeño delay para permitir que los eventos se procesen
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
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
      const timeDiff = Date.now() - lastRequest;
      console.warn(`⚠️ Throttling request to ${endpoint} (too soon: ${timeDiff}ms < ${THROTTLE_TIME}ms)`);
      
      // Cancelar la petición
      return Promise.reject(new axios.Cancel(`Request throttled: ${endpoint}`));
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
