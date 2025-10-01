import { apiClient } from './apiClient';

export const catalogoService = {
  async listarEntidades({ includeInactive = false, tipo } = {}) {
    const params = {};
    if (includeInactive) params.includeInactive = 1;
    if (tipo) params.tipo = tipo;
    const res = await apiClient.get('/catalogo/entidades', { params });
    return res.data || res; // compat: apiClient returns response; our helper returns data
  }
};
