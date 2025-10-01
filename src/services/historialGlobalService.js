import { apiClient } from './apiClient';

const historialGlobalService = {
  listar: async (params = {}) => {
    const res = await apiClient.get('/reportes/historial-global', { params });
    return res.data; // { page, pageSize, total, items }
  }
};

export default historialGlobalService;
