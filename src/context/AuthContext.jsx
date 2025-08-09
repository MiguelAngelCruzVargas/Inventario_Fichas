import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { conditionalLog } from '../utils/errorHandler';
import NavigationWarningModal from '../components/common/NavigationWarningModal';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionChanged, setSessionChanged] = useState(false);
  const [initialSessionCheck, setInitialSessionCheck] = useState(false); // Nueva bandera
  const [sessionExpiring, setSessionExpiring] = useState(false);
  
  // Estados para el modal de navegación
  const [navigationModal, setNavigationModal] = useState({
    isVisible: false,
    type: 'navigate',
    pendingAction: null
  });

  // Funciones para manejar el modal de navegación
  const showNavigationModal = (type, pendingAction) => {
    setNavigationModal({
      isVisible: true,
      type,
      pendingAction
    });
  };

  const hideNavigationModal = () => {
    setNavigationModal({
      isVisible: false,
      type: 'navigate',
      pendingAction: null
    });
  };

  const confirmNavigation = () => {
    const { pendingAction } = navigationModal;
    hideNavigationModal();
    
    if (pendingAction) {
      // Ejecutar la acción pendiente
      pendingAction();
    }
  };

  const cancelNavigation = () => {
    hideNavigationModal();
    // No hacer nada más - simplemente cancelar la navegación
    // El usuario permanece en la página actual
  };

  // Manejar eventos de expiración de sesión
  useEffect(() => {
    const handleSessionExpiring = (event) => {
      setSessionExpiring(true);
      
      // Auto-cerrar la advertencia después de 30 segundos si no se renueva
      setTimeout(() => {
        setSessionExpiring(false);
      }, 30000);
    };

    const handleSessionExpired = async (event) => {
      console.warn('🕒 Sesión expirada automáticamente');
      setSessionExpiring(false);
      
      // Hacer logout automático
      await logout();
      
      // Mostrar mensaje al usuario
      alert('Tu sesión ha expirado después de 2 horas de inactividad. Por favor, inicia sesión nuevamente.');
    };

    // Agregar listeners para eventos de sesión
    window.addEventListener('sessionExpiring', handleSessionExpiring);
    window.addEventListener('sessionExpired', handleSessionExpired);

    return () => {
      window.removeEventListener('sessionExpiring', handleSessionExpiring);
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
  }, []);

  // Función para renovar sesión
  const renewSession = async () => {
    try {
      setSessionExpiring(false);
      
      // Simplemente hacer una llamada a /auth/me para verificar que la sesión sigue activa
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser) {
        if (import.meta.env.DEV) console.log('✅ Sesión renovada exitosamente');
        return true;
      } else {
        throw new Error('Sesión no válida');
      }
    } catch (error) {
      console.error('❌ Error al renovar sesión:', error);
      await logout();
      return false;
    }
  };

  // Detectar cambios de sesión entre pestañas
  useEffect(() => {
    let intervalId;
    let isChecking = false; // Prevenir llamadas concurrentes
    let lastCheckTime = 0; // Prevenir llamadas muy frecuentes
    
    const checkSessionChanges = async () => {
      const now = Date.now();
      
      // Prevenir llamadas muy frecuentes (mínimo 10 segundos entre llamadas)
      if (!user || isChecking || !initialSessionCheck || (now - lastCheckTime) < 10000) return;
      
      isChecking = true;
      lastCheckTime = now;
      
      try {
        const currentUser = await authService.getCurrentUser();
        
        // Si el usuario cambió (diferente ID o tipo)
        if (currentUser && (
          currentUser.id !== user.id || 
          currentUser.tipo_usuario !== user.tipo_usuario ||
          currentUser.nombre_completo !== user.nombre_completo
        )) {
          
          // Verificar si es el mismo navegador/origen
          const isSameBrowser = window.localStorage.getItem('last_session_change') || '0';
          const timeDiff = now - parseInt(isSameBrowser);
          
          // Solo mostrar notificación si ha pasado más de 2 segundos desde el último cambio
          // Esto evita notificaciones spam por cookies compartidas
          if (timeDiff > 2000) {
            if (import.meta.env.DEV) console.log('🔄 Cambio de sesión detectado:', {
              anterior: { 
                id: user.id, 
                tipo: user.tipo_usuario, 
                nombre: user.nombre_completo 
              },
              actual: { 
                id: currentUser.id, 
                tipo: currentUser.tipo_usuario, 
                nombre: currentUser.nombre_completo 
              },
              navegador: 'Local - cookies compartidas',
              intervalo: `${timeDiff}ms desde último cambio`
            });
            
            setSessionChanged(true);
            // Marcar el tiempo del cambio
            window.localStorage.setItem('last_session_change', now.toString());
          }
          
          // Actualizar el usuario y el estado de autenticación
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Si hay error de autenticación, la sesión probablemente cambió a logout
        if (error.response?.status === 401) {
          setUser(null);
          setIsAuthenticated(false);
        }
        // Silenciar errores de red en desarrollo para evitar spam
        if (error.code !== 'ERR_NETWORK') {
          console.warn('Error verificando sesión:', error.message);
        }
      } finally {
        isChecking = false;
      }
    };

    if (isAuthenticated && user && initialSessionCheck) {
      // Solo iniciar el monitoreo después del check inicial
      // DESHABILITADO: Verificación automática de sesión para evitar rate limiting
      // Solo verificar en casos muy específicos si es necesario
      // const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
      
      // if (isDevelopment) {
      //   // Verificar cada 2 minutos (muy poco frecuente)
      //   intervalId = setInterval(checkSessionChanges, 120000);
      // }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, isAuthenticated]);

  // Verificar autenticación al cargar la app
  useEffect(() => {
    let isMounted = true; // Prevenir actualizaciones de estado si el componente se desmonta
    
    const initAuth = async () => {
      try {
        setLoading(true);
        // Solo verificar si el backend confirma que hay una sesión válida
        const userData = await authService.getCurrentUser();
        if (userData && isMounted) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Manejo silencioso de errores esperados
        if (error.response?.status === 401) {
          // 401 es normal - no hay sesión activa (no hacer log)
        } else if (error.code === 'ERR_NETWORK') {
          // Errores de red en desarrollo son comunes
          conditionalLog.info('Error de red al verificar autenticación (normal en desarrollo)');
        } else {
          // Solo otros errores inesperados
          conditionalLog.error('Error al verificar autenticación:', error);
        }
        
        // Si hay error, simplemente no está autenticado
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          // Marcar que ya se hizo la verificación inicial
          setInitialSessionCheck(true);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Solo ejecutar una vez al montar

  const login = async (credentials) => {
    try {
      setLoading(true);
  if (import.meta.env.DEV) console.log('🔐 Iniciando login con:', credentials.username);
      
      const response = await authService.login(credentials);
  if (import.meta.env.DEV) console.log('✅ Respuesta del login:', response);
      
      // Setear el estado inmediatamente
      setUser(response.user);
      setIsAuthenticated(true);
      // Marcar que ya se hizo una verificación inicial después del login
      setInitialSessionCheck(true);
      
  if (import.meta.env.DEV) console.log('👤 Usuario configurado:', response.user);
  if (import.meta.env.DEV) console.log('🔑 Estado autenticado:', true);
      
      // Configurar monitoreo de sesión si hay información de expiración
      if (response.expiresAt) {
  if (import.meta.env.DEV) console.log(`🕒 Sesión iniciada. Expira en: ${new Date(response.expiresAt).toLocaleString()}`);
      }
      
      return { success: true, user: response.user };
    } catch (error) {
      // Solo log en desarrollo para debugging
      conditionalLog.error('Error en login:', error);
      
      return { 
        success: false, 
        error: error.message || 'Error de autenticación' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Llamar al backend para invalidar la sesión
      await authService.logout();
    } catch (error) {
      // Solo log en desarrollo
      conditionalLog.error('Error en logout:', error);
    } finally {
      // Limpiar estado local independientemente del resultado
      setUser(null);
      setIsAuthenticated(false);
      setInitialSessionCheck(false); // Reset del flag al hacer logout
    }
  };

  const dismissSessionChangeNotification = () => {
    setSessionChanged(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    sessionChanged,
    sessionExpiring,
    navigationModal,
    login,
    logout,
    renewSession,
    dismissSessionChangeNotification,
    confirmNavigation,
    cancelNavigation
  };

  // DESACTIVADO: Protección contra cierre de ventana/pestaña
  // Esta funcionalidad puede ser molesta para los usuarios ya que también
  // se activa al recargar la página (F5, Ctrl+R)
  /*
  useEffect(() => {
    if (!isAuthenticated) return;

    // Solo prevenir cierre de ventana/pestaña, no navegación interna
    const handleBeforeUnload = (event) => {
      if (isAuthenticated) {
        // Para beforeunload, el navegador solo permite mostrar el mensaje nativo
        // No podemos mostrar modales personalizados aquí por limitaciones del navegador
        const message = '⚠️ Tienes una sesión activa. ¿Estás seguro de que quieres salir?';
        event.preventDefault();
        event.returnValue = message; // Para navegadores antiguos
        return message;
      }
    };

    // Solo agregar listener para beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated]);
  */

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Modal de advertencia de navegación */}
      <NavigationWarningModal
        isVisible={navigationModal.isVisible}
        navigationType={navigationModal.type}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </AuthContext.Provider>
  );
};
