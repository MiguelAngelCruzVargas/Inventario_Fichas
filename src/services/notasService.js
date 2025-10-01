import { apiClient } from './apiClient';

const notasService = {
  crear: async ({ titulo, contenido, revendedor_id, imagen, imagenes }) => {
    // imagenes: array de File (nuevo). imagen: legacy única.
    const multiple = Array.isArray(imagenes) && imagenes.length > 0;
    if (multiple || imagen) {
      const fd = new FormData();
      fd.append('titulo', titulo);
      fd.append('contenido', contenido);
      if (revendedor_id) fd.append('revendedor_id', revendedor_id);
      if (multiple) {
        imagenes.forEach(f => fd.append('imagenes[]', f));
      } else if (imagen) {
        fd.append('imagen', imagen);
      }
      const res = await apiClient.post('/notas', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data;
    }
    const res = await apiClient.post('/notas', { titulo, contenido, revendedor_id });
    return res.data;
  },
  listar: async ({ q, revendedor_id, usuario_id, page = 1, pageSize = 25 } = {}) => {
    const params = {};
    if (q) params.q = q;
    if (usuario_id) params.usuario_id = usuario_id;
    if (revendedor_id) params.revendedor_id = revendedor_id;
    params.page = page;
    params.pageSize = pageSize;
    const res = await apiClient.get('/notas', { params });
    return res.data; // { page, pageSize, total, items }
  },
  eliminar: async (id) => {
    const res = await apiClient.delete(`/notas/${id}`);
    return res.data;
  },
  cambiarEstado: async (id, estado) => {
    // estado: 'pendiente' | 'realizada'
    const res = await apiClient.patch(`/notas/${id}/estado`, { estado });
    return res.data;
  },
  actualizar: async (id, { titulo, contenido, imagen, imagenes }) => {
    const multiple = Array.isArray(imagenes) && imagenes.length > 0;
    if (multiple || imagen) {
      const fd = new FormData();
      if (titulo !== undefined) fd.append('titulo', titulo);
      if (contenido !== undefined) fd.append('contenido', contenido);
      if (multiple) {
        imagenes.forEach(f => fd.append('imagenes[]', f));
      } else if (imagen) {
        fd.append('imagen', imagen);
      }
      const res = await apiClient.put(`/notas/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data;
    }
    const payload = {};
    if (titulo !== undefined) payload.titulo = titulo;
    if (contenido !== undefined) payload.contenido = contenido;
    const res = await apiClient.put(`/notas/${id}`, payload);
    return res.data;
  }
};

export default notasService;
