import { apiClient } from './apiClient';

const clientesPagosService = {
  // Cliente: obtener sus propios pagos
  getMisPagos: async () => {
    try {
      const response = await apiClient.get('/clientes-pagos/mis');
      return { success: true, pagos: response.data.pagos || [], resumen: response.data.resumen || {} };
    } catch (error) {
      console.error('Error al obtener mis pagos:', error);
      return { success: false, error: error.response?.data?.error || 'Error al obtener pagos' };
    }
  },
  // Admin/Trabajador
  getResumen: async () => {
    try {
      const res = await apiClient.get('/clientes-pagos/resumen');
      return { success: true, resumen: res.data.resumen || [] };
    } catch (e) {
      console.error('Error obteniendo resumen de pagos:', e);
      return { success: false, error: e.response?.data?.error || 'Error al obtener resumen' };
    }
  },
  getPagosCliente: async (clienteId) => {
    try {
      const res = await apiClient.get(`/clientes-pagos/cliente/${clienteId}`);
      return { success: true, pagos: res.data.pagos || [] };
    } catch (e) {
      console.error('Error obteniendo pagos del cliente:', e);
      return { success: false, error: e.response?.data?.error || 'Error al obtener pagos del cliente' };
    }
  },
  pagarPeriodo: async (id) => {
    try {
      const res = await apiClient.post(`/clientes-pagos/${id}/pagar`);
      return { success: true, message: res.data.message };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Error al registrar pago' };
    }
  },
  abonarPeriodo: async (id, monto) => {
    try {
      const res = await apiClient.post(`/clientes-pagos/${id}/abonar`, { monto });
      return { success: true, message: res.data.message, estado: res.data.estado, monto_pagado: res.data.monto_pagado };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Error al registrar abono' };
    }
  },
  suspenderPeriodo: async (id) => {
    try {
      const res = await apiClient.post(`/clientes-pagos/${id}/suspender`);
      return { success: true, message: res.data.message };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Error al suspender' };
    }
  },
  reactivarPeriodo: async (id) => {
    try {
      const res = await apiClient.post(`/clientes-pagos/${id}/reactivar`);
      return { success: true, message: res.data.message };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Error al reactivar' };
    }
  },
  generarPeriodos: async (clienteId, payload) => {
    try {
      const res = await apiClient.post(`/clientes-pagos/cliente/${clienteId}/generar`, payload);
      return { success: true, generados: res.data.generados };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Error al generar periodos' };
    }
  }
  , ensureNext: async () => {
    try {
      const res = await apiClient.post('/clientes-pagos/ensure-next');
      return { success: true, creados: res.data.creados };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Error al asegurar periodos' };
    }
  }
  , listPendientes: async (params = {}) => {
    try {
      const res = await apiClient.get('/clientes-pagos/pendientes', { params });
      return { success: true, items: res.data.items || [], pagination: res.data.pagination };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Error al obtener pendientes' };
    }
  }
  , initPeriodoCliente: async (clienteId) => {
    try {
      const res = await apiClient.post(`/clientes-pagos/cliente/${clienteId}/init`);
      return { success: true, message: res.data.message, periodo: res.data.periodo };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Error al inicializar periodo' };
    }
  }
};

export default clientesPagosService;
