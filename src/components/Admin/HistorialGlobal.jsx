import React, { useEffect, useMemo, useState } from 'react';
import { historialGlobalService } from '@services';
import { Download, Filter, ChevronLeft, ChevronRight, Calendar, Clock, LayoutGrid, List } from 'lucide-react';

const number = (n) => new Intl.NumberFormat('es-MX').format(Number(n || 0));
const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));
const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    const d = value.includes('T') ? new Date(value) : new Date(value.replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(value).slice(0,19).replace('T',' ');
    return d.toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  } catch {
    return String(value).slice(0,19).replace('T',' ');
  }
};

const HistorialGlobal = () => {
  const [data, setData] = useState({ items: [], page: 1, pageSize: 25, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches ? 'table' : 'cards'));
  const [filters, setFilters] = useState({ tipo: '', q: '', desde: '', hasta: '', page: 1, pageSize: 25 });

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || 25))), [data.total, data.pageSize]);
  const hasPeriodo = useMemo(() => (Array.isArray(data.items) ? data.items.some(i => i && i.periodo_year && i.periodo_month) : false), [data.items]);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const res = await historialGlobalService.listar(filters);
      setData(res);
    } catch (e) {
      setError('No se pudo cargar');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filters.page, filters.pageSize]);

  const onChangeFilter = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  const exportCSV = () => {
    const headersBase = ['Fecha', 'Tipo evento', 'Entidad', 'Nombre', 'Tipo ficha', 'Cantidad', 'Precio unit', 'Monto'];
    const headers = hasPeriodo ? [...headersBase, 'Periodo'] : headersBase;
    const rows = data.items.map(i => {
      const base = [
        i.fecha || '',
        i.tipo_evento || '',
        i.entidad_tipo || '',
        i.entidad_nombre || '',
        i.tipo_ficha_nombre || '',
        i.cantidad || '',
        i.precio_unitario ?? '',
        i.monto ?? ''
      ];
      if (hasPeriodo) {
        base.push(i.periodo_year && i.periodo_month ? `${i.periodo_year}-${String(i.periodo_month).padStart(2,'0')}` : '');
      }
      return base;
    });
    const csv = [headers, ...rows].map(r => r.map(v => (typeof v === 'string' && v.includes(',')) ? '"'+v+'"' : v).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `historial_global_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Historial Global</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">Tipo</label>
            <select value={filters.tipo} onChange={e=>onChangeFilter('tipo', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="entrega">Entregas a revendedores</option>
              <option value="venta_ocasional">Ventas a ocasionales</option>
              <option value="pago_servicio">Pagos de servicio</option>
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">Buscar</label>
            <input value={filters.q} onChange={e=>onChangeFilter('q', e.target.value)} placeholder="Entidad o tipo de ficha" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">Desde</label>
            <input type="date" value={filters.desde} onChange={e=>onChangeFilter('desde', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">Hasta</label>
            <input type="date" value={filters.hasta} onChange={e=>onChangeFilter('hasta', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 w-full text-sm">Buscar</button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs sm:text-sm text-gray-500">
          <div className="inline-flex items-center gap-2"><Filter className="w-4 h-4" /> Usa filtros y paginación</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
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
                {data.items.map((i, idx) => {
                  const dt = formatDateTime(i.fecha);
                  const [fch, hr] = dt.includes(',') ? dt.split(',').map(s => s.trim()) : dt.split(' ');
                  const key = [i.tipo_evento || 'x', i.entidad_tipo || 'x', i.entidad_nombre || 'x', i.tipo_ficha_id ?? 'nf', i.fecha || idx].join('|');
                  return (
                    <div key={key} className="rounded-lg border p-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="font-medium text-gray-700">{fch}</span>
                            <span className="text-gray-400">•</span>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{hr}</span>
                          </div>
                          <div className="mt-1 text-[13px] font-semibold text-gray-900 capitalize">
                            {(i.tipo_evento || '').replace('_',' ')}
                          </div>
                          <div className="text-[12px] text-gray-700 truncate max-w-[240px]" title={`${(i.entidad_tipo || '').replace('_',' ')}: ${i.entidad_nombre || ''}`}>
                            {(i.entidad_tipo || '').replace('_',' ')}: <span className="font-medium">{i.entidad_nombre}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          {i.periodo_year && i.periodo_month ? (
                            <div className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 whitespace-nowrap">
                              {`${i.periodo_year}-${String(i.periodo_month).padStart(2,'0')}`}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                        {i.tipo_ficha_nombre ? <span className="px-2 py-0.5 rounded bg-gray-100">{i.tipo_ficha_nombre}</span> : null}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 items-end">
                        <div className="text-[11px] text-gray-500">Cantidad × Precio</div>
                        <div className="text-right text-[11px] text-gray-500">Monto</div>
                        <div className="text-base leading-6 font-semibold">{i.cantidad ? number(i.cantidad) : '-'}{i.precio_unitario != null ? ` × ${money(i.precio_unitario)}` : ''}</div>
                        <div className="text-right text-base leading-6 font-bold text-gray-900">{i.monto != null ? money(i.monto) : '-'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm border-separate border-spacing-0">
              <thead className="bg-gray-50 text-gray-700 text-left">
                <tr className="divide-x divide-gray-200">
                  <th className="px-2 sm:px-3 py-2">Fecha</th>
                  <th className="px-2 sm:px-3 py-2">Tipo</th>
                  <th className="px-2 sm:px-3 py-2">Entidad</th>
                  <th className="px-2 sm:px-3 py-2">Nombre</th>
                  <th className="px-2 sm:px-3 py-2">Tipo Ficha</th>
                  <th className="px-2 sm:px-3 py-2 text-right">Cantidad</th>
                  <th className="px-2 sm:px-3 py-2 text-right">Precio Unit.</th>
                  <th className="px-2 sm:px-3 py-2 text-right">Monto</th>
                  {hasPeriodo ? <th className="px-2 sm:px-3 py-2">Periodo</th> : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={hasPeriodo ? 9 : 8} className="px-3 py-6 text-center text-gray-500">Cargando...</td></tr>
                ) : error ? (
                  <tr><td colSpan={hasPeriodo ? 9 : 8} className="px-3 py-6 text-center text-red-600">{error}</td></tr>
                ) : data.items.length === 0 ? (
                  <tr><td colSpan={hasPeriodo ? 9 : 8} className="px-3 py-6 text-center text-gray-500">Sin resultados</td></tr>
                ) : (
                  data.items.map((i, idx) => {
                    const key = [
                      i.tipo_evento || 'x',
                      i.entidad_tipo || 'x',
                      i.entidad_nombre || 'x',
                      i.tipo_ficha_id ?? 'nf',
                      i.fecha || idx
                    ].join('|');
                    return (
                      <tr key={key} className="border-t border-gray-200 divide-x divide-gray-100 odd:bg-white even:bg-gray-50/20">
                        <td className="px-2 sm:px-3 py-2">{formatDateTime(i.fecha)}</td>
                        <td className="px-2 sm:px-3 py-2 capitalize">{(i.tipo_evento || '').replace('_',' ')}</td>
                        <td className="px-2 sm:px-3 py-2 capitalize">{(i.entidad_tipo || '').replace('_',' ')}</td>
                        <td className="px-2 sm:px-3 py-2"><span className="inline-block max-w-[160px] truncate align-middle" title={i.entidad_nombre}>{i.entidad_nombre}</span></td>
                        <td className="px-2 sm:px-3 py-2">{i.tipo_ficha_nombre || '-'}</td>
                        <td className="px-2 sm:px-3 py-2 text-right">{i.cantidad ? number(i.cantidad) : '-'}</td>
                        <td className="px-2 sm:px-3 py-2 text-right">{i.precio_unitario != null ? money(i.precio_unitario) : '-'}</td>
                        <td className="px-2 sm:px-3 py-2 text-right">{i.monto != null ? money(i.monto) : '-'}</td>
                        {hasPeriodo ? (
                          <td className="px-2 sm:px-3 py-2">{i.periodo_year && i.periodo_month ? `${i.periodo_year}-${String(i.periodo_month).padStart(2,'0')}` : ''}</td>
                        ) : null}
                      </tr>
                    );
                  })
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

export default HistorialGlobal;
