import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, CheckCircle, Trash2, Download } from 'lucide-react';
import DataTable from '@components/common/DataTable';
import { gastosService } from '@services/gastosService';

const currency = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n || 0));

const Gastos = () => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  // Eliminado filtro de periodo; ahora se usa solo rango de fechas + tipo
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState(''); // formato yyyy-mm-dd (input date)
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ tipo: 'prestamos', persona: '', monto: '', motivo: '' });
  const [resumen, setResumen] = useState({ total: 0, porTipo: [], prestadoPendiente: 0 });
  const [recientes, setRecientes] = useState([]); // personas usadas recientemente
  const [procesandoPago, setProcesandoPago] = useState(null); // ID del préstamo que se está procesando
  // Estado para modal de eliminación
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, loading: false });

  // Helpers locales para nombres recientes
  const LS_KEY = 'gastos.personas.recientes';
  const cargarRecientes = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    } catch { return []; }
  };
  const guardarRecientes = (arr) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
  };
  const agregarReciente = (nombre) => {
    const n = (nombre || '').trim();
    if (!n) return;
    setRecientes(prev => {
      const set = new Map();
      // mantener unicidad case-insensitive preservando última forma
      const put = (s) => set.set(s.toLowerCase(), s);
      prev.forEach(put);
      put(n);
      const merged = Array.from(set.values()).slice(-10); // últimos 10
      guardarRecientes(merged);
      return merged;
    });
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [{ items: list, pagination }, sum] = await Promise.all([
        gastosService.listar({ page, limit: pageSize, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, tipo: filtroTipo }),
        gastosService.resumen({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, tipo: filtroTipo })
      ]);
      console.log('🔍 Datos recibidos:', { list, sum });
      setItems(list);
      setTotal(pagination?.total || list.length);
      setTotalPages(pagination?.totalPages || 1);
      setResumen(sum);
      // no reset aquí, page es dependencia del efecto
      // Actualizar sugerencias a partir de lo existente
      const nombres = (list || []).map(x => x.persona).filter(Boolean);
      if (nombres.length) {
        const base = cargarRecientes();
        const set = new Map();
        const put = (s) => set.set(String(s).toLowerCase(), String(s));
        base.forEach(put);
        nombres.forEach(put);
        const merged = Array.from(set.values()).slice(-10);
        setRecientes(merged);
        guardarRecientes(merged);
      } else {
        // cargar del storage si la lista vino vacía
        setRecientes(cargarRecientes());
      }
    } catch (e) {
      setError(e?.message || 'Error cargando gastos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, fechaDesde, fechaHasta, filtroTipo]);
  useEffect(() => { // inicializar recientes del storage al montar
    setRecientes(cargarRecientes());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if ((form.tipo !== 'personales' && !form.persona?.trim()) || !form.monto) return;
    try {
      setError(null);
      const personaFinal = form.tipo === 'personales' && !form.persona.trim() ? 'admin' : form.persona.trim();
      
      // Crear el gasto
      const payload = { tipo: form.tipo, persona: personaFinal, monto: Number(form.monto), motivo: form.motivo?.trim() || null };
      
      await gastosService.crear(payload);
      setForm({ tipo: form.tipo, persona: '', monto: '', motivo: '' });
      agregarReciente(personaFinal);
      setSuccess(`${form.tipo === 'prestamos' ? 'Préstamo' : form.tipo === 'viaticos' ? 'Viático' : 'Gasto personal'} registrado exitosamente`);
      await load();
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e?.message || 'No se pudo crear el gasto');
    }
  };

  const handlePagar = async (id) => {
    try { 
      setProcesandoPago(id);
      setError(null);
      await gastosService.pagar(id); 
      setSuccess('Préstamo marcado como pagado exitosamente');
      await load(); 
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) { 
      setError(e?.message || 'No se pudo marcar como pagado'); 
    } finally {
      setProcesandoPago(null);
    }
  };
  const abrirEliminar = (item) => {
    setDeleteModal({ open: true, item, loading: false });
  };
  const confirmarEliminar = async () => {
    if (!deleteModal.item) return;
    try {
      setDeleteModal((m) => ({ ...m, loading: true }));
      await gastosService.eliminar(deleteModal.item.id);
      setDeleteModal({ open: false, item: null, loading: false });
      await load();
    } catch (e) {
      setDeleteModal((m) => ({ ...m, loading: false }));
      setError(e?.message || 'No se pudo eliminar');
    }
  };

  const totalPrestadoPendiente = useMemo(() => resumen?.prestadoPendiente || 0, [resumen]);
  const totalGastos = useMemo(() => resumen?.total || 0, [resumen]);
  const totalViaticos = useMemo(() => resumen?.porTipo?.find(p => p.tipo === 'viaticos')?.total || 0, [resumen]);
  const totalPersonales = useMemo(() => resumen?.porTipo?.find(p => p.tipo === 'personales')?.total || 0, [resumen]);
  const totalPrestamosTodos = useMemo(() => resumen?.porTipo?.find(p => p.tipo === 'prestamos')?.total || 0, [resumen]);

  // Rango mostrado
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + items.length, total);

  // Badge de tipo con colores por categoría
  const tipoBadge = (tipo, row) => {
    // Normalizar: si viene vacío o null, tratar como 'prestamos' (compatibilidad con datos antiguos)
    const tRaw = (tipo == null || String(tipo).trim() === '') ? 'prestamos' : tipo;
    const t = String(tRaw || '').toLowerCase().trim();
    let classes = 'bg-slate-100 text-slate-700 border border-slate-200';
    let label = 'Sin tipo';
    
    // Debug temporal para ver qué llega
    console.log('🔍 Badge debug:', { tipo, t, row });
    
    switch (t) {
      case 'viaticos':
      case 'viáticos':
        classes = 'bg-blue-50 text-blue-700 border border-blue-200';
        label = 'Viáticos';
        break;
      case 'personales':
        classes = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
        label = 'Personales';
        break;
      case 'prestamos':
      case 'préstamos':
        if (row?.pagado === 1 || row?.pagado === true) {
          classes = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
          label = 'Préstamo Pagado';
        } else {
          classes = 'bg-red-50 text-red-700 border border-red-200';
          label = 'Préstamo Pendiente';
        }
        break;
      default:
        // Si llega algo raro, mostrar genérico pero sin confundir al usuario
        label = 'Sin tipo';
    }
    
    return <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium ${classes}`}>{label}</span>;
  };

  const columns = [
    { header: 'Tipo', accessor: 'tipo', cell: (v, row) => tipoBadge(v, row) },
    { header: 'Persona', accessor: 'persona', cell: (v, row) => (
  <span className={`${row.tipo === 'prestamos' && !row.pagado ? 'text-red-700 font-medium' : 'text-gray-800'}`}>{v}</span>
      ) },
    { header: 'Monto', accessor: 'monto', cell: (v) => <span className="font-semibold">{currency(v)}</span> },
    { header: 'Motivo', accessor: 'motivo', cell: (v) => v || <span className="text-gray-400">—</span> },
    { header: 'Fecha', accessor: 'created_at', cell: (v) => new Date(v).toLocaleString() },
  { header: '', accessor: 'acciones', cell: (_, row) => (
        <div className="flex items-center justify-end gap-1">
      {(((row.tipo ?? '') === '' ? 'prestamos' : row.tipo) === 'prestamos') && !row.pagado && (
            <button 
              onClick={() => handlePagar(row.id)} 
              disabled={procesandoPago === row.id}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                procesandoPago === row.id 
                  ? 'bg-emerald-400 text-white cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title="Marcar como pagado"
            >
              <CheckCircle className="w-3 h-3" />
              {procesandoPago === row.id ? 'Procesando...' : 'Pagado'}
            </button>
          )}
          <button 
            onClick={() => abrirEliminar(row)} 
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ), tdClassName: 'text-right w-32' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6 space-y-5 md:space-y-6">
      {/* Encabezado + métricas + controles */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">Gastos</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="px-3 py-2 rounded-lg bg-slate-50 border text-slate-700 flex items-center justify-between sm:block">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 mr-2 sm:mr-0">Total neto:</span>
            </div>
            <span className="font-semibold">{currency(totalGastos)}</span>
            <div className="text-[10px] text-slate-400 mt-1 hidden sm:block">
              Sin préstamos pagados
            </div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-between sm:block">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-blue-700/80">Viáticos:</span>
            </div>
            <span className="font-semibold">{currency(totalViaticos)}</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-between sm:block">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-indigo-700/80">Personales:</span>
            </div>
            <span className="font-semibold">{currency(totalPersonales)}</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center justify-between sm:block">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-700/80">Préstamos:</span>
            </div>
            <span className="font-semibold">{currency(totalPrestadoPendiente)}</span>
            <div className="text-[10px] text-red-500 mt-1 hidden sm:block">
              Solo pendientes
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex flex-col">
                <label className="text-[11px] uppercase tracking-wide text-gray-500">Desde</label>
                <input type="date" value={fechaDesde} onChange={(e)=>{setPage(1); setFechaDesde(e.target.value);}} className="border rounded-lg px-2 py-1 text-sm" />
              </div>
              <div className="flex flex-col">
                <label className="text-[11px] uppercase tracking-wide text-gray-500">Hasta</label>
                <input type="date" value={fechaHasta} onChange={(e)=>{setPage(1); setFechaHasta(e.target.value);}} className="border rounded-lg px-2 py-1 text-sm" />
              </div>
              <div className="flex flex-col">
                <label className="text-[11px] uppercase tracking-wide text-gray-500">Tipo</label>
                <select value={filtroTipo} onChange={(e)=>{setPage(1); setFiltroTipo(e.target.value);}} className="border rounded-lg px-2 py-1 text-sm">
                  <option value="todos">Todos</option>
                  <option value="prestamos">Préstamos</option>
                  <option value="viaticos">Viáticos</option>
                  <option value="personales">Personales</option>
                </select>
              </div>
              {(fechaDesde || fechaHasta || filtroTipo !== 'todos') && (
                <button type="button" onClick={()=>{setFechaDesde(''); setFechaHasta(''); setFiltroTipo('todos');}} className="text-xs text-gray-500 hover:text-gray-700 underline mt-2 sm:mt-5">Limpiar</button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <button
              onClick={async () => {
                const blob = await gastosService.exportXlsx({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, tipo: filtroTipo });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const tipoLabel = filtroTipo === 'todos' ? 'todos' : filtroTipo;
                // Etiqueta de rango: si no hay fechas -> 'todo'; si solo desde -> 'desdeYYYYMMDD'; si solo hasta -> 'hastaYYYYMMDD'; si ambos -> 'YYYYMMDD-YYYYMMDD'
                const norm = (d)=> d ? d.replace(/-/g,'') : '';
                let rangoLabel = 'todo';
                if (fechaDesde && fechaHasta) rangoLabel = `${norm(fechaDesde)}-${norm(fechaHasta)}`;
                else if (fechaDesde) rangoLabel = `desde${norm(fechaDesde)}`;
                else if (fechaHasta) rangoLabel = `hasta${norm(fechaHasta)}`;
                a.download = `gastos_${rangoLabel}_${tipoLabel}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
              title="Exportar Excel"
            >
              <Download className="w-4 h-4"/>
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Mensajes de feedback */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-white border rounded-xl p-3 sm:p-4 md:p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo</label>
            <select 
              value={form.tipo} 
              onChange={(e) => setForm(f => ({ ...f, tipo: e.target.value }))} 
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="prestamos">Préstamos</option>
              <option value="viaticos">Viáticos</option>
              <option value="personales">Personales</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Persona{form.tipo === 'personales' ? ' (opcional)' : ''}</label>
            <input
              type="text"
              value={form.persona}
              onChange={(e) => setForm(f => ({ ...f, persona: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder={form.tipo === 'personales' ? 'admin (por defecto)' : '¿A quién?'}
              {...(form.tipo !== 'personales' ? { required: true, minLength: 2 } : {})}
              list="gastos-personas-recientes"
              autoComplete="off"
            />
            <datalist id="gastos-personas-recientes">
              {recientes.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Monto</label>
            <input type="number" step="0.01" value={form.monto} onChange={(e) => setForm(f => ({ ...f, monto: e.target.value }))} className="w-full border rounded-lg px-3 py-2" placeholder="0.00" required />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Motivo</label>
            <input type="text" value={form.motivo} onChange={(e) => setForm(f => ({ ...f, motivo: e.target.value }))} className="w-full border rounded-lg px-3 py-2" placeholder="Opcional" />
          </div>
        </div>
        <div className="flex items-center justify-end">
          <button type="submit" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg w-full sm:w-auto">
            <DollarSign className="w-4 h-4" />
            Registrar
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          error={error}
          emptyMessage="Sin gastos registrados"
        />
      </div>

      {/* Paginación */}
  {total > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm mt-3">
          <div className="text-gray-600">
    Mostrando {startIndex + 1}-{endIndex} de {total}
          </div>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-3 py-1.5 rounded-lg border ${page === 1 ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}`}
            >
              Anterior
            </button>
    <span className="px-2 text-gray-700">{page} / {totalPages}</span>
            <button
              type="button"
      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`px-3 py-1.5 rounded-lg border ${page === totalPages ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}`}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => !deleteModal.loading && setDeleteModal({ open: false, item: null, loading: false })} />
          <div className="relative bg-white rounded-xl shadow-xl border w-[90%] max-w-md p-5 animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Eliminación</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Seguro que quieres eliminar este gasto?
            </p>
            {deleteModal.item && (
              <div className="mb-4 rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
                <div><span className="text-gray-500">Tipo:</span> {deleteModal.item.tipo === 'prestamos' ? (deleteModal.item.pagado ? 'Préstamos (Pagado)' : 'Préstamos') : (deleteModal.item.tipo === 'viaticos' ? 'Viáticos' : 'Personales')}</div>
                <div><span className="text-gray-500">Persona:</span> {deleteModal.item.persona || '—'}</div>
                <div><span className="text-gray-500">Monto:</span> {currency(deleteModal.item.monto)}</div>
                {deleteModal.item.motivo && <div><span className="text-gray-500">Motivo:</span> {deleteModal.item.motivo}</div>}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
                onClick={() => setDeleteModal({ open: false, item: null, loading: false })}
                disabled={deleteModal.loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg text-white ${deleteModal.loading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={confirmarEliminar}
                disabled={deleteModal.loading}
              >
                {deleteModal.loading ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gastos;
