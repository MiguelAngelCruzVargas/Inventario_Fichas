import React, { useMemo } from 'react';

/**
 * FichaEntregaForm - formulario reutilizable para entregar fichas.
 * Props:
 *  revendedores: []
 *  stock: [] (objetos con tipo_ficha_id, tipo_ficha_nombre, cantidad_disponible)
 *  value: { revendedor_id, tipo_ficha_id, cantidad, nota }
 *  loading, message, error
 *  onChange(field, value)
 *  onSubmit()
 *  onReset()
 */
const FichaEntregaForm = ({
  revendedores = [],
  stock = [],
  value,
  loading = false,
  message,
  error,
  onChange,
  onSubmit,
  onReset
}) => {
  const selectedStock = useMemo(() => stock.find(s => s.tipo_ficha_id === Number(value.tipo_ficha_id)), [stock, value.tipo_ficha_id]);
  const maxCantidad = selectedStock ? selectedStock.cantidad_disponible : 0;
  const formValido = value.revendedor_id && value.tipo_ficha_id && value.cantidad && Number(value.cantidad) > 0 && Number(value.cantidad) <= maxCantidad;

  return (
    <form onSubmit={(e)=>{e.preventDefault(); if (formValido) onSubmit();}} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <select value={value.revendedor_id} onChange={(e)=>onChange('revendedor_id', e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" required>
            <option value="">Seleccione...</option>
            {revendedores
              .slice()
              .sort((a,b)=> (a.responsable||a.nombre||a.nombre_negocio||'').localeCompare(b.responsable||b.nombre||b.nombre_negocio||''))
              .map(r => {
                const persona = r.responsable || r.nombre || r.nombre_negocio || '—';
                const negocio = r.nombre_negocio && r.nombre_negocio !== persona ? ` — ${r.nombre_negocio}` : '';
                return <option key={r.id} value={r.id}>{`${persona}${negocio}`}#{r.id}</option>
              }) }
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Tipo de Ficha (Stock)</label>
          <select value={value.tipo_ficha_id} onChange={(e)=>onChange('tipo_ficha_id', e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" required>
            <option value="">Seleccione...</option>
            {stock.map(s => <option key={s.tipo_ficha_id} value={s.tipo_ficha_id}>{s.tipo_ficha_nombre} (disp: {s.cantidad_disponible})</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Cantidad</label>
          <input type="number" min={1} max={maxCantidad || 1} value={value.cantidad} onChange={(e)=>onChange('cantidad', e.target.value)} placeholder={selectedStock?`Máx ${maxCantidad}`:'—'} className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" required />
          {selectedStock && value.cantidad && (Number(value.cantidad) > maxCantidad) && (
            <span className="text-xs text-red-600 mt-1">Excede el stock disponible</span>
          )}
        </div>
        <div className="flex flex-col md:col-span-1">
          <label className="text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
          <input type="text" maxLength={120} value={value.nota} onChange={(e)=>onChange('nota', e.target.value)} placeholder="Referencia..." className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="text-xs text-gray-500">{selectedStock ? `Stock disponible: ${selectedStock.cantidad_disponible}` : 'Seleccione un tipo de ficha'}</div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onReset} className="px-4 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50" disabled={loading}>Limpiar</button>
          <button type="submit" disabled={!formValido || loading} className={`px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-colors ${formValido && !loading ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed'}`}>{loading ? 'Entregando...' : 'Entregar Fichas'}</button>
        </div>
      </div>
      {message && <div className="text-sm text-emerald-600 font-medium">{message}</div>}
      {error && <div className="text-sm text-red-600 font-medium">{error}</div>}
    </form>
  );
};

export default FichaEntregaForm;
