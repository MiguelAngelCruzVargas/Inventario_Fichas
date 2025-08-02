// cacheManager.js - Sistema de cache inteligente para evitar peticiones duplicadas

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.CACHE_DURATION = 30000; // 30 segundos
  }

  // Generar key única para la petición
  generateKey(url, params = {}) {
    const paramStr = Object.keys(params).length > 0 ? JSON.stringify(params) : '';
    return `${url}_${paramStr}`;
  }

  // Verificar si los datos están en cache y son válidos
  isValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    const isExpired = now - cached.timestamp > this.CACHE_DURATION;
    
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Obtener datos del cache
  get(key) {
    if (this.isValid(key)) {
      console.log(`📦 Cache HIT: ${key}`);
      return this.cache.get(key).data;
    }
    return null;
  }

  // Guardar datos en cache
  set(key, data) {
    console.log(`💾 Cache SET: ${key}`);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Verificar si hay una petición en curso
  hasPendingRequest(key) {
    return this.pendingRequests.has(key);
  }

  // Registrar petición en curso
  setPendingRequest(key, promise) {
    console.log(`⏳ Pending request: ${key}`);
    this.pendingRequests.set(key, promise);
    
    // Limpiar cuando termine
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
    
    return promise;
  }

  // Obtener petición en curso
  getPendingRequest(key) {
    return this.pendingRequests.get(key);
  }

  // Limpiar cache específico
  invalidate(pattern) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      console.log(`🗑️ Cache INVALIDATE: ${key}`);
      this.cache.delete(key);
    });
  }

  // Limpiar todo el cache
  clear() {
    console.log('🧹 Cache CLEAR ALL');
    this.cache.clear();
    this.pendingRequests.clear();
  }

  // Obtener estadísticas del cache
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys())
    };
  }
}

// Instancia global del cache
export const cacheManager = new CacheManager();

// Wrapper para peticiones con cache automático
export const cachedRequest = async (requestFn, url, params = {}, options = {}) => {
  const { forceRefresh = false, cacheDuration } = options;
  const key = cacheManager.generateKey(url, params);

  // Si se fuerza refresh, invalidar cache
  if (forceRefresh) {
    cacheManager.invalidate(url);
  }

  // Verificar cache primero
  const cachedData = cacheManager.get(key);
  if (cachedData && !forceRefresh) {
    return cachedData;
  }

  // Verificar si hay una petición en curso
  const pendingRequest = cacheManager.getPendingRequest(key);
  if (pendingRequest) {
    console.log(`🔄 Joining existing request: ${key}`);
    return await pendingRequest;
  }

  // Hacer la petición
  const requestPromise = requestFn(url, params).then(data => {
    cacheManager.set(key, data);
    return data;
  });

  // Registrar como petición en curso
  cacheManager.setPendingRequest(key, requestPromise);

  return await requestPromise;
};
