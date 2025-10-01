// VistaClientesServicio.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { clientesPagosService } from '@services';

const VistaClientesServicio = ({ currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));
  const formatDate = (value) => {
    if (!value) return '-';
    try {
      const d = value.includes('T') ? new Date(value) : new Date(value + 'T00:00:00');
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString('es-MX');
    } catch { return value; }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    await clientesPagosService.ensureNext();
    const r = await clientesPagosService.getResumen();
    if (r.success) setResumen(r.resumen);
    else setError(r.error);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return resumen;
    return resumen.filter(r => (r.nombre_completo || '').toLowerCase().includes(term));
  }, [q, resumen]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Clientes de Servicio</h1>
          <div className="flex items-center gap-2">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar cliente" className="border px-3 py-2 rounded-lg" />
            <button onClick={load} className="px-3 py-2 rounded-lg bg-slate-100">Actualizar</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b font-medium">Resumen</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Próximo mes</th>
                  <th className="px-4 py-2">Vence</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const mes = r.periodo_month ? String(r.periodo_month).padStart(2,'0') : null;
                  const proximo = r.periodo_year && mes ? `${r.periodo_year}-${mes}` : 'Al día';
                  const estado = r.estado_calculado;
                  const isVencido = estado === 'vencido';
                  const deudaPrev = Number(r.deuda_prev || 0);
                  const aPagar = r.monto_a_pagar != null ? Number(r.monto_a_pagar) : (r.cuota_mensual || 0);
                  return (
                    <tr key={r.cliente_id} className={`border-t ${isVencido ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-2" title={r.nombre_completo}>{r.nombre_completo}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{proximo}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{r.fecha_vencimiento ? formatDate(r.fecha_vencimiento) : '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {estado === 'al_dia' && <span className="text-emerald-700">Al día</span>}
                        {estado === 'pendiente' && <span className="text-amber-700">Pendiente</span>}
                        {isVencido && <span className="text-red-700 font-semibold">Vencido</span>}
                        {deudaPrev > 0 && <span className="ml-2 text-xs text-red-700">(arrastre {money(deudaPrev)})</span>}
                      </td>
                      <td className="px-4 py-2 text-right">{aPagar ? money(aPagar) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {loading && <div className="p-3 text-sm text-gray-600">Cargando...</div>}
          {error && <div className="p-3 text-sm text-red-600">{error}</div>}
        </div>
      </main>
    </div>
  );
};

export default VistaClientesServicio;
