import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, CheckCircle, RefreshCw } from 'lucide-react';
import DataTable from '@components/common/DataTable';
import { fichasService } from '@services/fichasService';
import { useFichas } from '@context/FichasContext';
import clientesService from '@services/clientesService';
import { formatClienteLargo } from '@shared/index.js';

// Formatea fecha y hora exacta en zona local (24h)
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('es-MX', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
};

//modal para eliminar
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

const Equipos = () => {
  const { revendedores } = useFichas();
  const [clientesServicio, setClientesServicio] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState(''); // client_ref ej: rev-1, cli-3
  const [clientesActivos, setClientesActivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', revendedor_id: '' });
  const [verInactivos, setVerInactivos] = useState(false);
  const [saving, setSaving] = useState(false);
  // Inventario simple de equipos (opcional)
  const [mostrarInventario, setMostrarInventario] = useState(false);
  const [invItems, setInvItems] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invSaving, setInvSaving] = useState(false);
  const [invForm, setInvForm] = useState({ nombre: '', cantidad: 0, estado: 'nuevo', descripcion: '' });
  // Confirmaciones de eliminación
  const [confirmEquipoDel, setConfirmEquipoDel] = useState({ open: false, id: null, nombre: '' });
  const [deletingEquipo, setDeletingEquipo] = useState(false);
  const [confirmInvDel, setConfirmInvDel] = useState({ open: false, id: null, nombre: '' });
  const [deletingInv, setDeletingInv] = useState(false);

  // Combinar revendedores y clientes de servicio para el dropdown
  const clientesOrdenados = useMemo(() => {
    const revs = (revendedores || []).map(r => ({
      id: `rev-${r.id}`,
      type: 'revendedor',
      refId: r.id,
      display: (r.responsable || r.nombre || r.nombre_negocio || '').trim() || `Revendedor #${r.id}`
    }));
    const cls = (clientesServicio || []).map(c => ({
      id: `cli-${c.id}`,
      type: 'cliente',
      refId: c.id,
      display: c.nombre_completo?.trim() || `Cliente #${c.id}`
    }));
    const merged = [...revs, ...cls];
    return merged.sort((a, b) => a.display.toLowerCase().localeCompare(b.display.toLowerCase()));
  }, [revendedores, clientesServicio]);

  // Cargar clientes de servicio activos al montar (ligero)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await clientesService.listar({ tipo: 'servicio', activo: true });
        if (!mounted) return;
        // clientesService.listar devuelve res.data; normalizamos a res.clientes si aplica
        const lista = res?.clientes || res || [];
        setClientesServicio(lista);
      } catch (_) {
        setClientesServicio([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await fichasService.listarEquipos({ includeInactive: verInactivos, client_ref: filtroCliente || undefined });
      setEquipos(items);
    } catch (e) {
      setError(e?.message || 'Error cargando equipos');
      setEquipos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [verInactivos, filtroCliente]);

  // Cargar lista combinada para el filtro (revendedores + clientes servicio activos)
  useEffect(()=> {
    let mounted = true;
    (async () => {
      try {
        const items = await fichasService.obtenerClientesEquiposActivos();
        if (!mounted) return;
        // Formato homogéneo
        const mapped = items.map(i => ({
          id: (i.tipo === 'revendedor' ? `rev-${i.id}` : `cli-${i.id}`),
          tipo: i.tipo,
          refId: i.id,
          display: i.nombre || (i.tipo === 'revendedor' ? `Revendedor #${i.id}` : `Cliente #${i.id}`)
        }));
        setClientesActivos(mapped.sort((a,b)=> a.display.toLowerCase().localeCompare(b.display.toLowerCase())));
      } catch(_) { setClientesActivos([]); }
    })();
    return () => { mounted = false; };
  }, []);

  const loadInventario = async () => {
    try {
      setInvLoading(true);
      const items = await fichasService.listarEquiposInventario();
      setInvItems(items);
    } catch (e) {
      setError(e?.message || 'Error cargando inventario');
      setInvItems([]);
    } finally {
      setInvLoading(false);
    }
  };

  // Cuando se muestra el bloque de inventario por primera vez, cargar datos
  useEffect(() => {
    if (mostrarInventario) loadInventario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarInventario]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.nombre?.trim() || !form.revendedor_id) return;
    try {
      setSaving(true);
      // Interpretar selección: puede ser rev-<id> o cli-<id>
      const sel = String(form.revendedor_id);
      const isCli = sel.startsWith('cli-');
      const refId = Number(sel.replace(/^(rev-|cli-)/, ''));
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || null,
        ...(isCli ? { cliente_id: refId } : { revendedor_id: refId })
      };
      await fichasService.crearEquipo(payload);
      setForm({ nombre: '', descripcion: '', revendedor_id: '' });
      await load();
    } catch (e) {
      setError(e?.message || 'No se pudo crear el equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    // Obsoleto: se reemplaza por modal compacta
    if (!id) return;
    setConfirmEquipoDel({ open: true, id, nombre: '' });
  };

  const confirmarEliminarEquipo = async () => {
    if (!confirmEquipoDel.id) return;
    setDeletingEquipo(true);
    try {
      await fichasService.eliminarEquipo(confirmEquipoDel.id);
      setConfirmEquipoDel({ open: false, id: null, nombre: '' });
      await load();
    } catch (e) {
      setError(e?.message || 'No se pudo eliminar');
    } finally { setDeletingEquipo(false); }
  };

  const columns = [
    { header: 'Equipo', accessor: 'nombre', cell: (v) => <span className="font-medium text-gray-800">{v}</span> },
    { header: 'Cliente', accessor: 'cliente_nombre', cell: (v, row) => {
        // Si es revendedor, formatear usando catálogo en memoria; si es cliente de servicio, usar nombre plano del backend
        const r = revendedores?.find(x => x.id === row.revendedor_id);
        return <span>{r ? formatClienteLargo(r) : (v || '—')}</span>;
      }
    },
    { header: 'Descripción', accessor: 'descripcion', cell: (v) => v || <span className="text-gray-400">—</span> },
    { header: 'Registrado', accessor: 'created_at', cell: (v) => (
        <span className="text-gray-700 font-medium" title={new Date(v).toISOString()}>
          {formatDateTime(v)}
        </span>
      )
    },
    { header: 'Estado', accessor: 'returned_at', cell: (v) => (
        v
          ? <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs"><CheckCircle className="w-3 h-3"/> Devuelto</span>
          : <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-full text-xs">En uso</span>
      )
    },
    { header: '', accessor: 'acciones', cell: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          {!row.returned_at && (
            <button
              onClick={async () => { await fichasService.devolverEquipo(row.id); await load(); }}
              className="p-2 text-green-700 hover:bg-green-50 rounded-lg"
              title="Marcar devuelto"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setConfirmEquipoDel({ open: true, id: row.id, nombre: row.nombre || '' })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ), tdClassName: 'text-right w-24'
    }
  ];

  return (
    <div className="w-full max-w-none mx-auto px-3 sm:px-4 md:px-5 lg:px-6 py-4 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Inventario de Equipos</h2>
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMostrarInventario(v => !v)}
            className={`w-full sm:w-auto justify-center inline-flex items-center px-3 py-2 rounded-lg border text-sm ${mostrarInventario ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white hover:bg-gray-50'}`}
            title="Inventario simple de equipos (por cantidad)"
          >
            {mostrarInventario ? 'Ocultar inventario simple' : 'Inventario simple'}
          </button>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} /> Ver inactivos
          </label>
        </div>
      </div>

      <form onSubmit={handleCreate} className="bg-white border rounded-xl p-4 md:p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nombre del equipo</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Antena, módem, router..."
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Cliente</label>
            <select
              value={form.revendedor_id}
              onChange={(e) => setForm(f => ({ ...f, revendedor_id: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecciona un cliente…</option>
              <optgroup label="Clientes de servicio">
                {clientesOrdenados.filter(c => c.type === 'cliente').map(c => (
                  <option key={c.id} value={c.id}>{c.display} #{c.refId}</option>
                ))}
              </optgroup>
              <optgroup label="Revendedores">
                {clientesOrdenados.filter(c => c.type === 'revendedor').map(c => (
                  <option key={c.id} value={c.id}>{c.display} #{c.refId}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Descripción</label>
            <input
              type="text"
              value={form.descripcion}
              onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Opcional: serie, detalles, ubicación"
            />
          </div>
        </div>
        <div className="flex">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </form>

      {/* Filtro por cliente ahora justo encima de la tabla */}
      <div className="bg-white border rounded-xl p-4 md:p-5 -mt-2">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex flex-col">
            <label className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Filtrar por cliente</label>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filtroCliente}
                onChange={(e)=> setFiltroCliente(e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm min-w-[240px]"
              >
                <option value="">Todos</option>
                <optgroup label="Revendedores">
                  {clientesActivos.filter(c=> c.tipo==='revendedor').map(c=> (
                    <option key={c.id} value={c.id}>{c.display} #{c.refId}</option>
                  ))}
                </optgroup>
                <optgroup label="Clientes servicio">
                  {clientesActivos.filter(c=> c.tipo==='cliente').map(c=> (
                    <option key={c.id} value={c.id}>{c.display} #{c.refId}</option>
                  ))}
                </optgroup>
              </select>
              {filtroCliente && (
                <button
                  type="button"
                  onClick={()=> setFiltroCliente('')}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
          {/* Espacio para futuros filtros (estado, rango fechas, etc.) */}
        </div>
      </div>

  <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          data={equipos}
          loading={loading}
          error={error}
          emptyMessage="Sin equipos registrados"
        />
      </div>

      {mostrarInventario && (
        <div className="bg-white border rounded-xl p-4 md:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Inventario simple (por cantidad)</h3>
          </div>

          {/* Formulario para crear/registrar ítems */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!invForm.nombre?.trim()) return;
              try {
                setInvSaving(true);
                await fichasService.crearEquipoInventario({
                  nombre: invForm.nombre.trim(),
                  cantidad: Number(invForm.cantidad || 0),
                  estado: invForm.estado,
                  descripcion: invForm.descripcion?.trim() || null
                });
                setInvForm({ nombre: '', cantidad: 0, estado: 'nuevo', descripcion: '' });
                await loadInventario();
              } catch (e) {
                setError(e?.message || 'No se pudo registrar en inventario');
              } finally {
                setInvSaving(false);
              }
            }}
            className="grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nombre</label>
              <input
                type="text"
                value={invForm.nombre}
                onChange={(e) => setInvForm(f => ({ ...f, nombre: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Módem, router, cable…"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Cantidad</label>
              <input
                type="number"
                min={0}
                value={invForm.cantidad}
                onChange={(e) => setInvForm(f => ({ ...f, cantidad: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Estado</label>
              <select
                value={invForm.estado}
                onChange={(e) => setInvForm(f => ({ ...f, estado: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="nuevo">Nuevo</option>
                <option value="usado">Usado</option>
                <option value="dañado">Dañado</option>
                <option value="reparación">Reparación</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Descripción</label>
              <input
                type="text"
                value={invForm.descripcion}
                onChange={(e) => setInvForm(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Opcional"
              />
            </div>
            <div className="md:col-span-4 flex items-center justify-end">
              <button type="submit" disabled={invSaving} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-60">
                <Plus className="w-4 h-4" /> Registrar
              </button>
            </div>
          </form>

          {/* Tabla de inventario */}
          <div className="border rounded-xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-left p-3">Cantidad</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3">Descripción</th>
                  <th className="text-right p-3 w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {invLoading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-500">Cargando…</td></tr>
                ) : invItems.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-400">Sin registros en inventario</td></tr>
                ) : (
                  invItems.map(item => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3 font-medium text-gray-800">{item.nombre}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          min={0}
                          defaultValue={item.cantidad}
                          onBlur={async (e) => {
                            const nueva = Number(e.target.value);
                            if (Number.isFinite(nueva) && nueva !== item.cantidad) {
                              try { await fichasService.actualizarEquipoInventario(item.id, { cantidad: nueva }); await loadInventario(); } catch (err) { setError(err?.message || 'No se pudo actualizar cantidad'); }
                            }
                          }}
                          className="w-24 border rounded-lg px-2 py-1"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          defaultValue={item.estado}
                          onChange={async (e) => {
                            try { await fichasService.actualizarEquipoInventario(item.id, { estado: e.target.value }); await loadInventario(); } catch (err) { setError(err?.message || 'No se pudo actualizar estado'); }
                          }}
                          className="border rounded-lg px-2 py-1"
                        >
                          <option value="nuevo">Nuevo</option>
                          <option value="usado">Usado</option>
                          <option value="dañado">Dañado</option>
                          <option value="reparación">Reparación</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          defaultValue={item.descripcion || ''}
                          onBlur={async (e) => {
                            const val = e.target.value;
                            if ((val || '') !== (item.descripcion || '')) {
                              try { await fichasService.actualizarEquipoInventario(item.id, { descripcion: val || null }); await loadInventario(); } catch (err) { setError(err?.message || 'No se pudo actualizar descripción'); }
                            }
                          }}
                          className="w-full border rounded-lg px-2 py-1"
                          placeholder="Opcional"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                          onClick={() => setConfirmInvDel({ open: true, id: item.id, nombre: item.nombre || '' })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación de equipo (compacta) */}
      <Modal open={confirmEquipoDel.open} onClose={() => setConfirmEquipoDel({ open: false, id: null, nombre: '' })} title="Eliminar equipo" size="sm">
        <div className="space-y-3 text-sm">
          <p>Esta acción no se puede deshacer. ¿Deseas eliminar el equipo {confirmEquipoDel.nombre ? `"${confirmEquipoDel.nombre}"` : 'seleccionado'}?</p>
          <div className="flex justify-end gap-2">
            <button className="px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50" onClick={() => setConfirmEquipoDel({ open: false, id: null, nombre: '' })}>Cancelar</button>
            <button className="px-2.5 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2" onClick={confirmarEliminarEquipo} disabled={deletingEquipo}>
              {deletingEquipo && <RefreshCw className="w-4 h-4 animate-spin" />} Eliminar
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmación de eliminación de inventario (compacta) */}
      <Modal open={confirmInvDel.open} onClose={() => setConfirmInvDel({ open: false, id: null, nombre: '' })} title="Eliminar registro de inventario" size="sm">
        <div className="space-y-3 text-sm">
          <p>Esta acción no se puede deshacer. ¿Deseas eliminar {confirmInvDel.nombre ? `"${confirmInvDel.nombre}"` : 'este registro'} del inventario?</p>
          <div className="flex justify-end gap-2">
            <button className="px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50" onClick={() => setConfirmInvDel({ open: false, id: null, nombre: '' })}>Cancelar</button>
            <button
              className="px-2.5 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
              onClick={async () => {
                if (!confirmInvDel.id) return;
                setDeletingInv(true);
                try { await fichasService.eliminarEquipoInventario(confirmInvDel.id); setConfirmInvDel({ open: false, id: null, nombre: '' }); await loadInventario(); }
                catch (err) { setError(err?.message || 'No se pudo eliminar'); }
                finally { setDeletingInv(false); }
              }}
              disabled={deletingInv}
            >
              {deletingInv && <RefreshCw className="w-4 h-4 animate-spin" />} Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Equipos;
