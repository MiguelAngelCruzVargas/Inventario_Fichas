import { apiClient } from './apiClient';

const ventasOcasionalesService = {
  crear: async ({ cliente_id, tipo_ficha_id, cantidad, precio_unitario, observaciones }) => {
    try {
      const res = await apiClient.post('/ventas-ocasionales', { cliente_id, tipo_ficha_id, cantidad, precio_unitario, observaciones });
      return { success: true, venta: res.data.venta };
    } catch (e) {
      console.error('Error creando venta ocasional:', e);
      return { success: false, error: e.response?.data?.detail || e.response?.data?.error || 'Error al crear venta' };
    }
  },
  listar: async (params = {}) => {
    try {
      const res = await apiClient.get('/ventas-ocasionales', { params });
      return { success: true, ventas: res.data.ventas || [] };
    } catch (e) {
      console.error('Error listando ventas ocasionales:', e);
      return { success: false, error: e.response?.data?.error || 'Error al listar ventas' };
    }
  }
};

export default ventasOcasionalesService;
