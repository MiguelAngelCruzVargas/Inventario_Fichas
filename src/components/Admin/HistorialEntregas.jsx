// HistorialEntregas.jsx - Historial detallado de entregas a revendedores
import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Filter, ChevronLeft, ChevronRight, Download, LayoutGrid, List } from 'lucide-react';
import { fichasService } from '@services/fichasService';

const formatDateTime = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('es-MX')} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
};

const number = (n) => new Intl.NumberFormat('es-MX').format(Number(n || 0));
const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));

const HistorialEntregas = () => {
  const [data, setData] = useState({ items: [], page: 1, pageSize: 25, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches ? 'table' : 'cards'));

  const [filters, setFilters] = useState({
    revendedor: '',
    revendedor_id: '',
    desde: '',
    hasta: '',
    page: 1,
    pageSize: 25
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || 25))), [data.total, data.pageSize]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fichasService.obtenerHistorialEntregas(filters);
      setData(res);
    } catch (e) {
      console.error('Error cargando historial:', e);
      setError('No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.pageSize]);

  const onChangeFilter = (field, value) => setFilters((f) => ({ ...f, [field]: value, page: 1 }));

  const exportCSV = () => {
  const headers = ['Fecha', 'Hora', 'Revendedor', 'Tipo Ficha', 'Cantidad', 'Precio Unitario', 'Subtotal', 'Movimiento', 'Usuario'];
    const rows = data.items.map((i) => {
      const d = i.fecha_entrega ? new Date(i.fecha_entrega) : null;
      const fecha = d ? d.toLocaleDateString('es-MX') : '';
      const hora = d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
      return [
        fecha,
        hora,
        i.revendedor_nombre || '',
        i.tipo_ficha_nombre || '',
        i.cantidad || 0,
        i.precio_unitario ?? 0,
        Number(i.cantidad || 0) * Number(i.precio_unitario || 0),
        i.tipo_movimiento || '',
        i.usuario_entrega || ''
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => (typeof v === 'string' && v.includes(',')) ? `"${v}"` : v).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `historial_entregas_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Historial de Entregas</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="inline-flex rounded-lg border bg-white overflow-hidden w-full sm:w-auto">
            <button onClick={() => setViewMode('cards')} className={`flex-1 inline-flex items-center gap-2 px-3 py-2 text-sm ${viewMode==='cards' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
              <LayoutGrid className="w-4 h-4" /> Tarjetas
            </button>
            <button onClick={() => setViewMode('table')} className={`flex-1 inline-flex items-center gap-2 px-3 py-2 text-sm border-l ${viewMode==='table' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
              <List className="w-4 h-4" /> Tabla
            </button>
          </div>
          <button onClick={exportCSV} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm sm:text-base">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">Revendedor</label>
            <input type="text" value={filters.revendedor} onChange={(e)=>onChangeFilter('revendedor', e.target.value)} placeholder="Ej: Juan Pérez" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">Desde</label>
            <input type="date" value={filters.desde} onChange={(e)=>onChangeFilter('desde', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">Hasta</label>
            <input type="date" value={filters.hasta} onChange={(e)=>onChangeFilter('hasta', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
          <div className="text-xs sm:text-sm text-gray-500 inline-flex items-center gap-2"><Filter className="w-4 h-4" /> Usa filtros y cambia de página</div>
          <button onClick={fetchData} className="w-full sm:w-auto px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Buscar</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Cards view */}
        {viewMode === 'cards' && (
          <div className="p-3">
            {loading ? (
              <div className="py-6 text-center text-gray-500">Cargando...</div>
            ) : error ? (
              <div className="py-6 text-center text-red-600">{error}</div>
            ) : data.items.length === 0 ? (
              <div className="py-6 text-center text-gray-500">Sin resultados</div>
            ) : (
              <div className="space-y-3">
                {data.items.map((item) => {
                  const [fecha, hora] = formatDateTime(item.fecha_entrega).split(' ');
                  return (
                    <div key={item.id} className="rounded-lg border p-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="font-medium text-gray-700">{fecha}</span>
                            <span className="text-gray-400">•</span>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{hora}</span>
                          </div>
                          <div className="mt-1 font-semibold text-gray-900 truncate max-w-[220px]">{item.revendedor_nombre}</div>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 capitalize whitespace-nowrap">{item.tipo_movimiento}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                        <span className="px-2 py-0.5 rounded bg-gray-100">{item.tipo_ficha_nombre}</span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 hidden sm:inline max-w-[160px] truncate" title={item.usuario_entrega}>{item.usuario_entrega}</span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 items-end">
                        <div className="text-[11px] text-gray-500">Cantidad × Precio</div>
                        <div className="text-right text-[11px] text-gray-500">Subtotal</div>
                        <div className="text-base leading-6 font-semibold">{number(item.cantidad)} × <span className="font-medium">{money(item.precio_unitario)}</span></div>
                        <div className="text-right text-base leading-6 font-bold text-gray-900">{money(item.subtotal)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Table view */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm border-separate border-spacing-0">
            <thead className="bg-gray-50 text-gray-700">
              <tr className="border-b border-gray-300">
                <th className="px-2 sm:px-3 py-2 text-center whitespace-nowrap">Fecha</th>
                <th className="px-2 sm:px-3 py-2 text-center border-l border-gray-200 whitespace-nowrap hidden sm:table-cell">Hora</th>
                <th className="px-2 sm:px-3 py-2 text-center border-l border-gray-200">Revendedor</th>
                <th className="px-2 sm:px-3 py-2 text-center border-l border-gray-200 hidden md:table-cell">Tipo</th>
                <th className="px-2 sm:px-3 py-2 text-center border-l border-gray-200">Cantidad</th>
                <th className="px-2 sm:px-3 py-2 text-center border-l border-gray-200 hidden md:table-cell">Precio Unit.</th>
                <th className="px-2 sm:px-3 py-2 text-center border-l border-gray-200">Subtotal</th>
                <th className="px-2 sm:px-3 py-2 text-center border-l border-gray-200 hidden md:table-cell">Movimiento</th>
                <th className="px-2 sm:px-3 py-2 text-center border-l border-gray-200 hidden lg:table-cell">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="px-3 py-6 text-center text-gray-500">Cargando...</td></tr>
              ) : error ? (
                <tr><td colSpan="9" className="px-3 py-6 text-center text-red-600">{error}</td></tr>
              ) : data.items.length === 0 ? (
                <tr><td colSpan="9" className="px-3 py-6 text-center text-gray-500">Sin resultados</td></tr>
              ) : (
                 data.items.map(item => (
                   <tr key={item.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                    <td className="px-2 sm:px-3 py-2 text-center align-middle whitespace-nowrap">{formatDateTime(item.fecha_entrega).split(' ')[0]}</td>
                    <td className="px-2 sm:px-3 py-2 text-center align-middle border-l border-gray-200 whitespace-nowrap hidden sm:table-cell">{formatDateTime(item.fecha_entrega).split(' ')[1]}</td>
                    <td className="px-2 sm:px-3 py-2 text-center align-middle border-l border-gray-200">
                      <span className="block max-w-[140px] sm:max-w-none truncate">{item.revendedor_nombre}</span>
                    </td>
                    <td className="px-2 sm:px-3 py-2 text-center align-middle border-l border-gray-200 hidden md:table-cell">{item.tipo_ficha_nombre}</td>
                    <td className="px-2 sm:px-3 py-2 text-center align-middle border-l border-gray-200 font-medium">{number(item.cantidad)}</td>
                    <td className="px-2 sm:px-3 py-2 text-center align-middle border-l border-gray-200 hidden md:table-cell">{money(item.precio_unitario)}</td>
                    <td className="px-2 sm:px-3 py-2 text-center align-middle border-l border-gray-200 font-semibold">{money(item.subtotal)}</td>
                    <td className="px-2 sm:px-3 py-2 text-center align-middle border-l border-gray-200 capitalize hidden md:table-cell">{item.tipo_movimiento}</td>
                    <td className="px-2 sm:px-3 py-2 text-center align-middle border-l border-gray-200 hidden lg:table-cell">
                      <span className="inline-block max-w-[140px] truncate align-middle" title={item.usuario_entrega}>{item.usuario_entrega}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        )}
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border-t bg-gray-50 text-xs sm:text-sm">
          <div className="text-center sm:text-left">Mostrando {data.items.length} de {data.total} registros</div>
          <div className="flex items-center gap-2">
            <button disabled={filters.page<=1} onClick={()=>setFilters(f=>({...f, page: Math.max(1, f.page-1)}))} className="px-2 py-1 rounded border bg-white disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
            <span className="whitespace-nowrap">Página {data.page} de {totalPages}</span>
            <button disabled={filters.page>=totalPages} onClick={()=>setFilters(f=>({...f, page: f.page+1}))} className="px-2 py-1 rounded border bg-white disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
            <select value={filters.pageSize} onChange={(e)=>setFilters(f=>({...f, pageSize: parseInt(e.target.value)||25, page:1}))} className="ml-2 border rounded px-2 py-1 text-sm">
              {[10,25,50,100].map(s=> <option key={s} value={s}>{s}/página</option>)}
            </select>
          </div>
        </div>
  </div>
  );
};

export default HistorialEntregas;
