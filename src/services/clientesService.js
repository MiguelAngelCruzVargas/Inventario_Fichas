import { apiClient } from './apiClient';

class ClientesService {
  async listar({ tipo, activo } = {}) {
    const params = {};
    if (tipo) params.tipo = tipo; // 'servicio' | 'ocasional'
    if (activo !== undefined) params.activo = activo ? '1' : '0';
    const res = await apiClient.get('/clientes', { params });
    return res.data;
  }

  async crear(payload) {
    const res = await apiClient.post('/clientes', payload);
    return res.data;
  }

  async actualizar(id, payload) {
    const res = await apiClient.put(`/clientes/${id}`, payload);
    return res.data;
  }

  async eliminar(id) {
    const res = await apiClient.delete(`/clientes/${id}`);
    return res.data;
  }

  async toggleActivo(id) {
    const res = await apiClient.patch(`/clientes/${id}/toggle-activo`);
    return res.data;
  }
}

export default new ClientesService();
