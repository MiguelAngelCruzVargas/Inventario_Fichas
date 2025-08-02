import { apiClient } from './apiClient';

// Servicio para manejar cortes de caja
export const cortesCajaService = {
  // Obtener historial de cortes de caja
  obtenerHistorial: async (params = {}) => {
    try {
      const { limit = 50, offset = 0 } = params;
      const response = await apiClient.get(`/cortes-caja/historial?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener historial de cortes:', error);
      throw error;
    }
  },

  // Guardar un nuevo corte de caja
  guardarCorte: async (datosCorte) => {
    try {
      const response = await apiClient.post('/cortes-caja', datosCorte);
      return response.data;
    } catch (error) {
      console.error('Error al guardar corte de caja:', error);
      throw error;
    }
  },

  // Obtener un corte específico por ID
  obtenerCorte: async (id) => {
    try {
      const response = await apiClient.get(`/cortes-caja/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener corte:', error);
      throw error;
    }
  },

  // Eliminar un corte de caja (solo admin)
  eliminarCorte: async (id) => {
    try {
      const response = await apiClient.delete(`/cortes-caja/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar corte:', error);
      throw error;
    }
  },

  // Obtener estadísticas de cortes de caja
  obtenerEstadisticas: async (params = {}) => {
    try {
      const { fecha_desde, fecha_hasta } = params;
      let url = '/cortes-caja/estadisticas/resumen';
      
      const queryParams = new URLSearchParams();
      if (fecha_desde) queryParams.append('fecha_desde', fecha_desde);
      if (fecha_hasta) queryParams.append('fecha_hasta', fecha_hasta);
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  },

  // Obtener mis cortes de caja (para revendedores)
  obtenerMisCortes: async () => {
    try {
      const response = await apiClient.get('/cortes-caja/mis-cortes');
      return response.data;
    } catch (error) {
      console.error('Error al obtener mis cortes:', error);
      throw error;
    }
  }
};

export default cortesCajaService;
