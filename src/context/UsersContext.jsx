import React, { createContext, useContext, useState, useCallback } from 'react';

const UsersContext = createContext();

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers debe ser usado dentro de un UsersProvider');
  }
  return context;
};

export const UsersProvider = ({ children }) => {
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [usersData, setUsersData] = useState({
    trabajadores: [],
    revendedores: [],
    usuarios: []
  });

  // Función para notificar que los datos de usuarios han cambiado
  const notifyUsersChanged = useCallback(() => {
    console.log('🔄 Notificando cambios en usuarios...');
    setUpdateTrigger(prev => prev + 1);
    
    // Limpiar cache de datos para forzar recarga
    setDashboardData(null);
    
    // Opcional: Emit evento personalizado para componentes que no usen el contexto
    window.dispatchEvent(new CustomEvent('usersChanged', {
      detail: { timestamp: Date.now() }
    }));
  }, []);

  // Función para notificar cambios específicos en trabajadores
  const notifyTrabajadoresChanged = useCallback(() => {
    console.log('🔄 Notificando cambios en trabajadores...');
    notifyUsersChanged();
    
    // Emitir evento específico
    window.dispatchEvent(new CustomEvent('trabajadoresChanged', {
      detail: { timestamp: Date.now() }
    }));
  }, [notifyUsersChanged]);

  // Función para notificar cambios específicos en revendedores
  const notifyRevendedoresChanged = useCallback(() => {
    console.log('🔄 Notificando cambios en revendedores...');
    notifyUsersChanged();
    
    // Emitir evento específico
    window.dispatchEvent(new CustomEvent('revendedoresChanged', {
      detail: { timestamp: Date.now() }
    }));
  }, [notifyUsersChanged]);

  // Actualizar datos en cache
  const updateUsersData = useCallback((newData) => {
    setUsersData(prev => ({
      ...prev,
      ...newData
    }));
  }, []);

  // Actualizar datos del dashboard en cache
  const updateDashboardData = useCallback((newData) => {
    setDashboardData(newData);
  }, []);

  const value = {
    // Estados
    updateTrigger,
    dashboardData,
    usersData,
    
    // Funciones de notificación
    notifyUsersChanged,
    notifyTrabajadoresChanged,
    notifyRevendedoresChanged,
    
    // Funciones de actualización de datos
    updateUsersData,
    updateDashboardData
  };

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  );
};

export default UsersContext;
