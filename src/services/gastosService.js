import { apiHelpers } from './apiClient';

export const gastosService = {
  listar: async ({ periodo, pagado, page = 1, limit = 10, fecha_desde, fecha_hasta, tipo } = {}) => {
    const qs = new URLSearchParams();
    if (periodo) qs.set('periodo', periodo);
    if (typeof pagado !== 'undefined') qs.set('pagado', pagado ? '1' : '0');
    if (page) qs.set('page', String(page));
    if (limit) qs.set('limit', String(limit));
    if (fecha_desde) qs.set('fecha_desde', fecha_desde);
    if (fecha_hasta) qs.set('fecha_hasta', fecha_hasta);
    if (tipo && tipo !== 'todos') qs.set('tipo', tipo);
    const url = qs.toString() ? `/gastos?${qs}` : '/gastos';
    const res = await apiHelpers.get(url);
    return { items: res?.items || [], pagination: res?.pagination || { page, limit, total: (res?.items || []).length, totalPages: 1 } };
  },
  crear: async ({ tipo, persona, monto, motivo }) => {
    return await apiHelpers.post('/gastos', { tipo, persona, monto, motivo });
  },
  resumen: async ({ periodo, fecha_desde, fecha_hasta, tipo } = {}) => {
    const qs = new URLSearchParams();
    if (periodo) qs.set('periodo', periodo);
    if (fecha_desde) qs.set('fecha_desde', fecha_desde);
    if (fecha_hasta) qs.set('fecha_hasta', fecha_hasta);
    if (tipo && tipo !== 'todos') qs.set('tipo', tipo);
    const url = qs.toString() ? `/gastos/resumen?${qs}` : '/gastos/resumen';
    return await apiHelpers.get(url);
  },
  exportCsv: async ({ periodo, pagado, fecha_desde, fecha_hasta, tipo } = {}) => {
    const qs = new URLSearchParams();
    if (periodo) qs.set('periodo', periodo);
    if (typeof pagado !== 'undefined') qs.set('pagado', pagado ? '1' : '0');
    if (fecha_desde) qs.set('fecha_desde', fecha_desde);
    if (fecha_hasta) qs.set('fecha_hasta', fecha_hasta);
    if (tipo && tipo !== 'todos') qs.set('tipo', tipo);
    const url = qs.toString() ? `/gastos/export?${qs}` : '/gastos/export';
    // Pedimos como blob para descargar correctamente
    const res = await fetch(`/api${url}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Error exportando CSV');
    const blob = await res.blob();
    return blob;
  },
  exportXlsx: async ({ periodo, pagado, fecha_desde, fecha_hasta, tipo } = {}) => {
    const qs = new URLSearchParams();
    if (periodo) qs.set('periodo', periodo);
    if (typeof pagado !== 'undefined') qs.set('pagado', pagado ? '1' : '0');
    if (fecha_desde) qs.set('fecha_desde', fecha_desde);
    if (fecha_hasta) qs.set('fecha_hasta', fecha_hasta);
    if (tipo && tipo !== 'todos') qs.set('tipo', tipo);
    // Indicamos formato xlsx
    qs.set('formato', 'xlsx');
    const url = `/gastos/export?${qs.toString()}`;
    const res = await fetch(`/api${url}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Error exportando Excel');
    const blob = await res.blob();
    return blob;
  },
  pagar: async (id) => {
    return await apiHelpers.post(`/gastos/${id}/pagar`, {});
  },
  eliminar: async (id) => {
    return await apiHelpers.delete(`/gastos/${id}`);
  }
};
