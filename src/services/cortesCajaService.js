import { apiClient } from './apiClient';

// Servicio para manejar cortes de caja
export const cortesCajaService = {
  // Obtener historial de cortes de caja
  obtenerHistorial: async (params = {}, retryCount = 0) => {
    const { limit = 50, offset = 0 } = params;
    const maxRetries = 3;
    try {
      const response = await apiClient.get(`/cortes-caja/historial?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 429 && retryCount < maxRetries) {
        const delay = (retryCount + 1) * 500; // backoff lineal
        console.warn(`⏳ Historial cortes 429 - reintentando en ${delay}ms (intento ${retryCount + 2}/${maxRetries + 1})`);
        await new Promise(r => setTimeout(r, delay));
        return await cortesCajaService.obtenerHistorial(params, retryCount + 1);
      }
      console.error('Error al obtener historial de cortes:', error);
      throw error;
    }
  },

  // Registrar un abono parcial para un corte
  abonarCorte: async (id, { monto, nota }) => {
    try {
      const response = await apiClient.post(`/cortes-caja/${id}/abonar`, { monto, nota });
      return response.data;
    } catch (error) {
      console.error('Error al abonar corte:', error);
      throw error;
    }
  },

  // Listar abonos de un corte
  obtenerAbonos: async (id) => {
    try {
      const response = await apiClient.get(`/cortes-caja/${id}/abonos`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener abonos del corte:', error);
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
