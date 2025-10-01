import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@context/AuthContext';
import { clientesPagosService } from '@services';

const Badge = ({ children, color = 'gray' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-${color}-100 text-${color}-800`}>{children}</span>
);

const MiServicio = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState({});

  const money = useMemo(() => (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0)), []);
  const fmtDate = (v) => {
    if (!v) return '—';
    try {
      const d = typeof v === 'string' && !v.includes('T') ? new Date(v + 'T00:00:00') : new Date(v);
      if (isNaN(d.getTime())) return v;
      return d.toLocaleDateString('es-MX');
    } catch { return String(v); }
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const res = await clientesPagosService.getMisPagos();
      if (res.success) {
        setPagos(res.pagos);
        setResumen(res.resumen || {});
        setError('');
      } else {
        setError(res.error || 'Error al cargar pagos');
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const estadoColor = (estado) => {
    switch (estado) {
      case 'pagado': return 'green';
      case 'pendiente': return 'yellow';
      case 'vencido': return 'red';
      case 'suspendido': return 'red';
      default: return 'gray';
    }
  };

  if (loading) return <div className="p-4">Cargando...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {!!(user?.nombre_completo || user?.username) && (
        <div className="text-sm text-gray-600">Cliente: <span className="font-medium text-gray-800">{user?.nombre_completo || user?.username}</span></div>
      )}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Próximo vencimiento</div>
          <div className="text-lg font-semibold">{resumen?.proximo ? `${resumen.proximo.periodo_month}/${resumen.proximo.periodo_year}` : '—'}</div>
          <div className="text-sm text-gray-600">{fmtDate(resumen?.proximo?.fecha_vencimiento)}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Vencidos</div>
          <div className="text-2xl font-bold text-red-600">{resumen?.vencidos ?? 0}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Pagados</div>
          <div className="text-2xl font-bold text-green-600">{resumen?.pagados ?? 0}</div>
        </div>
      </section>

      <section className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b font-medium">Historial de pagos</div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-sm text-gray-600">
              <tr>
                <th className="px-4 py-2">Periodo</th>
                <th className="px-4 py-2">Vencimiento</th>
                <th className="px-4 py-2">Monto</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Pagado</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map(p => (
                <tr key={p.id} className="border-t text-sm">
                  <td className="px-4 py-2">{p.periodo_month}/{p.periodo_year}</td>
                  <td className="px-4 py-2">{fmtDate(p.fecha_vencimiento)}</td>
                  <td className="px-4 py-2">{money(p.monto)}</td>
                  <td className="px-4 py-2"><Badge color={estadoColor(p.estado)}>{p.estado}</Badge></td>
                  <td className="px-4 py-2">{p.pagado_at ? new Date(p.pagado_at).toLocaleString('es-MX') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default MiServicio;
