import { apiClient } from './apiClient';

export const tareasService = {
  // ========================
  // TRABAJADORES
  // ========================
  
  // Obtener todos los trabajadores
  obtenerTrabajadores: async () => {
    try {
      const response = await apiClient.get('/tareas/trabajadores');
      return {
        success: true,
        trabajadores: response.data.trabajadores || []
      };
    } catch (error) {
      console.error('Error al obtener trabajadores:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener trabajadores'
      };
    }
  },

  // Obtener trabajadores disponibles para asignación (solo activos)
  obtenerTrabajadoresDisponibles: async () => {
    try {
      const response = await apiClient.get('/tareas/trabajadores/disponibles');
      return {
        success: true,
        trabajadores: response.data.trabajadores || []
      };
    } catch (error) {
      console.error('Error al obtener trabajadores disponibles:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener trabajadores disponibles'
      };
    }
  },

  // Crear nuevo trabajador
  crearTrabajador: async (datos) => {
    try {
      const response = await apiClient.post('/tareas/trabajadores', datos);
      return {
        success: true,
        trabajador_id: response.data.trabajador_id,
        credenciales: response.data.credenciales,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error al crear trabajador:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear trabajador'
      };
    }
  },

  // Eliminar trabajador
  eliminarTrabajador: async (trabajadorId) => {
    try {
      const response = await apiClient.delete(`/tareas/trabajadores/${trabajadorId}`);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error al eliminar trabajador:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al eliminar trabajador'
      };
    }
  },

  // ========================
  // TAREAS
  // ========================
  
  // Obtener todas las tareas
  obtenerTareas: async () => {
    try {
      const response = await apiClient.get('/tareas');
      return {
        success: true,
        tareas: response.data.tareas || []
      };
    } catch (error) {
      console.error('Error al obtener tareas:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener tareas'
      };
    }
  },

  // Obtener mis tareas (para trabajadores)
  obtenerMisTareas: async () => {
    try {
      const response = await apiClient.get('/tareas/mis-tareas');
      return {
        success: true,
        tareas: response.data.tareas || []
      };
    } catch (error) {
      console.error('Error al obtener mis tareas:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener mis tareas'
      };
    }
  },

  // Obtener mis tareas (para revendedores)
  obtenerMisTareasRevendedor: async () => {
    try {
      const response = await apiClient.get('/tareas/mis-tareas-revendedor');
      return {
        success: true,
        tareas: response.data.tareas || []
      };
    } catch (error) {
      console.error('Error al obtener mis tareas como revendedor:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener mis tareas'
      };
    }
  },

  // Crear nueva tarea
  crearTarea: async (datos) => {
    try {
      const response = await apiClient.post('/tareas', datos);
      return {
        success: true,
        tarea: response.data.tarea,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error al crear tarea:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear tarea'
      };
    }
  },

  // Actualizar estado de tarea
  actualizarEstadoTarea: async (tareaId, estado, notas = '') => {
    try {
      const response = await apiClient.put(`/tareas/${tareaId}/estado`, {
        estado,
        notas
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error al actualizar estado de tarea:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar estado de tarea'
      };
    }
  },

  // Actualizar estado de mi tarea (para trabajadores)
  actualizarEstadoMiTarea: async (tareaId, estado, notas = '') => {
    try {
      const response = await apiClient.put(`/tareas/mis-tareas/${tareaId}/estado`, {
        estado,
        notas
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error al actualizar estado de mi tarea:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar estado de mi tarea'
      };
    }
  },

  // Eliminar tarea
  eliminarTarea: async (tareaId) => {
    try {
      const response = await apiClient.delete(`/tareas/${tareaId}`);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al eliminar tarea'
      };
    }
  },

  // Obtener estadísticas de tareas
  obtenerEstadisticas: async () => {
    try {
      const response = await apiClient.get('/tareas/estadisticas');
      return {
        success: true,
        estadisticas: response.data.estadisticas || {}
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener estadísticas'
      };
    }
  },

  // Enviar notificación a trabajador (simulada)
  enviarNotificacion: async (tareaId, mensaje) => {
    try {
      // Por ahora esto es una función simulada
      // En el futuro se podría implementar notificaciones reales (email, SMS, etc.)
      return {
        success: true,
        message: 'Notificación enviada exitosamente'
      };
    } catch (error) {
      console.error('Error al enviar notificación:', error);
      return {
        success: false,
        error: 'Error al enviar notificación'
      };
    }
  }
};

export default tareasService;
