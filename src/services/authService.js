import { apiClient } from './apiClient';
import { getUserFriendlyMessage, conditionalLog } from '@utils/errorHandler';

class AuthService {
  constructor() {
    // No más localStorage, todo se maneja en el backend con cookies httpOnly
    this.sessionCheckInterval = null;
    this.expirationWarningShown = false;
  }

  // Métodos checkAdminExists y detectRole se definen más abajo para evitar duplicados

  // Login
  async login(credentials) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      
      // El backend setea cookies httpOnly automáticamente
      // Guardar información de expiración para monitoreo
      if (response.data.expires_at) {
        this.setupSessionMonitoring(new Date(response.data.expires_at));
      }
      
      return {
        user: response.data.user,
        token: response.data.access_token, // Solo para referencia, no se almacena
        expiresAt: response.data.expires_at,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      // Evitar logs ruidosos para errores esperados (401 credenciales inválidas)
      const status = error.response?.status;
      if (status !== 401) {
        // Log compacto y solo cuando no es 401
        conditionalLog.warn('Login fallido no esperado:', {
          status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          method: error.config?.method
        });
      }
      
      // Usar mensaje amigable centralizado
      throw new Error(getUserFriendlyMessage(error));
    }
  }

  // Configurar monitoreo de sesión
  setupSessionMonitoring(expiresAt) {
    // Limpiar monitoreo anterior si existe
    this.clearSessionMonitoring();
    
    const checkSession = () => {
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      // Mostrar advertencia 5 minutos antes de expirar
      if (timeUntilExpiry <= 5 * 60 * 1000 && timeUntilExpiry > 0 && !this.expirationWarningShown) {
        this.showExpirationWarning();
        this.expirationWarningShown = true;
      }
      
      // Si ya expiró, hacer logout automático
      if (timeUntilExpiry <= 0) {
        this.handleSessionExpired();
        return;
      }
    };
    
    // Verificar cada 30 segundos
    this.sessionCheckInterval = setInterval(checkSession, 30000);
    
    // Verificar inmediatamente
    checkSession();
  }

  // Limpiar monitoreo de sesión
  clearSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    this.expirationWarningShown = false;
  }

  // Mostrar advertencia de expiración
  showExpirationWarning() {
    // Dispatch custom event para que el componente principal lo maneje
    window.dispatchEvent(new CustomEvent('sessionExpiring', {
      detail: { message: 'Tu sesión expirará en 5 minutos. ¿Deseas renovarla?' }
    }));
  }

  // Manejar sesión expirada
  handleSessionExpired() {
    this.clearSessionMonitoring();
    
    // Dispatch custom event para logout automático
    window.dispatchEvent(new CustomEvent('sessionExpired', {
      detail: { message: 'Tu sesión ha expirado. Serás redirigido al login.' }
    }));
  }

  // Logout
  async logout() {
    try {
      // Limpiar monitoreo de sesión
      this.clearSessionMonitoring();
      
      // El backend limpia las cookies httpOnly
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Solo log en desarrollo, no es crítico si falla
      conditionalLog.error('Logout error:', error);
      // No importa si falla, igual hacemos logout local
    }
  }

  // Obtener usuario actual
  async getCurrentUser() {
    try {
      // El backend verifica automáticamente las cookies
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      // Si es 401, es normal - no hay sesión activa (silencioso)
      if (error.response?.status === 401) {
        return null;
      }
      
      // Solo log otros errores en desarrollo (excluyendo errores de red)
      if (error.code !== 'ERR_NETWORK') {
        conditionalLog.error('Get current user error:', error);
      }
      
      return null;
    }
  }

  // Cambiar contraseña
  async changePassword(oldPassword, newPassword) {
    try {
      const response = await apiClient.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw new Error(error.response?.data?.detail || 'Error al cambiar contraseña');
    }
  }

  // Verificar permisos (ahora basado en el usuario pasado como parámetro)
  hasPermission(permission, user) {
    if (!user) return false;

    // Admin tiene todos los permisos
    if (user.tipo_usuario === 'admin') return true;

    // Mapeo de permisos por tipo de usuario
    const permissions = {
      revendedor: [
        'view_own_inventory',
        'view_own_sales',
        'create_sale',
        'view_own_profile'
      ],
      trabajador: [
        'view_inventory',
        'create_delivery',
        'view_sales',
        'create_sale'
      ],
      admin: [
        'view_all',
        'create_all',
        'update_all',
        'delete_all',
        'manage_users',
        'manage_inventory',
        'view_reports'
      ]
    };

    const userPermissions = permissions[user.tipo_usuario] || [];
    return userPermissions.includes(permission);
  }

  // Verificar roles (con usuario pasado como parámetro)
  isAdmin(user) {
    return user?.tipo_usuario === 'admin';
  }

  isRevendedor(user) {
    return user?.tipo_usuario === 'revendedor';
  }

  isTrabajador(user) {
    return user?.tipo_usuario === 'trabajador';
  }

  // Verificar si existe admin
  async checkAdminExists() {
    try {
      const res = await apiClient.get('/auth/admin-exists');
      return res; // ya es data por apiHelpers, pero aquí usamos apiClient directo: apiClient.get devuelve response; arriba usamos apiClient, mantener consistente
    } catch (error) {
      conditionalLog.error('checkAdminExists error:', error);
      throw error;
    }
  }

  // Detectar rol por username
  async detectRole(username) {
    try {
      const res = await apiClient.get(`/auth/detect-role`, { params: { username } });
      return res; // idem
    } catch (error) {
      if (error.response?.status === 404) return null;
      conditionalLog.error('detectRole error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
