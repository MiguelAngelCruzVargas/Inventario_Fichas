// Utilidad para manejo de localStorage (solo para preferencias, no para auth)
class StorageService {
  // Obtener item del localStorage
  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error al obtener ${key} del localStorage:`, error);
      return null;
    }
  }

  // Guardar item en localStorage
  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error al guardar ${key} en localStorage:`, error);
    }
  }

  // Remover item del localStorage
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error al remover ${key} del localStorage:`, error);
    }
  }

  // Limpiar todo el localStorage
  clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error al limpiar localStorage:', error);
    }
  }

  // ⚠️ MÉTODOS OBSOLETOS - Ya no se usan para auth
  // Se mantienen para compatibilidad temporal

  getToken() {
    console.warn('getToken() es obsoleto - ahora se usan cookies httpOnly');
    return null;
  }

  setToken(token) {
    console.warn('setToken() es obsoleto - ahora se usan cookies httpOnly');
  }

  removeToken() {
    console.warn('removeToken() es obsoleto - ahora se usan cookies httpOnly');
  }

  getUser() {
    console.warn('getUser() es obsoleto - obtener del contexto de autenticación');
    return null;
  }

  setUser(user) {
    console.warn('setUser() es obsoleto - ya no se almacenan datos de usuario');
  }

  removeUser() {
    console.warn('removeUser() es obsoleto - ya no se almacenan datos de usuario');
  }

  clearAuth() {
    console.warn('clearAuth() es obsoleto - el backend maneja la autenticación');
  }

  // Limpiar solo datos de la aplicación (mantener preferencias)
  clearAll() {
    const keysToKeep = ['theme', 'language', 'preferences']; 
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        this.removeItem(key);
      }
    });
  }

  // Obtener configuración de la app
  getAppConfig() {
    return this.getItem('app_config') || {
      theme: 'light',
      language: 'es'
    };
  }

  // Guardar configuración de la app
  setAppConfig(config) {
    this.setItem('app_config', config);
  }

  // Gestión de cache temporal (útil para datos no críticos)
  setCache(key, data, ttl = 3600000) { // 1 hora por defecto
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl
    };
    this.setItem(`cache_${key}`, cacheData);
  }

  getCache(key) {
    const cacheData = this.getItem(`cache_${key}`);
    if (!cacheData) return null;

    const { data, timestamp, ttl } = cacheData;
    const isExpired = Date.now() - timestamp > ttl;

    if (isExpired) {
      this.removeItem(`cache_${key}`);
      return null;
    }

    return data;
  }

  clearCache() {
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.startsWith('cache_')) {
        this.removeItem(key);
      }
    });
  }
}

export const storageService = new StorageService();
