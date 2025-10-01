import React, { useEffect, useMemo, useState } from 'react';
import { ventasOcasionalesService, clientesService } from '@services';
import { useFichas } from '@context/FichasContext';

const VentasOcasionales = () => {
  const { tiposFicha = [], stockGlobal = [] } = useFichas();
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({ cliente_id: '', tipo_ficha_id: '', cantidad: '', precio_unitario: '', observaciones: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [ventas, setVentas] = useState([]);
  const [stockTipo, setStockTipo] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await clientesService.listar({ tipo: 'ocasional', activo: 1 });
        setClientes(res?.clientes || res || []);
      } catch (_) {
        setClientes([]);
      }
      try {
        const l = await ventasOcasionalesService.listar({ limite: 20 });
        if (l?.success) setVentas(l.ventas || []);
      } catch (_) {
        // ignore
      }
    };
    load();
  }, []);

  // Cuando cambia el tipo de ficha, precargar precio unitario por defecto y stock disponible
  useEffect(() => {
    const id = Number(form.tipo_ficha_id);
    const tf = tiposFicha.find(t => t.id === id);
    if (tf) {
      // Precio por defecto del tipo de ficha (precio_venta)
      const precioDefault = Number(tf.precio_venta || 0);
      setForm(f => ({ ...f, precio_unitario: precioDefault ? String(precioDefault) : f.precio_unitario }));
    }
    // Stock disponible de ese tipo (desde stockGlobal)
    const sg = stockGlobal?.find(s => s.tipo_ficha_id === id);
    setStockTipo(sg ? Number(sg.cantidad_disponible || 0) : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tipo_ficha_id, tiposFicha, stockGlobal]);

  const subtotal = useMemo(() => {
    const c = Number(form.cantidad || 0);
    const p = Number(form.precio_unitario || 0);
    return c > 0 && p > 0 ? (c * p).toFixed(2) : '0.00';
  }, [form.cantidad, form.precio_unitario]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    if (!form.cliente_id || !form.tipo_ficha_id || !form.cantidad || !form.precio_unitario) {
      setErr('Completa los campos requeridos');
      return;
    }
    try {
      setLoading(true);
      const res = await ventasOcasionalesService.crear({
        cliente_id: Number(form.cliente_id),
        tipo_ficha_id: Number(form.tipo_ficha_id),
        cantidad: Number(form.cantidad),
        precio_unitario: Number(form.precio_unitario),
        observaciones: form.observaciones?.trim() || undefined
      });
      setLoading(false);
      if (res?.success) {
        setMsg('Venta registrada');
        setForm({ cliente_id: '', tipo_ficha_id: '', cantidad: '', precio_unitario: '', observaciones: '' });
        setVentas(v => [res.venta, ...v].slice(0, 20));
      } else {
        setErr(res?.error || 'No se pudo registrar');
      }
    } catch (e2) {
      setLoading(false);
      setErr(e2?.message || 'Error de red');
    }
  };

  // Reglas de validación básicas
  const cantidadMax = stockTipo != null ? stockTipo : undefined;
  const cantidadVal = Number(form.cantidad || 0);
  const cantidadError = cantidadMax != null && cantidadVal > cantidadMax ? `Disponible: ${cantidadMax}` : '';

  return (
    <div className="w-full max-w-none mx-auto px-3 sm:px-4 md:px-5 lg:px-6 py-4 space-y-5">
      <div className="bg-white border rounded-xl p-4 md:p-5">
        <h2 className="text-lg font-semibold mb-4">Registrar venta a cliente ocasional</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select className="border rounded-lg px-3 py-2 w-full" value={form.cliente_id} onChange={e=>setForm(f=>({...f, cliente_id:e.target.value}))}>
            <option value="">Cliente ocasional</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}#{c.id}</option>)}
          </select>
          <div className="flex flex-col">
            <select className="border rounded-lg px-3 py-2 w-full" value={form.tipo_ficha_id} onChange={e=>setForm(f=>({...f, tipo_ficha_id:e.target.value}))}>
              <option value="">Tipo de ficha</option>
              {tiposFicha.map(tf => {
                const sg = stockGlobal?.find(s => s.tipo_ficha_id === tf.id);
                const disp = Number(sg?.cantidad_disponible ?? 0);
                const label = `${tf.nombre} ${Number.isFinite(disp) ? `(disp: ${disp})` : ''}`;
                return (
                  <option key={tf.id} value={tf.id} disabled={disp <= 0}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex flex-col">
            <input type="number" min="1" max={cantidadMax != null ? cantidadMax : undefined} className={`border rounded-lg px-3 py-2 w-full ${cantidadError ? 'border-red-500' : ''}`} placeholder="Cantidad" value={form.cantidad} onChange={e=>setForm(f=>({...f, cantidad:e.target.value}))} />
            {cantidadError && <span className="mt-1 text-xs text-red-600">{cantidadError}</span>}
          </div>
          <input type="number" step="0.01" min="0" className="border rounded-lg px-3 py-2 w-full" placeholder="Precio unitario" value={form.precio_unitario} onChange={e=>setForm(f=>({...f, precio_unitario:e.target.value}))} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-sm text-gray-600">Subtotal: <span className="font-semibold">${subtotal}</span></div>
            <button disabled={loading || !!cantidadError} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">Registrar</button>
          </div>
          <input className="md:col-span-5 border rounded-lg px-3 py-2" placeholder="Observaciones (opcional)" value={form.observaciones} onChange={e=>setForm(f=>({...f, observaciones:e.target.value}))} />
        </form>
        {msg && <div className="text-emerald-700 mt-3">{msg}</div>}
        {err && <div className="text-red-600 mt-3">{err}</div>}
      </div>

      <div className="bg-white border rounded-xl">
        <div className="px-4 py-3 border-b font-medium">Últimas ventas</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Cant</th>
                <th className="px-4 py-2">P. Unit</th>
                <th className="px-4 py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map(v => (
                <tr key={v.id} className="border-t">
                  <td className="px-4 py-2">{v.fecha_venta ? new Date(v.fecha_venta).toLocaleString('es-MX') : ''}</td>
                  <td className="px-4 py-2">{v.cliente_nombre}</td>
                  <td className="px-4 py-2">{v.tipo_ficha_nombre}</td>
                  <td className="px-4 py-2">{v.cantidad}</td>
                  <td className="px-4 py-2">${Number(v.precio_unitario).toFixed(2)}</td>
                  <td className="px-4 py-2">${Number(v.subtotal).toFixed(2)}</td>
                </tr>
              ))}
              {ventas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Sin ventas registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VentasOcasionales;
