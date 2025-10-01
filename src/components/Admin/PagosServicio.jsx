import React, { useEffect, useMemo, useState } from 'react';
import { clientesPagosService, clientesService } from '@services';

// Static class map to keep Tailwind from purging classes
const badgeColors = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  emerald: 'bg-emerald-100 text-emerald-700'
};
const Badge = ({ children, color = 'gray' }) => (
  <span className={`px-2 py-1 rounded text-xs font-medium ${badgeColors[color] || badgeColors.gray}`}>{children}</span>
);

const Modal = ({ open, onClose, children, title }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-3xl rounded-xl shadow-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const PagosServicio = () => {
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, cliente: null, pagos: [] });
  const [genForm, setGenForm] = useState({ desde: '', hasta: '', monto: '' });
  const [abonoModal, setAbonoModal] = useState({ open: false, periodoId: null, monto: '' });
  const [mode, setMode] = useState('resumen'); // 'resumen' | 'pendientes'
  const [pend, setPend] = useState({ items: [], pagination: { page: 1, total: 0, totalPages: 1, limit: 20 } });

  const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));
  const formatDate = (value) => {
    if (!value) return '-';
    try {
      // soporta 'YYYY-MM-DD' o ISO
      const d = value.includes('T') ? new Date(value) : new Date(value + 'T00:00:00');
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString('es-MX');
    } catch { return value; }
  };

  // Helpers de periodo
  const isFuturePeriod = (year, month) => {
    if (!year || !month) return false;
    const today = new Date();
    const ym = Number(year) * 100 + Number(month);
    const todayYM = today.getFullYear() * 100 + (today.getMonth() + 1);
    return ym > todayYM;
  };
  const periodStartLabel = (year, month) => {
    const y = Number(year), m = Number(month);
    if (!y || !m) return '';
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('es-MX');
  };

  const load = async () => {
    setLoading(true);
    setError('');
  // Garantiza que exista el periodo del mes actual para clientes activos
  await clientesPagosService.ensureNext();
    if (mode === 'resumen') {
      const r = await clientesPagosService.getResumen();
      if (r.success) setResumen(r.resumen); else setError(r.error);
    } else {
      const r = await clientesPagosService.listPendientes({ page: pend.pagination.page, limit: pend.pagination.limit, q });
      if (r.success) setPend({ items: r.items, pagination: r.pagination }); else setError(r.error);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [mode]);
  useEffect(() => { if (mode === 'pendientes') load(); }, [pend.pagination.page]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return resumen;
    return resumen.filter(r => (r.nombre_completo || '').toLowerCase().includes(term));
  }, [q, resumen]);

  const doPagar = async (periodo_id) => {
    const res = await clientesPagosService.pagarPeriodo(periodo_id);
    if (res.success) {
      await load();
      if (modal.open) {
        const pagos = await clientesPagosService.getPagosCliente(modal.cliente.id);
        if (pagos.success) setModal(m => ({ ...m, pagos: pagos.pagos }));
      }
    } else {
      alert(res.error);
    }
  };

  const initPeriodo = async (cliente) => {
    if (!cliente || !cliente.cliente_id) return;
    const r = await clientesPagosService.initPeriodoCliente(cliente.cliente_id);
    if (!r.success) return alert(r.error);
    await load();
    if (modal.open && modal.cliente && modal.cliente.id === cliente.cliente_id) {
      const pagos = await clientesPagosService.getPagosCliente(modal.cliente.id);
      if (pagos.success) setModal(m => ({ ...m, pagos: pagos.pagos }));
    }
  };

  const doAbonar = async () => {
    const id = abonoModal.periodoId;
    const monto = Number(abonoModal.monto);
    if (!id || !monto || monto <= 0) return;
    const res = await clientesPagosService.abonarPeriodo(id, monto);
    if (!res.success) {
      alert(res.error);
      return;
    }
    setAbonoModal({ open: false, periodoId: null, monto: '' });
    await load();
    if (modal.open && modal.cliente) {
      const pagos = await clientesPagosService.getPagosCliente(modal.cliente.id);
      if (pagos.success) setModal(m => ({ ...m, pagos: pagos.pagos }));
    }
  };

  const openHistorial = async (cliente) => {
    const r = await clientesPagosService.getPagosCliente(cliente.cliente_id || cliente.id);
    if (r.success) {
      setModal({ open: true, cliente: { id: cliente.cliente_id || cliente.id, nombre: cliente.nombre_completo }, pagos: r.pagos });
    }
  };

  const generar = async (cliente) => {
    if (!genForm.desde || !genForm.hasta) return alert('Desde y hasta son requeridos');
    const payload = { desde: genForm.desde, hasta: genForm.hasta };
    if (genForm.monto) payload.monto = Number(genForm.monto);
    const r = await clientesPagosService.generarPeriodos(cliente.cliente_id, payload);
    if (r.success) { await openHistorial(cliente); await load(); }
    else alert(r.error);
  };

  return (
    <div className="w-full max-w-none mx-auto px-3 sm:px-4 md:px-5 lg:px-6 py-4 space-y-5">
      {/* Header + controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Pagos de Clientes de Servicio</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Buscar cliente"
            className="border px-3 py-2 rounded-lg w-full sm:w-72"
          />
          <button onClick={load} className="px-3 py-2 rounded-lg bg-slate-100 w-full sm:w-auto">Actualizar</button>
            <div className="flex rounded-lg overflow-hidden border">
              <button className={`px-3 py-2 ${mode==='resumen'?'bg-white':'bg-slate-50'}`} onClick={()=>setMode('resumen')}>Resumen</button>
              <button className={`px-3 py-2 ${mode==='pendientes'?'bg-white':'bg-slate-50'}`} onClick={()=>setMode('pendientes')}>Pendientes</button>
            </div>
        </div>
      </div>
      <div className="bg-white border rounded-xl overflow-hidden">
  <div className="px-3 sm:px-4 py-3 border-b font-medium">Resumen</div>
  {mode === 'resumen' ? (
    <div className="overflow-x-auto max-w-full">
          <table className="min-w-full text-sm table-auto sm:table-fixed border-separate border-spacing-0">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr className="divide-x divide-gray-200">
                <th className="px-4 py-2 w-48 sm:w-64">Cliente</th>
                <th className="px-4 py-2 w-28 sm:w-32">Próximo mes</th>
                <th className="px-4 py-2 w-32 sm:w-36">Vence</th>
                <th className="px-4 py-2 w-28 sm:w-32">Estado</th>
                <th className="px-4 py-2 w-24 sm:w-28 text-right">Monto</th>
    <th className="px-4 py-2 w-36 sm:w-40">Acciones</th>
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
                const isFuture = r.periodo_year && r.periodo_month ? isFuturePeriod(r.periodo_year, r.periodo_month) : false;
                return (
                  <tr key={r.cliente_id} className={`border-t border-gray-200 divide-x divide-gray-100 odd:bg-white even:bg-gray-50/20 ${isVencido ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2 truncate max-w-[12rem] sm:max-w-none" title={r.nombre_completo}>{r.nombre_completo}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{proximo}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{r.fecha_vencimiento ? formatDate(r.fecha_vencimiento) : '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {estado === 'al_dia' && <span className="text-emerald-700">Al día</span>}
                      {estado === 'pendiente' && <span className="text-amber-700">Pendiente</span>}
                      {isVencido && <span className="text-red-700 font-semibold">Vencido</span>}
                      {isFuture && <span className="ml-2 text-xs text-blue-700">Futuro</span>}
                      {deudaPrev > 0 && <span className="ml-2 text-xs text-red-700">(arrastre {money(deudaPrev)})</span>}
                    </td>
                    <td className="px-4 py-2 text-right">{aPagar ? money(aPagar) : '-'}</td>
        <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                      {r.periodo_id && (
                        <>
          <button
            onClick={() => doPagar(r.periodo_id)}
            className="bg-emerald-600 text-white px-3 py-1 rounded-md disabled:opacity-50"
            disabled={isFuture}
            title={isFuture ? `Disponible a partir de ${periodStartLabel(r.periodo_year, r.periodo_month)}` : undefined}
          >Registrar pago</button>
          <button
            onClick={() => setAbonoModal({ open: true, periodoId: r.periodo_id, monto: '' })}
            className="bg-amber-100 px-3 py-1 rounded-md disabled:opacity-50"
            disabled={isFuture}
            title={isFuture ? `Disponible a partir de ${periodStartLabel(r.periodo_year, r.periodo_month)}` : undefined}
          >Abonar</button>
                        </>
                      )}
                      {!r.periodo_id && r.estado_calculado === 'al_dia' && r.cuota_mensual > 0 && (
                        <button onClick={() => initPeriodo(r)} className="bg-blue-600 text-white px-3 py-1 rounded-md">Inicializar</button>
                      )}
                      <button onClick={() => openHistorial(r)} className="bg-slate-100 px-3 py-1 rounded-md">Historial</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
  ) : (
    <div className="overflow-x-auto max-w-full">
      <table className="min-w-full text-sm table-auto sm:table-fixed border-separate border-spacing-0">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr className="divide-x divide-gray-200">
            <th className="px-4 py-2 w-48 sm:w-64">Cliente</th>
            <th className="px-4 py-2 w-28 sm:w-32">Periodo</th>
            <th className="px-4 py-2 w-32 sm:w-36">Vence</th>
            <th className="px-4 py-2 w-28 sm:w-32">Estado</th>
            <th className="px-4 py-2 w-24 sm:w-28 text-right">Faltante</th>
            <th className="px-4 py-2 w-36 sm:w-40">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pend.items.map(p => {
            const periodo = `${p.periodo_year}-${String(p.periodo_month).padStart(2,'0')}`;
            const isVencido = p.estado_calculado === 'vencido';
            const isFuture = isFuturePeriod(p.periodo_year, p.periodo_month);
            return (
              <tr key={p.periodo_id} className={`border-t border-gray-200 divide-x divide-gray-100 ${isVencido ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-2 truncate" title={p.nombre_completo}>{p.nombre_completo}</td>
                <td className="px-4 py-2 whitespace-nowrap">{periodo}</td>
                <td className="px-4 py-2 whitespace-nowrap">{formatDate(p.fecha_vencimiento)}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {p.estado_calculado === 'pendiente' && <span className="text-amber-700">Pendiente</span>}
                  {isVencido && <span className="text-red-700 font-semibold">Vencido</span>}
                  {p.estado === 'suspendido' && <span className="text-gray-600">Suspendido</span>}
                  {isFuture && <span className="ml-2 text-xs text-blue-700">Futuro</span>}
                </td>
                <td className="px-4 py-2 text-right">{money(Math.max(0, Number(p.faltante || 0)))}</td>
                <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                  <button onClick={() => doPagar(p.periodo_id)} className="bg-emerald-600 text-white px-3 py-1 rounded-md disabled:opacity-50" disabled={isFuture} title={isFuture ? `Disponible a partir de ${periodStartLabel(p.periodo_year, p.periodo_month)}` : undefined}>Pagar</button>
                  <button onClick={() => setAbonoModal({ open: true, periodoId: p.periodo_id, monto: '' })} className="bg-amber-100 px-3 py-1 rounded-md disabled:opacity-50" disabled={isFuture} title={isFuture ? `Disponible a partir de ${periodStartLabel(p.periodo_year, p.periodo_month)}` : undefined}>Abonar</button>
                  <button onClick={() => openHistorial({ cliente_id: p.cliente_id, nombre_completo: p.nombre_completo })} className="bg-slate-100 px-3 py-1 rounded-md">Historial</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Paginación */}
      <div className="flex items-center justify-between p-3 text-sm text-gray-600">
        <div>
          Mostrando página {pend.pagination.page} de {pend.pagination.totalPages} · {pend.pagination.total} registros
        </div>
        <div className="flex gap-2">
          <button disabled={pend.pagination.page<=1} onClick={()=>setPend(p=>({ ...p, pagination: { ...p.pagination, page: p.pagination.page-1 } }))} className="px-3 py-1 rounded border disabled:opacity-50">Anterior</button>
          <button disabled={pend.pagination.page>=pend.pagination.totalPages} onClick={()=>setPend(p=>({ ...p, pagination: { ...p.pagination, page: p.pagination.page+1 } }))} className="px-3 py-1 rounded border disabled:opacity-50">Siguiente</button>
        </div>
      </div>
    </div>
  )}
        {loading && <div className="p-3 text-sm text-gray-600">Cargando...</div>}
        {error && <div className="p-3 text-sm text-red-600">{error}</div>}
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open:false, cliente:null, pagos:[] })} title={modal.cliente ? `Historial de ${modal.cliente.nombre}` : 'Historial'}>
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <input className="border px-3 py-2 rounded-lg w-full sm:w-auto" placeholder="Desde (YYYY-MM)" value={genForm.desde} onChange={e=>setGenForm(f=>({...f, desde:e.target.value}))} />
            <input className="border px-3 py-2 rounded-lg w-full sm:w-auto" placeholder="Hasta (YYYY-MM)" value={genForm.hasta} onChange={e=>setGenForm(f=>({...f, hasta:e.target.value}))} />
            <input className="border px-3 py-2 rounded-lg w-full sm:w-auto" placeholder="Monto (opcional)" value={genForm.monto} onChange={e=>setGenForm(f=>({...f, monto:e.target.value}))} />
            {modal.cliente && <button onClick={() => generar({ cliente_id: modal.cliente.id })} className="bg-blue-600 text-white px-3 py-2 rounded-lg w-full sm:w-auto">Generar Periodos</button>}
          </div>
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="min-w-full text-sm table-auto sm:table-fixed border-separate border-spacing-0">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr className="divide-x divide-gray-200">
                  <th className="px-4 py-2 w-32 sm:w-40">Periodo</th>
                  <th className="px-4 py-2 w-32 sm:w-36">Vence</th>
                  <th className="px-4 py-2 w-28 sm:w-32">Estado</th>
                  <th className="px-4 py-2 w-24 sm:w-28 text-right">Monto</th>
                  <th className="px-4 py-2 w-32 sm:w-40">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {modal.pagos.map(p => {
                  const periodo = `${p.periodo_year}-${String(p.periodo_month).padStart(2,'0')}`;
                  const isVencido = p.estado === 'vencido' || (p.estado !== 'pagado' && p.fecha_vencimiento < new Date().toISOString().slice(0,10));
                  const isFuture = isFuturePeriod(p.periodo_year, p.periodo_month);
                  return (
                    <tr key={p.id} className="border-t border-gray-200 divide-x divide-gray-100 odd:bg-white even:bg-gray-50/20">
                      <td className="px-4 py-2 whitespace-nowrap">{periodo}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(p.fecha_vencimiento)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {p.estado === 'pagado' && <span className="text-emerald-700">Pagado</span>}
                        {p.estado === 'pendiente' && <span className="text-amber-700">Pendiente</span>}
                        {isVencido && <span className="text-red-600 font-semibold">Vencido</span>}
                        {p.estado === 'suspendido' && <span className="text-gray-600">Suspendido</span>}
                        {isFuture && p.estado !== 'pagado' && <span className="ml-2 text-xs text-blue-700">Futuro</span>}
                      </td>
                      <td className="px-4 py-2 text-right">{p.monto ? `${money(p.monto)}${p.monto_pagado && p.monto_pagado < p.monto ? ` · abonado ${money(p.monto_pagado)}` : ''}` : '-'}</td>
                      <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                        {(p.estado === 'pendiente' || isVencido) && (
                          <button onClick={() => doPagar(p.id)} className="bg-emerald-600 text-white px-3 py-1 rounded-md disabled:opacity-50" disabled={isFuture} title={isFuture ? `Disponible a partir de ${periodStartLabel(p.periodo_year, p.periodo_month)}` : undefined}>Pagar</button>
                        )}
                        {(p.estado === 'pendiente' || isVencido) && (
                          <button onClick={() => setAbonoModal({ open: true, periodoId: p.id, monto: '' })} className="bg-amber-100 px-3 py-1 rounded-md disabled:opacity-50" disabled={isFuture} title={isFuture ? `Disponible a partir de ${periodStartLabel(p.periodo_year, p.periodo_month)}` : undefined}>Abonar</button>
                        )}
                        {p.estado === 'pendiente' && <button onClick={() => clientesPagosService.suspenderPeriodo(p.id).then(load)} className="bg-gray-200 px-3 py-1 rounded-md">Suspender</button>}
                        {p.estado === 'suspendido' && <button onClick={() => clientesPagosService.reactivarPeriodo(p.id).then(load)} className="bg-blue-100 px-3 py-1 rounded-md">Reactivar</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Modal de Abono */}
      <Modal open={abonoModal.open} onClose={() => setAbonoModal({ open:false, periodoId:null, monto:'' })} title="Registrar abono">
        <div className="space-y-3">
          <input type="number" step="0.01" min="0" className="border px-3 py-2 rounded-lg w-full sm:w-48" placeholder="Monto" value={abonoModal.monto} onChange={e=>setAbonoModal(m=>({...m, monto:e.target.value}))} />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button className="bg-emerald-600 text-white px-3 py-2 rounded-lg w-full sm:w-auto" onClick={doAbonar}>Guardar</button>
            <button className="bg-slate-100 px-3 py-2 rounded-lg w-full sm:w-auto" onClick={() => setAbonoModal({ open:false, periodoId:null, monto:'' })}>Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PagosServicio;
