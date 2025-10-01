import React, { useEffect, useState } from 'react';
import tareasService from '@services/tareasService';

const MisTareas = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tareas, setTareas] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const res = await tareasService.obtenerMisTareasCliente();
      if (res.success) {
        setTareas(res.tareas || []);
        setError('');
      } else {
        setError(res.error || 'Error al cargar tareas');
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="p-4">Cargando...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b font-medium">Mis tareas</div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-sm text-gray-600">
            <tr>
              <th className="px-4 py-2">Título</th>
              <th className="px-4 py-2">Descripción</th>
              <th className="px-4 py-2">Prioridad</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Vence</th>
            </tr>
          </thead>
          <tbody>
            {tareas.map(t => (
              <tr key={t.id} className="border-t text-sm">
                <td className="px-4 py-2">{t.titulo}</td>
                <td className="px-4 py-2">{t.descripcion}</td>
                <td className="px-4 py-2">{t.prioridad}</td>
                <td className="px-4 py-2">{t.estado}</td>
                <td className="px-4 py-2">{t.fecha_vencimiento ? new Date(t.fecha_vencimiento).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MisTareas;
