import { useState } from 'react';
import { useAuth as useAuthContext } from '@context/AuthContext';

export function useAuth() {
  const authContext = useAuthContext();
  const [loading, setLoading] = useState(false);

  // Estados derivados del context
  const isAuthenticated = authContext.isAuthenticated;
  const user = authContext.user;
  const isAdmin = user?.tipo_usuario === 'admin';
  const isRevendedor = user?.tipo_usuario === 'revendedor';
  const isTrabajador = user?.tipo_usuario === 'trabajador';

  // Login
  const login = async (credentials) => {
    setLoading(true);
    try {
      const result = await authContext.login(credentials);
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Error de autenticación' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setLoading(true);
    try {
      authContext.logout();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Forzar logout local incluso si hay error
      authContext.logout();
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  // Verificar si puede acceder a una ruta
  const canAccessRoute = (route) => {
    if (!isAuthenticated) return false;

    const routePermissions = {
      '/admin': ['admin'],
      '/admin/dashboard': ['admin'],
      '/admin/entregas': ['admin'],
      '/admin/reportes': ['admin'],
      '/admin/tareas': ['admin'],
      '/admin/corte-caja': ['admin'],
      '/admin/stock': ['admin'],
      '/revendedor': ['admin', 'revendedor'],
      '/revendedor/vista': ['admin', 'revendedor'],
      '/trabajador': ['admin', 'trabajador'],
      '/trabajador/vista': ['admin', 'trabajador']
    };

    const allowedRoles = routePermissions[route];
    if (!allowedRoles) return true; // Ruta pública

    return allowedRoles.includes(user?.tipo_usuario);
  };

  return {
    // Estados
    isAuthenticated,
    user,
    loading: loading || authContext.loading,
    isAdmin,
    isRevendedor,
    isTrabajador,
    
    // Métodos
    login,
    logout,
    canAccessRoute,

    // Getters útiles
    get userDisplayName() {
      return user?.username || 'Usuario';
    },

    get userRole() {
      return user?.tipo_usuario || 'guest';
    },

    get userRoleDisplay() {
      const roles = {
        admin: 'Administrador',
        revendedor: 'Revendedor',
        trabajador: 'Trabajador'
      };
      return roles[user?.tipo_usuario] || 'Invitado';
    }
  };
}
