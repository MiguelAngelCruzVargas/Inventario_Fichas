/**
 * Utilidades para manejo centralizado de errores
 */

// Tipos de errores que no necesitan logs (son esperados)
export const isExpectedError = (error) => {
  const status = error.response?.status;
  const url = error.config?.url;
  
  return [
    // 401 en endpoints de auth son normales
    (status === 401 && url?.includes('/auth/')),
    // Errores de red en desarrollo
    (error.code === 'ERR_NETWORK' && import.meta.env.DEV),
    // Timeouts en desarrollo
    (error.code === 'ECONNABORTED' && import.meta.env.DEV)
  ].some(condition => condition);
};

// Obtener mensaje de error amigable para el usuario
export const getUserFriendlyMessage = (error) => {
  const status = error.response?.status;
  const code = error.code;
  
  // Mensajes específicos por código de estado
  switch (status) {
    case 400:
      return error.response?.data?.detail || 'Datos inválidos';
    case 401:
      return 'Usuario o contraseña incorrectos';
    case 403:
      // Si es un error específico de eliminación de admin, usar el mensaje del backend
      if (error.response?.data?.error === 'ADMIN_DELETION_FORBIDDEN') {
        return error.response.data.message;
      }
      return error.response?.data?.message || 'No tienes permisos para realizar esta acción';
    case 404:
      return 'El recurso solicitado no fue encontrado';
    case 409:
      return error.response?.data?.detail || 'Conflicto con los datos existentes';
    case 422:
      return error.response?.data?.detail || 'Datos de entrada inválidos';
    case 500:
      return 'Error interno del servidor. Intenta nuevamente.';
    case 502:
    case 503:
    case 504:
      return 'El servidor no está disponible. Intenta más tarde.';
    default:
      break;
  }
  
  // Mensajes específicos por código de error
  switch (code) {
    case 'ERR_NETWORK':
      return 'No se puede conectar al servidor. Verifica tu conexión.';
    case 'ECONNABORTED':
      return 'La solicitud tardó demasiado. Intenta nuevamente.';
    case 'ERR_CANCELED':
      return 'La solicitud fue cancelada';
    default:
      break;
  }
  
  // Mensaje del backend si está disponible
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Mensaje genérico
  return error.message || 'Ha ocurrido un error inesperado';
};

// Logger condicional - solo en desarrollo
export const conditionalLog = {
  error: (message, ...args) => {
    if (import.meta.env.DEV) {
      console.error(message, ...args);
    }
  },
  warn: (message, ...args) => {
    if (import.meta.env.DEV) {
      console.warn(message, ...args);
    }
  },
  info: (message, ...args) => {
    if (import.meta.env.DEV) {
      console.info(message, ...args);
    }
  },
  debug: (message, ...args) => {
    if (import.meta.env.DEV) {
      console.debug(message, ...args);
    }
  }
};

// Manejar errores de API de forma centralizada
export const handleApiError = (error, context = '') => {
  // No hacer log si es un error esperado
  if (isExpectedError(error)) {
    return;
  }
  
  const errorInfo = {
    context,
    status: error.response?.status,
    code: error.code,
    message: error.response?.data?.detail || error.response?.data?.error || error.message,
    url: error.config?.url,
    method: error.config?.method?.toUpperCase()
  };
  
  conditionalLog.error(`API Error ${context ? `[${context}]` : ''}:`, errorInfo);
};

// Hook personalizado para manejo de errores en componentes
export const useErrorHandler = () => {
  const handleError = (error, context = '', showToast = false) => {
    handleApiError(error, context);
    const message = getUserFriendlyMessage(error);
    
    // Si se proporciona una función showToast, usarla
    if (showToast && typeof showToast === 'function') {
      showToast(message, 'Error');
    }
    
    return message;
  };
  
  return { handleError };
};

// Wrapper para manejar errores async de manera elegante
export const withErrorHandling = (asyncFn, options = {}) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      const message = getUserFriendlyMessage(error);
      
      if (options.onError) {
        options.onError(error, message);
      }
      
      if (options.showToast && typeof options.showToast === 'function') {
        options.showToast(message, 'Error');
      }
      
      if (options.rethrow !== false) {
        throw new Error(message);
      }
      
      return options.fallbackValue;
    }
  };
};
