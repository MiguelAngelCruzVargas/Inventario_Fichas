// Reportes.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Calendar, Download, BarChart2, TrendingUp, Users, Filter } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

// Simple chart via inline SVG to avoid adding deps (bar/line minimal)
function BarChart({ labels, values, color = '#3b82f6', height = 160 }) {
  const max = Math.max(1, ...values);
  const barWidth = labels.length ? (100 / labels.length) : 100;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-40">
      {values.map((v, i) => {
        const h = (v / max) * (height - 20);
        const x = i * barWidth;
        const y = height - h;
        return (
          <g key={i}>
            <rect x={x + 2} y={y} width={barWidth - 4} height={h} fill={color} rx="2" />
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ labels, values, color = '#10b981', height = 160 }) {
  const max = Math.max(1, ...values);
  const points = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * 100;
    const y = height - (v / max) * (height - 20);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-40">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

const Reportes = () => {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [revendedorId, setRevendedorId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (fechaDesde) params.append('fecha_desde', fechaDesde);
      if (fechaHasta) params.append('fecha_hasta', fechaHasta);
      if (revendedorId) params.append('revendedor_id', revendedorId);
      const res = await apiClient.get(`/reportes/resumen?${params.toString()}`);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append('fecha_desde', fechaDesde);
      if (fechaHasta) params.append('fecha_hasta', fechaHasta);
      if (revendedorId) params.append('revendedor_id', revendedorId);
      const res = await apiClient.get(`/reportes/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reporte_ventas.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  const porMes = useMemo(() => (data?.por_mes || []), [data]);
  const porSemana = useMemo(() => (data?.por_semana || []), [data]);
  const topTipos = useMemo(() => (data?.top_tipos || []), [data]);
  const topRev = useMemo(() => (data?.top_revendedores || []), [data]);
  const tot = data?.totales || { total_vendido: 0, total_admin: 0, total_revendedor: 0, total_unidades: 0 };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Reportes</h1>
              <p className="text-gray-500 mt-1">Ventas por periodo, top fichas/clientes y ganancias</p>
            </div>
          </div>
          <button onClick={exportCSV} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-4 border space-y-3">
          <div className="flex items-center gap-2 text-gray-700 font-medium"><Filter className="w-4 h-4"/>Filtros</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Desde</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 text-gray-400" />
                <input type="date" value={fechaDesde} onChange={e=>setFechaDesde(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg"/>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Hasta</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 text-gray-400" />
                <input type="date" value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg"/>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Revendedor (ID opcional)</label>
              <input type="number" value={revendedorId} onChange={e=>setRevendedorId(e.target.value)} className="w-full px-3 py-2 border rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="Ej. 3" />
            </div>
            <div className="flex items-end">
              <button onClick={fetchData} className="w-full px-3 py-2 bg-gray-900 hover:bg-black text-white rounded-lg">Aplicar</button>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-700">{error}</div>}
        {loading && <div className="p-3">Cargando…</div>}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border">
            <div className="text-gray-500 text-sm">Total Vendido</div>
            <div className="text-2xl font-bold text-gray-900">${Number(tot.total_vendido || 0).toLocaleString('es-MX')}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="text-gray-500 text-sm">Mi Ganancia (Admin)</div>
            <div className="text-2xl font-bold text-emerald-700">${Number(tot.total_admin || 0).toLocaleString('es-MX')}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="text-gray-500 text-sm">Para Revendedores</div>
            <div className="text-2xl font-bold text-amber-700">${Number(tot.total_revendedor || 0).toLocaleString('es-MX')}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="text-gray-500 text-sm">Unidades Vendidas</div>
            <div className="text-2xl font-bold text-gray-900">{Number(tot.total_unidades || 0).toLocaleString('es-MX')}</div>
          </div>
        </div>

        {/* Series */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-2 mb-2 text-gray-700 font-medium"><BarChart2 className="w-4 h-4"/>Ventas por Mes</div>
            <BarChart labels={porMes.map(x=>x.periodo)} values={porMes.map(x=>Number(x.total_vendido))} />
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-2 mb-2 text-gray-700 font-medium"><TrendingUp className="w-4 h-4"/>Ventas por Semana</div>
            <LineChart labels={porSemana.map(x=>x.periodo)} values={porSemana.map(x=>Number(x.total_vendido))} />
          </div>
        </div>

        {/* Top lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-2 mb-3 text-gray-700 font-medium"><BarChart2 className="w-4 h-4"/>Fichas más vendidas</div>
            <div className="space-y-2">
              {topTipos.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="text-gray-800">{t.tipo}</div>
                  <div className="text-gray-500">{Number(t.unidades).toLocaleString('es-MX')} u</div>
                </div>
              ))}
              {topTipos.length === 0 && <div className="text-gray-400 text-sm">Sin datos</div>}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-2 mb-3 text-gray-700 font-medium"><Users className="w-4 h-4"/>Clientes que más generan</div>
            <div className="space-y-2">
              {topRev.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="text-gray-800">{r.nombre}</div>
                  <div className="text-gray-500">${Number(r.total_vendido).toLocaleString('es-MX')}</div>
                </div>
              ))}
              {topRev.length === 0 && <div className="text-gray-400 text-sm">Sin datos</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;
