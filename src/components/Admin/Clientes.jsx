import React, { useEffect, useMemo, useState } from 'react';
import { Users, Edit3, Trash2, MapPin, RefreshCw, CheckCircle, XCircle, Search } from 'lucide-react';
import { clientesService } from '@services';

const initialForm = {
  tipo: 'servicio',
  nombre_completo: '',
  telefono: '',
  email: '',
  direccion: '',
  latitud: '',
  longitud: '',
  notas: '',
  // servicio
  plan: '',
  velocidad_mbps: '',
  cuota_mensual: '',
  fecha_instalacion: '',
  fecha_primer_corte: '',
  dia_corte: '',
  estado: 'activo',
  activo: true,
};

// Modal reutilizable con tamaños (sm, md, lg)
const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizeClasses = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-5xl' : 'max-w-2xl';
  const padding = size === 'sm' ? 'p-3' : 'p-4';
  const titleSize = size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white w-full ${sizeClasses} rounded-xl shadow-xl border ${padding} max-h-[85vh] overflow-auto`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`${titleSize} font-semibold truncate pr-8`}>{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos'); // todos | servicio | ocasional
  const [soloActivos, setSoloActivos] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editando, setEditando] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState({ open: false, id: null, nombre: '' });
  const [deleting, setDeleting] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await clientesService.listar({ tipo: filtroTipo !== 'todos' ? filtroTipo : undefined, activo: soloActivos ? true : undefined });
      if (res.success) {
        setClientes(res.clientes);
        setError('');
      } else {
        setError(res.error || 'Error al cargar clientes');
      }
    } catch (e) {
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [filtroTipo, soloActivos]);

  const computeCorteInfo = (c) => {
    if (c.tipo !== 'servicio') return null;
    const tzNow = new Date();
    const year = tzNow.getFullYear();
    const month = tzNow.getMonth(); // 0-11
    const day = Math.min(Number(c.dia_corte), 28) || 1; // cap 28 para evitar issues

    // Si hay fecha_primer_corte, usarla como ancla mensual exacta
    if (c.fecha_primer_corte) {
      const anchor = new Date(c.fecha_primer_corte);
      let due = new Date(anchor);
      while (due < tzNow) {
        due = new Date(due.getFullYear(), due.getMonth() + 1, due.getDate());
      }
      const msDiffA = due - tzNow;
      const daysA = Math.ceil(msDiffA / (1000 * 60 * 60 * 24));
      return { dueDate: due, days: daysA, vencido: msDiffA < 0 };
    }

    if (!c.dia_corte) return null;
    const thisMonthCorte = new Date(year, month, Number(c.dia_corte));
    const nextMonthCorte = new Date(year, month + 1, Number(c.dia_corte));
    const prevMonthCorte = new Date(year, month - 1, Number(c.dia_corte));

    // Determinar el corte relevante
    let dueDate = thisMonthCorte;
    if (tzNow > thisMonthCorte) {
      dueDate = nextMonthCorte;
    }

    // Si la instalación es posterior al dueDate, desplazar
    if (c.fecha_instalacion) {
      const fi = new Date(c.fecha_instalacion);
      if (fi > dueDate) {
        dueDate = new Date(fi.getFullYear(), fi.getMonth() + 1, Number(c.dia_corte));
      }
    }

    const msDiff = dueDate - tzNow;
    const days = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    const vencido = msDiff < 0;
    return { dueDate, days, vencido };
  };

  const clientesFiltrados = useMemo(() => {
    const t = (busqueda || '').toLowerCase();
    return clientes.map(c => {
      const corte = computeCorteInfo(c);
      return { ...c, _corte: corte };
    }).filter(c => {
      const matchTexto = !t || `${c.nombre_completo} ${c.telefono || ''} ${c.email || ''} ${c.direccion || ''}`.toLowerCase().includes(t);
      return matchTexto;
    });
  }, [clientes, busqueda]);

  // Crear nuevo cliente se gestiona desde otra sección; quitamos botón local para evitar confusión

  const editar = (c) => {
    setEditando(c);
    setForm({
      tipo: c.tipo,
      nombre_completo: c.nombre_completo || '',
      telefono: c.telefono || '',
      email: c.email || '',
      direccion: c.direccion || '',
      latitud: c.latitud ?? '',
      longitud: c.longitud ?? '',
      notas: c.notas || '',
      plan: c.plan || '',
      velocidad_mbps: c.velocidad_mbps ?? '',
      cuota_mensual: c.cuota_mensual ?? '',
      fecha_instalacion: c.fecha_instalacion ? c.fecha_instalacion.slice(0,10) : '',
  fecha_primer_corte: c.fecha_primer_corte ? c.fecha_primer_corte.slice(0,10) : '',
      dia_corte: c.dia_corte ?? '',
      estado: c.estado || 'activo',
      activo: c.activo === 1 || c.activo === true,
    });
    setShowForm(true);
  };

  const guardar = async () => {
    // Validación mínima
    if (!form.nombre_completo.trim()) { alert('Nombre es requerido'); return; }
    if (!['servicio','ocasional'].includes(form.tipo)) { alert('Tipo inválido'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      // normalizar
      if (payload.latitud === '') payload.latitud = null;
      if (payload.longitud === '') payload.longitud = null;
      if (payload.velocidad_mbps === '') payload.velocidad_mbps = null;
      if (payload.cuota_mensual === '') payload.cuota_mensual = null;
      if (payload.dia_corte === '') payload.dia_corte = null;
  if (payload.fecha_instalacion === '') payload.fecha_instalacion = null;
  if (payload.fecha_primer_corte === '') payload.fecha_primer_corte = null;
      if (editando) {
        const res = await clientesService.actualizar(editando.id, payload);
        if (res.success) { setShowForm(false); await cargar(); }
        else alert(res.error || 'Error al actualizar');
      } else {
        const res = await clientesService.crear(payload);
        if (res.success) { setShowForm(false); await cargar(); }
        else alert(res.error || 'Error al crear');
      }
    } finally { setSaving(false); }
  };

  const eliminar = (c) => {
    setConfirmDel({ open: true, id: c.id, nombre: c.nombre_completo || '' });
  };

  const confirmarEliminar = async () => {
    if (!confirmDel.id) return;
    setDeleting(true);
    try {
      const res = await clientesService.eliminar(confirmDel.id);
      if (res.success) {
        setConfirmDel({ open: false, id: null, nombre: '' });
        await cargar();
      } else {
        alert(res.error || 'Error al eliminar');
      }
    } finally {
      setDeleting(false);
    }
  };

  const toggleActivo = async (c) => {
    const res = await clientesService.toggleActivo(c.id);
    if (res.success) await cargar(); else alert(res.error || 'Error al cambiar estado');
  };

  const geocode = async () => {
    try {
      const addr = (form.direccion || '').trim();
      if (!addr) { alert('Escribe una dirección'); return; }
      const url = `/api/geo/search?limit=1&q=${encodeURIComponent(addr)}`;
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await r.json();
      if (data?.success && Array.isArray(data.results) && data.results.length) {
        const g = data.results[0];
        setForm(f => ({ ...f, latitud: Number(g.lat).toFixed(6), longitud: Number(g.lon).toFixed(6) }));
      } else alert('No se encontraron coordenadas');
    } catch (e) { alert('Error al geocodificar'); }
  };

  return (
    <div className="w-full max-w-none mx-auto px-3 sm:px-4 md:px-5 lg:px-6 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-slate-700" />
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Clientes</h2>
      </div>

      {/* Controles / filtros */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="px-3 py-2 border rounded-lg w-full sm:w-auto">
          <option value="todos">Todos</option>
          <option value="servicio">Servicio mensual</option>
          <option value="ocasional">Ocasional</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} /> Solo activos
        </label>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar" className="pl-9 pr-3 py-2 border rounded-lg w-full" />
        </div>
        <button onClick={cargar} className="px-3 py-2 border rounded-lg inline-flex items-center gap-2 w-full sm:w-auto"><RefreshCw className="w-4 h-4" /> Actualizar</button>
      </div>

      {loading ? (
        <div className="text-gray-500">Cargando...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto bg-white border rounded-xl">
          <table className="min-w-full text-sm table-fixed border-collapse">
            <thead className="bg-gray-50 text-left text-gray-700 border-b border-gray-200">
              <tr className="divide-x divide-gray-200">
                <th className="px-4 py-3 w-64">Nombre</th>
                <th className="px-4 py-3 w-36">Tipo</th>
                <th className="px-4 py-3">Detalle</th>
                <th className="px-4 py-3 w-40">Ubicación</th>
                <th className="px-4 py-3 w-36">Estado</th>
                <th className="px-4 py-3 w-44 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(c => (
                <tr key={c.id} className="border-b border-gray-200 divide-x divide-gray-100 odd:bg-white even:bg-gray-50/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.nombre_completo}</div>
                    <div className="text-gray-500 text-xs">{c.telefono || '-'} · {c.email || '-'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.tipo === 'servicio' ? 'Servicio mensual' : 'Ocasional'}
                  </td>
                  <td className="px-4 py-3">
                    {c.tipo === 'servicio' ? (
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div>Cuota: {c.cuota_mensual ? `$${c.cuota_mensual}` : '-'}</div>
                        <div>Instalación: {c.fecha_instalacion ? new Date(c.fecha_instalacion).toLocaleDateString() : '-'}</div>
                        <div>1er corte: {c.fecha_primer_corte ? new Date(c.fecha_primer_corte).toLocaleDateString() : '-'}</div>
                        <div>Día de corte: {c.dia_corte || '-'}</div>
                        {c._corte && (
                          <div className={c._corte.vencido ? 'text-red-600' : 'text-green-700'}>
                            {c._corte.vencido ? 'Pago vencido' : 'Próximo pago'}: {c._corte.dueDate.toLocaleDateString()} {typeof c._corte.days === 'number' && !isNaN(c._corte.days) && (
                              <span className="text-gray-500">({c._corte.vencido ? `${Math.abs(c._corte.days)} días de atraso` : `en ${c._corte.days} días`})</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">{c.notas || '-'}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(c.latitud && c.longitud) ? (
                      <a href={`https://www.openstreetmap.org/?mlat=${c.latitud}&mlon=${c.longitud}#map=17/${c.latitud}/${c.longitud}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                        <MapPin className="w-4 h-4" /> Ver mapa
                      </a>
                    ) : <span className="text-gray-400 text-xs">Sin coordenadas</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.activo ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex flex-col sm:inline-flex sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 min-w-[160px]">
                      <button onClick={() => editar(c)} className="px-2 py-1 border rounded hover:bg-gray-50 w-full sm:w-auto" title="Editar"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => toggleActivo(c)} className="px-2 py-1 border rounded hover:bg-gray-50 w-full sm:w-auto" title="Activar/Desactivar">{c.activo ? 'Desactivar' : 'Activar'}</button>
                      <button onClick={() => eliminar(c)} className="px-2 py-1 border rounded hover:bg-red-50 text-red-600 w-full sm:w-auto" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Sin resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editando ? 'Editar cliente' : 'Nuevo cliente'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                  <option value="servicio">Servicio mensual</option>
                  <option value="ocasional">Ocasional</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre completo</label>
                <input value={form.nombre_completo} onChange={e => setForm(f => ({ ...f, nombre_completo: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Dirección</label>
                <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Latitud</label>
                <input type="number" step="0.000001" value={form.latitud} onChange={e => setForm(f => ({ ...f, latitud: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Longitud</label>
                <input type="number" step="0.000001" value={form.longitud} onChange={e => setForm(f => ({ ...f, longitud: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={geocode} className="px-3 py-2 border rounded-lg">Obtener coordenadas</button>
              </div>
              {form.latitud && form.longitud && (
                <div className="md:col-span-2">
                  <div className="w-full h-48 overflow-hidden rounded-lg border">
                    <iframe
                      title="Mapa"
                      className="w-full h-full"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.longitud) - 0.01}%2C${Number(form.latitud) - 0.01}%2C${Number(form.longitud) + 0.01}%2C${Number(form.latitud) + 0.01}&layer=mapnik&marker=${form.latitud}%2C${form.longitud}`}
                    />
                  </div>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" rows={3} />
              </div>

              {form.tipo === 'servicio' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cuota mensual</label>
                    <input type="number" step="0.01" value={form.cuota_mensual} onChange={e => setForm(f => ({ ...f, cuota_mensual: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha instalación</label>
                    <input type="date" value={form.fecha_instalacion} onChange={e => setForm(f => ({ ...f, fecha_instalacion: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha del primer corte</label>
                    <input type="date" value={form.fecha_primer_corte} onChange={e => setForm(f => ({ ...f, fecha_primer_corte: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Día de corte</label>
                    <input type="number" min={1} max={31} value={form.dia_corte} onChange={e => setForm(f => ({ ...f, dia_corte: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} /> Activo
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 w-full sm:w-auto">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 inline-flex items-center gap-2 w-full sm:w-auto">
                {saving && <RefreshCw className="w-4 h-4 animate-spin" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación (compacta) */}
      <Modal open={confirmDel.open} onClose={() => setConfirmDel({ open: false, id: null, nombre: '' })} title="Eliminar cliente" size="sm">
        <div className="space-y-3 text-sm">
          <p>Esta acción no se puede deshacer. ¿Deseas eliminar al cliente {confirmDel.nombre ? `"${confirmDel.nombre}"` : 'seleccionado'}?</p>
          <div className="flex justify-end gap-2">
            <button className="px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50" onClick={() => setConfirmDel({ open: false, id: null, nombre: '' })}>Cancelar</button>
            <button className="px-2.5 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2" onClick={confirmarEliminar} disabled={deleting}>
              {deleting && <RefreshCw className="w-4 h-4 animate-spin" />} Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Clientes;
