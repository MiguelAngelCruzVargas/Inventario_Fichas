// Tareas.jsx - Sistema de Gestión de Tareas Moderno y Optimizado
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Calendar, 
  User, 
  Building2, 
  Clock, 
  CheckCircle, 
  Flag, 
  MessageSquare, 
  Search, 
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Zap,
  RotateCw,
  Trash2,
  UserX // Icono para trabajadores inactivos
} from 'lucide-react';

// Asegúrate de que la ruta a tu contexto sea la correcta
import { useFichas } from '../../context/FichasContext';

// Componente de formulario reutilizable - FUERA del componente principal
const FormularioNuevaTarea = ({ 
  nuevaTarea, 
  setNuevaTarea, 
  handleAsignarTarea, 
  revendedores, 
  trabajadores, 
  prioridades, 
  isMobile = false 
}) => (
  <div className="space-y-4">
    <select 
      value={nuevaTarea.revendedorId || ''} 
      onChange={(e) => setNuevaTarea({...nuevaTarea, revendedorId: e.target.value})} 
      className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white text-sm"
    >
      <option value="">🏢 Seleccionar cliente</option>
      {(revendedores || []).map(r => <option key={r.id} value={r.id}>{r.nombre_negocio || r.nombre}</option>)}
    </select>
    <select 
      value={nuevaTarea.trabajadorId || ''} 
      onChange={(e) => setNuevaTarea({...nuevaTarea, trabajadorId: e.target.value})} 
      className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white text-sm"
    >
      <option value="">👨‍🔧 Asignar a técnico</option>
      {(trabajadores || []).map(t => <option key={t.id} value={t.id}>{t.nombre_completo}{t.especialidad ? ` - ${t.especialidad}` : ''}</option>)}
    </select>
    
    <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-1 gap-4'}`}>
      <input 
        type="text" 
        placeholder="Título de la tarea" 
        value={nuevaTarea.titulo || ''} 
        onChange={(e) => setNuevaTarea({...nuevaTarea, titulo: e.target.value})} 
        className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm" 
      />
      <select 
        value={nuevaTarea.prioridad || 'Media'} 
        onChange={(e) => setNuevaTarea({...nuevaTarea, prioridad: e.target.value})} 
        className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white text-sm"
      >
        {prioridades.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>

    <div className="relative">
      <textarea 
        placeholder="Descripción del problema..." 
        value={nuevaTarea.descripcion || ''} 
        onChange={(e) => {
          if (e.target.value.length <= 500) {
            setNuevaTarea({...nuevaTarea, descripcion: e.target.value});
          }
        }} 
        className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm resize-none" 
        rows="4"
        maxLength="500"
        style={{ resize: 'none' }}
      />
      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
        {(nuevaTarea.descripcion || '').length}/500
      </div>
    </div>
    <input 
      type="date" 
      value={nuevaTarea.fechaVencimiento || ''} 
      onChange={(e) => setNuevaTarea({...nuevaTarea, fechaVencimiento: e.target.value})} 
      className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm" 
    />
    <button 
      onClick={handleAsignarTarea} 
      disabled={!nuevaTarea.revendedorId || !nuevaTarea.trabajadorId || !nuevaTarea.titulo || !nuevaTarea.descripcion} 
      className="w-full bg-slate-900 hover:bg-slate-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 text-sm"
    >
      <Plus className="w-5 h-5" />
      <span>Asignar Tarea</span>
    </button>
  </div>
);

const Tareas = () => {
  const { 
    revendedores = [], 
    trabajadores = [], // Lista de trabajadores DISPONIBLES (activos) desde el contexto
    tareasMantenimiento = [], 
    loading,
    crearTarea,
    actualizarEstadoTarea,
    eliminarTarea,
    recargarTareas
  } = useFichas();
  
  const [nuevaTarea, setNuevaTarea] = useState({
    revendedorId: '',
    trabajadorId: '',
    titulo: '',
    descripcion: '',
    fechaVencimiento: new Date().toISOString().split('T')[0],
    prioridad: 'Media'
  });

  const resetFormulario = () => {
    setNuevaTarea({
      revendedorId: '',
      trabajadorId: '',
      titulo: '',
      descripcion: '',
      fechaVencimiento: new Date().toISOString().split('T')[0],
      prioridad: 'Media'
    });
  };

  const [modalNotas, setModalNotas] = useState(null);
  const [modalConfirmacion, setModalConfirmacion] = useState(null);
  const [modalReasignacion, setModalReasignacion] = useState(null); // Nuevo modal para reasignar
  const [notificacion, setNotificacion] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [seccionExpandida, setSeccionExpandida] = useState('nueva');

  const mostrarNotificacion = (tipo, titulo, mensaje) => {
    setNotificacion({ tipo, titulo, mensaje, duracion: 5000 });
  };

  useEffect(() => {
    if (notificacion) {
      const timer = setTimeout(() => setNotificacion(null), notificacion.duracion);
      return () => clearTimeout(timer);
    }
  }, [notificacion]);

  const handleAsignarTarea = async () => {
    if (!nuevaTarea.revendedorId || !nuevaTarea.trabajadorId || !nuevaTarea.titulo.trim() || !nuevaTarea.descripcion.trim()) {
      mostrarNotificacion('error', 'Campos incompletos', 'Por favor complete todos los campos requeridos.');
      return;
    }

    try {
      const tareaData = {
        revendedor_id: parseInt(nuevaTarea.revendedorId, 10),
        trabajador_id: parseInt(nuevaTarea.trabajadorId, 10),
        titulo: nuevaTarea.titulo.trim(),
        descripcion: nuevaTarea.descripcion.trim(),
        prioridad: nuevaTarea.prioridad,
        fecha_vencimiento: nuevaTarea.fechaVencimiento
      };
      
      const resultado = await crearTarea(tareaData);
      
      if (resultado.success) {
        resetFormulario();
        mostrarNotificacion('exito', 'Tarea Asignada', `La tarea "${tareaData.titulo}" fue creada exitosamente.`);
        recargarTareas(); // Es importante recargar para ver la nueva tarea
      } else {
        mostrarNotificacion('error', 'Error al asignar', resultado.error || 'No se pudo crear la tarea.');
      }
    } catch (error) {
      console.error('Error al asignar tarea:', error);
      mostrarNotificacion('error', 'Error Inesperado', 'Ocurrió un problema al comunicarse con el servidor.');
    }
  };

  const handleCambiarEstadoTarea = async (tareaId, nuevoEstado, notas = '') => {
    try {
      const resultado = await actualizarEstadoTarea(tareaId, nuevoEstado, notas);
      if (resultado.success) {
        mostrarNotificacion('exito', 'Estado Actualizado', `La tarea ha sido marcada como ${nuevoEstado.toLowerCase()}.`);
        recargarTareas();
      } else {
        mostrarNotificacion('error', 'Error al actualizar', resultado.error || 'No se pudo cambiar el estado.');
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      mostrarNotificacion('error', 'Error Inesperado', 'Ocurrió un problema al cambiar el estado.');
    }
  };
  
  const iniciarEliminacion = (tarea) => {
    setModalConfirmacion({
        titulo: 'Confirmar Eliminación',
        mensaje: `¿Estás seguro de que deseas eliminar la tarea "${tarea.titulo}"?\nEsta acción es permanente y no se puede deshacer.`,
        onConfirmar: () => handleEliminarTarea(tarea.id),
        onCancelar: () => setModalConfirmacion(null)
    });
  };

  const handleEliminarTarea = async (tareaId) => {
    try {
        const resultado = await eliminarTarea(tareaId);
        if (resultado.success) {
            mostrarNotificacion('exito', 'Tarea Eliminada', 'La tarea ha sido eliminada correctamente.');
            recargarTareas();
        } else {
            mostrarNotificacion('error', 'Error al eliminar', resultado.error || 'No se pudo eliminar la tarea.');
        }
    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        mostrarNotificacion('error', 'Error Inesperado', 'Ocurrió un problema al eliminar la tarea.');
    } finally {
        setModalConfirmacion(null);
    }
  };

  const enviarNotificacion = (tarea) => {
    const nombreTrabajador = tarea.nombre_trabajador || `ID: ${tarea.trabajador_id}`;
    mostrarNotificacion('exito', 'Notificación Enviada', `Mensaje enviado a ${nombreTrabajador} sobre: "${tarea.titulo}"`);
  };

  const iniciarReasignacion = (tarea) => {
    // Verificar si hay otros trabajadores disponibles para reasignar
    const trabajadoresDisponibles = trabajadores.filter(t => t.id !== tarea.trabajador_id);
    
    if (trabajadoresDisponibles.length === 0) {
      mostrarNotificacion('error', 'Sin técnicos disponibles', 
        'No hay otros técnicos activos disponibles para reasignar esta tarea. Considera agregar más técnicos al sistema o completar la tarea manualmente.');
      return;
    }

    setModalReasignacion({
      tarea: tarea,
      nuevoTrabajadorId: '',
      trabajadoresDisponibles: trabajadoresDisponibles
    });
  };

  const handleReasignarTarea = async () => {
    if (!modalReasignacion.nuevoTrabajadorId) {
      mostrarNotificacion('error', 'Selección requerida', 'Por favor selecciona un técnico para reasignar la tarea.');
      return;
    }

    try {
      const response = await fetch(`/api/tareas/${modalReasignacion.tarea.id}/reasignar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          nuevo_trabajador_id: parseInt(modalReasignacion.nuevoTrabajadorId, 10)
        })
      });

      const resultado = await response.json();
      
      if (resultado.success) {
        mostrarNotificacion('exito', 'Tarea Reasignada', resultado.message);
        setModalReasignacion(null);
        recargarTareas();
      } else {
        mostrarNotificacion('error', 'Error al reasignar', resultado.message || 'No se pudo reasignar la tarea.');
      }
    } catch (error) {
      console.error('Error al reasignar tarea:', error);
      mostrarNotificacion('error', 'Error Inesperado', 'Ocurrió un problema al reasignar la tarea.');
    }
  };

  // Lógica de filtrado y enriquecimiento de tareas
  const tareasFiltradas = useMemo(() => {
    const busquedaLower = busqueda.toLowerCase();

    // La API ya nos da casi todo, solo necesitamos encontrar el objeto del revendedor
    // Filtrar elementos válidos antes de procesar
    const tareasConRevendedor = (tareasMantenimiento || [])
      .filter(tarea => tarea && typeof tarea === 'object' && tarea.revendedor_id)
      .map(tarea => ({
        ...tarea,
        revendedor: (revendedores || []).find(r => r.id === tarea.revendedor_id),
      }));

    return tareasConRevendedor.filter(tarea => {
        // Solo ocultamos la tarea si el REVENDEDOR asociado ya no existe.
        if (!tarea.revendedor) {
          return false;
        }

        const cumpleBusqueda = !busqueda || 
          (tarea.titulo || '').toLowerCase().includes(busquedaLower) ||
          (tarea.revendedor?.nombre || tarea.revendedor?.nombre_negocio || '').toLowerCase().includes(busquedaLower) ||
          (tarea.nombre_trabajador || '').toLowerCase().includes(busquedaLower);
        
        const cumpleEstado = filtroEstado === 'todos' || (tarea.estado || '').toLowerCase() === filtroEstado;
        const cumplePrioridad = filtroPrioridad === 'todas' || (tarea.prioridad || '').toLowerCase() === filtroPrioridad;

        return cumpleBusqueda && cumpleEstado && cumplePrioridad;
      });
  }, [tareasMantenimiento, revendedores, busqueda, filtroEstado, filtroPrioridad]);
  
  const prioridades = ['Baja', 'Media', 'Alta', 'Urgente'];
  const getPrioridadInfo = (prioridad) => {
    const info = {
      'Baja': { color: 'bg-green-100 text-green-800', icon: Flag },
      'Media': { color: 'bg-yellow-100 text-yellow-800', icon: Flag },
      'Alta': { color: 'bg-orange-100 text-orange-800', icon: Zap },
      'Urgente': { color: 'bg-red-100 text-red-800', icon: Zap }
    };
    return info[prioridad] || { color: 'bg-gray-100 text-gray-800', icon: Flag };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg font-medium text-gray-600">Cargando Sistema de Tareas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-8">
        
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestión de Tareas</h1>
              <p className="text-gray-500 text-base mt-1">Mantenimiento y asignación de trabajos técnicos</p>
            </div>
          </div>
          <button
            onClick={recargarTareas}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center sm:justify-start space-x-2 shadow-sm"
          >
            <RotateCw className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <div className="sticky top-6 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Nueva Tarea</h2>
                    <p className="text-blue-600 text-sm font-medium">Asignación rápida</p>
                  </div>
                </div>
                <FormularioNuevaTarea 
                  nuevaTarea={nuevaTarea}
                  setNuevaTarea={setNuevaTarea}
                  handleAsignarTarea={handleAsignarTarea}
                  revendedores={revendedores}
                  trabajadores={trabajadores}
                  prioridades={prioridades}
                />
              </div>
            </div>
          </aside>

          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            
            <div className="lg:hidden space-y-4">
              <div className="bg-white rounded-xl border border-gray-200">
                <button onClick={() => setSeccionExpandida(seccionExpandida === 'nueva' ? '' : 'nueva')} className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3"><Plus className="w-5 h-5 text-blue-600" /> <span className="font-semibold">Nueva Tarea</span></div>
                  {seccionExpandida === 'nueva' ? <ChevronUp /> : <ChevronDown />}
                </button>
                {seccionExpandida === 'nueva' && <div className="p-4 border-t border-gray-200">
                  <FormularioNuevaTarea 
                    nuevaTarea={nuevaTarea}
                    setNuevaTarea={setNuevaTarea}
                    handleAsignarTarea={handleAsignarTarea}
                    revendedores={revendedores}
                    trabajadores={trabajadores}
                    prioridades={prioridades}
                    isMobile={true} 
                  />
                </div>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative group sm:col-span-3 lg:col-span-1">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar por título, cliente, técnico..." 
                    value={busqueda || ''} 
                    onChange={(e) => setBusqueda(e.target.value)} 
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-gray-50 hover:bg-white" 
                  />
                </div>
                <select 
                  value={filtroEstado || 'todos'} 
                  onChange={(e) => setFiltroEstado(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white text-sm"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="pendiente">Solo pendientes</option>
                  <option value="completado">Solo completadas</option>
                </select>
                <select 
                  value={filtroPrioridad || 'todas'} 
                  onChange={(e) => setFiltroPrioridad(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white text-sm"
                >
                  <option value="todas">Todas las prioridades</option>
                  {prioridades.map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Panel de Tareas</h2>
                <p className="text-gray-500 text-sm mt-1">Mostrando {tareasFiltradas.length} tareas</p>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {tareasFiltradas.length > 0 ? (
                  tareasFiltradas
                    .sort((a, b) => {
                      const prioridadOrder = { 'Urgente': 4, 'Alta': 3, 'Media': 2, 'Baja': 1 };
                      if (a.estado === 'Pendiente' && b.estado !== 'Pendiente') return -1;
                      if (a.estado !== 'Pendiente' && b.estado === 'Pendiente') return 1;
                      if (a.estado === 'Pendiente' && b.estado === 'Pendiente') {
                        if (prioridadOrder[a.prioridad] !== prioridadOrder[b.prioridad]) {
                            return (prioridadOrder[b.prioridad] || 0) - (prioridadOrder[a.prioridad] || 0);
                        }
                      }
                      return new Date(b.created_at) - new Date(a.created_at);
                    })
                    .map(tarea => {
                      const { revendedor } = tarea;
                      const { color, icon: PrioridadIcon } = getPrioridadInfo(tarea.prioridad);                                      const clienteInfo = revendedor.nombre_negocio || revendedor.nombre;
                                      const trabajadorInfo = tarea.nombre_trabajador || `ID Desconocido: ${tarea.trabajador_id}`;
                                      const isTrabajadorActivo = !!tarea.trabajador_activo;
                                      
                                      // Verificar si hay otros trabajadores disponibles para reasignación
                                      const trabajadoresDisponibles = trabajadores.filter(t => t.id !== tarea.trabajador_id);
                                      const puedeReasignar = !isTrabajadorActivo && trabajadoresDisponibles.length > 0;

                      return (
                        <div key={tarea.id} className={`border rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-300 ${!isTrabajadorActivo && tarea.estado === 'Pendiente' ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                          <div className={`${!isTrabajadorActivo && tarea.estado === 'Pendiente' ? 'bg-orange-100' : 'bg-gray-50'} px-5 py-4`}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">{tarea.titulo}</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-600">
                                  <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {clienteInfo}</span>
                                  
                                  <span className={`flex items-center gap-1.5 ${!isTrabajadorActivo && tarea.estado === 'Pendiente' ? 'text-orange-800 font-bold' : ''}`}>
                                    {!isTrabajadorActivo && tarea.estado === 'Pendiente' ? <UserX className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    {trabajadorInfo} {!isTrabajadorActivo && tarea.estado === 'Pendiente' && '(Inactivo)'}
                                  </span>

                                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Vence: {new Date(tarea.fecha_vencimiento).toLocaleDateString('es-MX', { timeZone: 'UTC' })}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}><PrioridadIcon className="w-4 h-4 mr-1.5" />{tarea.prioridad}</span>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${tarea.estado === 'Completado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {tarea.estado === 'Completado' ? <CheckCircle className="w-4 h-4 mr-1.5" /> : <Clock className="w-4 h-4 mr-1.5" />} {tarea.estado}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="p-5 bg-white">
                            <p className="text-gray-700 text-base mb-4">{tarea.descripcion}</p>
                            <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
                                <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
                                    {tarea.estado === 'Pendiente' ? (
                                        <>
                                            <button onClick={() => setModalNotas({ tareaId: tarea.id })} disabled={!isTrabajadorActivo} className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                                                <CheckCircle className="w-4 h-4 mr-2" />Completar
                                            </button>
                                            <button onClick={() => enviarNotificacion(tarea)} disabled={!isTrabajadorActivo} className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                                                <MessageSquare className="w-4 h-4 mr-2" />Notificar
                                            </button>
                                            {puedeReasignar && (
                                              <button onClick={() => iniciarReasignacion(tarea)} className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors">
                                                <User className="w-4 h-4 mr-2" />Reasignar
                                              </button>
                                            )}
                                            {!isTrabajadorActivo && !puedeReasignar && (
                                              <div className="flex-1 space-y-2">
                                                <div className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg border-2 border-gray-200 w-full">
                                                  <AlertTriangle className="w-4 h-4 mr-2" />
                                                  Sin técnicos disponibles
                                                </div>
                                                <div className="text-xs text-gray-500 text-center">
                                                  💡 <strong>Sugerencias:</strong> Agrega más técnicos al sistema o completa la tarea manualmente
                                                </div>
                                              </div>
                                            )}
                                        </>
                                    ) : (
                                      tarea.notas && (
                                        <div className="w-full p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                          <div className="flex items-start space-x-3">
                                            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                              <p className="font-semibold text-emerald-800">Tarea completada</p>
                                              <p className="text-sm text-gray-700 mt-1"><strong>Notas:</strong> {tarea.notas}</p>
                                              <p className="text-xs text-gray-500 mt-2">Finalizada el {new Date(tarea.fecha_completado).toLocaleString('es-MX')}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    )}
                                </div>
                                <div className="flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                                    <button onClick={() => iniciarEliminacion(tarea)} className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4 sm:mr-0" />
                                        <span className="sm:hidden ml-2">Eliminar Tarea</span>
                                    </button>
                                </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-16">
                    <Search className="mx-auto h-16 w-16 text-gray-300" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No se encontraron tareas</h3>
                    <p className="mt-1 text-base text-gray-500">Intenta ajustar los filtros o crea una nueva tarea.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {modalNotas && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Completar Tarea</h3>
            <p>Añade notas de finalización (opcional) para la tarea.</p>
            <div className="relative">
              <textarea 
                id="notasCompletado" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none" 
                rows="4" 
                maxLength="300"
                placeholder="Ej: Se reemplazó el disco duro y se reinstaló el sistema operativo..."
                style={{ resize: 'none' }}
                onInput={(e) => {
                  const counter = document.getElementById('notasCounter');
                  if (counter) counter.textContent = `${e.target.value.length}/300`;
                }}
              />
              <div id="notasCounter" className="absolute bottom-2 right-2 text-xs text-gray-400">
                0/300
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setModalNotas(null)} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button onClick={() => { const notas = document.getElementById('notasCompletado').value; handleCambiarEstadoTarea(modalNotas.tareaId, 'Completado', notas); setModalNotas(null); }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {modalConfirmacion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{modalConfirmacion.titulo}</h3>
              <p className="text-gray-600 whitespace-pre-line">{modalConfirmacion.mensaje}</p>
            </div>
            <div className="flex space-x-3">
              <button onClick={modalConfirmacion.onCancelar} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold transition-colors">Cancelar</button>
              <button onClick={modalConfirmacion.onConfirmar} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2">
                <Trash2 className="w-4 h-4" />
                <span>Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {modalReasignacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Reasignar Tarea</h3>
            <p className="text-gray-600">
              Reasignando la tarea "<strong>{modalReasignacion.tarea?.titulo}</strong>" a un nuevo técnico.
            </p>
            <select 
              value={modalReasignacion.nuevoTrabajadorId} 
              onChange={(e) => setModalReasignacion({...modalReasignacion, nuevoTrabajadorId: e.target.value})}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">👨‍🔧 Seleccionar nuevo técnico</option>
              {(modalReasignacion.trabajadoresDisponibles || []).map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre_completo}{t.especialidad ? ` - ${t.especialidad}` : ''}
                </option>
              ))}
            </select>
            {(modalReasignacion.trabajadoresDisponibles || []).length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  No hay otros técnicos activos disponibles para reasignar esta tarea.
                </p>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setModalReasignacion(null)} 
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button 
                onClick={handleReasignarTarea}
                disabled={!modalReasignacion.nuevoTrabajadorId}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg"
              >
                Reasignar Tarea
              </button>
            </div>
          </div>
        </div>
      )}

      {notificacion && (
        <div className="fixed top-5 right-5 z-[60] animate-in slide-in-from-right duration-300">
          <div className={`max-w-sm w-full rounded-xl shadow-lg border ${notificacion.tipo === 'exito' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="p-4 flex items-start space-x-3">
              <div className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center ${notificacion.tipo === 'exito' ? 'bg-green-500' : 'bg-red-500'}`}>
                {notificacion.tipo === 'exito' ? <CheckCircle className="w-4 h-4 text-white" /> : <AlertTriangle className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${notificacion.tipo === 'exito' ? 'text-green-800' : 'text-red-800'}`}>{notificacion.titulo}</p>
                <p className={`text-sm ${notificacion.tipo === 'exito' ? 'text-green-700' : 'text-red-700'}`}>{notificacion.mensaje}</p>
              </div>
              <button onClick={() => setNotificacion(null)} className="w-6 h-6 flex-shrink-0 rounded-full hover:bg-black/10 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tareas;
