// VistaTrabajador.jsx
import React, { useState, useEffect } from 'react';
import { tareasService } from '../../services/tareasService';
import { 
  CheckCircle, 
  Clock, 
  User, 
  Building2, 
  Calendar, 
  AlertTriangle, 
  MessageSquare, 
  Flag, 
  Zap, 
  Target,
  LogOut,
  Award,
  TrendingUp,
  X,
  FileText
} from 'lucide-react';

// Modal personalizada para notas de trabajo
const ModalNotas = ({ isOpen, onClose, onConfirm, titulo = "Completar Tarea" }) => {
  const [notas, setNotas] = useState('');

  // Resetear notas cuando se abre la modal
  useEffect(() => {
    if (isOpen) {
      setNotas('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(notas);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleConfirm();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{titulo}</h3>
              <p className="text-sm text-gray-500">Agregar notas del trabajo realizado</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <FileText className="w-4 h-4 inline mr-2" />
            Notas del trabajo realizado (opcional):
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe brevemente el trabajo realizado, observaciones importantes, materiales utilizados, etc."
            className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none text-sm"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">
            Presiona Ctrl+Enter para completar rápidamente
          </p>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
          >
            Completar Tarea
          </button>
        </div>
      </div>
    </div>
  );
};

const VistaTrabajador = ({ 
  revendedores, 
  currentUser,
  onLogout 
}) => {
  const [filtro, setFiltro] = useState('pendientes');
  const [misTareas, setMisTareas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado para el modal de notas
  const [modalNotasAbierto, setModalNotasAbierto] = useState(false);
  const [tareaCompletandoId, setTareaCompletandoId] = useState(null);

  // Cargar mis tareas al montar el componente
  useEffect(() => {
    cargarMisTareas();
  }, []);

  const cargarMisTareas = async () => {
    try {
      setCargando(true);
      setError(null);
      console.log('🔍 Cargando tareas del trabajador...');
      
      const resultado = await tareasService.obtenerMisTareas();
      
      if (resultado.success) {
        console.log('✅ Tareas cargadas:', resultado.tareas);
        setMisTareas(resultado.tareas || []);
      } else {
        console.error('❌ Error al cargar tareas:', resultado.error);
        setError(resultado.error);
      }
    } catch (error) {
      console.error('❌ Error al cargar tareas:', error);
      setError('Error al cargar las tareas');
    } finally {
      setCargando(false);
    }
  };
  
  // Filtrar tareas por estado
  const tareasPendientes = misTareas.filter(t => t.estado === 'Pendiente');
  const tareasEnProgreso = misTareas.filter(t => t.estado === 'En Progreso');
  const tareasCompletadas = misTareas.filter(t => t.estado === 'Completado');

  // Si no hay datos del usuario actual, mostrar loading
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del usuario...</p>
        </div>
      </div>
    );
  }

  // Si está cargando las tareas
  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tus tareas...</p>
        </div>
      </div>
    );
  }

  // Si hay error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar tareas</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={cargarMisTareas}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const completarTarea = async (tareaId, notas) => {
    try {
      const resultado = await tareasService.actualizarEstadoMiTarea(tareaId, 'Completado', notas);
      if (resultado.success) {
        // Actualizar el estado local
        const tareasActualizadas = misTareas.map(t =>
          t.id === tareaId
            ? { ...t, estado: 'Completado', notas, fecha_completado: new Date().toISOString().split('T')[0] }
            : t
        );
        setMisTareas(tareasActualizadas);
      } else {
        console.error('Error al completar tarea:', resultado.error);
        setError(resultado.error);
      }
    } catch (error) {
      console.error('Error al completar tarea:', error);
      setError('Error al completar la tarea');
    }
  };

  const abrirModalCompletar = (tareaId) => {
    setTareaCompletandoId(tareaId);
    setModalNotasAbierto(true);
  };

  const manejarConfirmacionModal = (notas) => {
    if (tareaCompletandoId) {
      completarTarea(tareaCompletandoId, notas || '');
      setTareaCompletandoId(null);
    }
  };

  const cerrarModal = () => {
    setModalNotasAbierto(false);
    setTareaCompletandoId(null);
  };

  const iniciarTarea = async (tareaId) => {
    try {
      const resultado = await tareasService.actualizarEstadoMiTarea(tareaId, 'En Progreso', '');
      if (resultado.success) {
        // Actualizar el estado local
        const tareasActualizadas = misTareas.map(t =>
          t.id === tareaId
            ? { ...t, estado: 'En Progreso' }
            : t
        );
        setMisTareas(tareasActualizadas);
      } else {
        console.error('Error al iniciar tarea:', resultado.error);
        setError(resultado.error);
      }
    } catch (error) {
      console.error('Error al iniciar tarea:', error);
      setError('Error al iniciar la tarea');
    }
  };

  const getPrioridadColor = (prioridad) => {
    const colores = {
      'Baja': 'bg-green-100 text-green-800 border-green-200',
      'Media': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Alta': 'bg-orange-100 text-orange-800 border-orange-200',
      'Urgente': 'bg-red-100 text-red-800 border-red-200'
    };
    return colores[prioridad] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPrioridadIcon = (prioridad) => {
    return prioridad === 'Urgente' || prioridad === 'Alta' ? Zap : Flag;
  };

  const tareasFiltradas = filtro === 'pendientes' ? tareasPendientes : 
                         filtro === 'progreso' ? tareasEnProgreso :
                         filtro === 'completadas' ? tareasCompletadas : misTareas;

  // Calcular estadísticas de rendimiento
  const tasaCompletado = misTareas.length > 0 ? (tareasCompletadas.length / misTareas.length) * 100 : 0;
  const tareasUrgentesCompletadas = tareasCompletadas.filter(t => t.prioridad === 'Urgente' || t.prioridad === 'Alta').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Optimizado para móvil */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">Panel del Técnico</h1>
                <p className="text-sm sm:text-base text-gray-600">
                  <span className="font-medium">
                    {currentUser.nombre_completo || currentUser.nombre || currentUser.username || 'Usuario'}
                  </span>
                  {(currentUser.especialidad) && (
                    <>
                      <span className="mx-1 sm:mx-2">-</span>
                      <span className="text-blue-600 font-medium">{currentUser.especialidad}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors px-3 py-2 rounded-xl hover:bg-red-50 text-sm sm:text-base"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Resumen y Estadísticas - Optimizado para móvil */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide truncate">Total</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{misTareas.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide truncate">Pendientes</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-amber-600">{tareasPendientes.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide truncate">Progreso</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{tareasEnProgreso.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide truncate">Completadas</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{tareasCompletadas.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Quinta card para eficiencia - solo visible en lg+ */}
          <div className="hidden lg:block lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-slate-500" />
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Eficiencia</p>
                </div>
                <p className="text-3xl font-bold text-blue-600">{tasaCompletado.toFixed(0)}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros de Tareas - Optimizado para móvil */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Mis Tareas</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFiltro('pendientes')}
                className={`px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  filtro === 'pendientes' 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="hidden sm:inline">Pendientes </span>
                <span className="sm:hidden">Pend. </span>
                ({tareasPendientes.length})
              </button>
              <button
                onClick={() => setFiltro('progreso')}
                className={`px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  filtro === 'progreso' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="hidden sm:inline">En Progreso </span>
                <span className="sm:hidden">Prog. </span>
                ({tareasEnProgreso.length})
              </button>
              <button
                onClick={() => setFiltro('completadas')}
                className={`px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  filtro === 'completadas' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="hidden sm:inline">Completadas </span>
                <span className="sm:hidden">Comp. </span>
                ({tareasCompletadas.length})
              </button>
              <button
                onClick={() => setFiltro('todas')}
                className={`px-3 py-2 rounded-xl font-medium transition-colors text-sm ${
                  filtro === 'todas' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas ({misTareas.length})
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Tareas */}
        <div className="space-y-6">
          {tareasFiltradas.length > 0 ? (
            tareasFiltradas
              .sort((a, b) => {
                // Prioridad: Urgentes primero, luego por fecha
                if (a.estado === 'Pendiente' && b.estado === 'Pendiente') {
                  const prioridades = { 'Urgente': 4, 'Alta': 3, 'Media': 2, 'Baja': 1 };
                  const difPrioridad = (prioridades[b.prioridad] || 0) - (prioridades[a.prioridad] || 0);
                  if (difPrioridad !== 0) return difPrioridad;
                }
                // Comparar por fecha de vencimiento
                const fechaA = a.fecha_vencimiento ? new Date(a.fecha_vencimiento) : new Date();
                const fechaB = b.fecha_vencimiento ? new Date(b.fecha_vencimiento) : new Date();
                return fechaA - fechaB;
              })
              .map(tarea => {
                // Mapear los campos del backend al formato esperado por el frontend
                const tareaFormateada = {
                  ...tarea,
                  revendedorId: tarea.revendedor_id,
                  trabajadorId: tarea.trabajador_id,
                  fechaAsignacion: tarea.fecha_asignacion ? new Date(tarea.fecha_asignacion).toISOString().split('T')[0] : null,
                  fechaVencimiento: tarea.fecha_vencimiento ? new Date(tarea.fecha_vencimiento).toISOString().split('T')[0] : null,
                  fechaCompletado: tarea.fecha_completado ? new Date(tarea.fecha_completado).toISOString().split('T')[0] : null,
                };
                
                // Crear objeto revendedor desde los campos del join
                const revendedor = {
                  id: tarea.revendedor_id,
                  nombre: tarea.nombre_revendedor,
                  responsable: tarea.responsable_revendedor,
                  telefono: tarea.telefono_revendedor
                };
                
                const PrioridadIcon = getPrioridadIcon(tareaFormateada.prioridad);
                
                return (
                  <div key={tareaFormateada.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header de la Tarea - Optimizado para móvil */}
                    <div className="bg-gray-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                        <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 break-words">{tareaFormateada.titulo}</h3>
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-gray-600">
                              <span className="flex items-center">
                                <Building2 className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span className="truncate">{revendedor?.nombre || 'Cliente no especificado'}</span>
                              </span>
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span className="truncate">
                                  <span className="sm:hidden">Asig: </span>
                                  <span className="hidden sm:inline">Asignada: </span>
                                  {tareaFormateada.fechaAsignacion ? new Date(tareaFormateada.fechaAsignacion).toLocaleDateString('es-MX') : 'Sin fecha'}
                                </span>
                              </span>
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span className="truncate">
                                  <span className="sm:hidden">Venc: </span>
                                  <span className="hidden sm:inline">Vencimiento: </span>
                                  {tareaFormateada.fechaVencimiento ? new Date(tareaFormateada.fechaVencimiento).toLocaleDateString('es-MX') : 'Sin límite'}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-row lg:flex-col items-start lg:items-end space-x-3 lg:space-x-0 lg:space-y-3 flex-shrink-0">
                          <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${getPrioridadColor(tareaFormateada.prioridad)}`}>
                            <PrioridadIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            <span className="hidden sm:inline">{tareaFormateada.prioridad}</span>
                            <span className="sm:hidden">{tareaFormateada.prioridad.charAt(0)}</span>
                          </span>
                          
                          <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                            tareaFormateada.estado === 'Completado' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : tareaFormateada.estado === 'En Progreso'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {tareaFormateada.estado === 'Completado' && <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
                            {tareaFormateada.estado === 'En Progreso' && <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
                            {tareaFormateada.estado === 'Pendiente' && <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
                            <span className="hidden sm:inline">{tareaFormateada.estado}</span>
                            <span className="sm:hidden">
                              {tareaFormateada.estado === 'Completado' && 'Comp'}
                              {tareaFormateada.estado === 'En Progreso' && 'Prog'}
                              {tareaFormateada.estado === 'Pendiente' && 'Pend'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contenido de la Tarea - Optimizado para móvil */}
                    <div className="p-4 sm:p-6 lg:p-8">
                      <div className="mb-4 sm:mb-6">
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Descripción del Trabajo</h4>
                        <p className="text-gray-700 leading-relaxed text-sm sm:text-base break-words">{tareaFormateada.descripcion}</p>
                      </div>

                      {/* Información del Cliente - Optimizado para móvil */}
                      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-xl">
                        <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Información del Cliente</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 block">Negocio:</span>
                            <p className="font-medium text-gray-900 break-words">{revendedor?.nombre || 'No especificado'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Responsable:</span>
                            <p className="font-medium text-gray-900 break-words">{revendedor?.responsable || 'No especificado'}</p>
                          </div>
                          <div className="sm:col-span-2 lg:col-span-1">
                            <span className="text-gray-500 block">Teléfono:</span>
                            <p className="font-medium text-gray-900">{revendedor?.telefono || 'No especificado'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Acciones para Tareas Pendientes - Optimizado para móvil */}
                      {tareaFormateada.estado === 'Pendiente' && (
                        <div className="border-t border-gray-100 pt-4 sm:pt-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                            <div className="text-sm text-gray-600">
                              ¿Listo para comenzar este trabajo?
                            </div>
                            <button
                              onClick={() => iniciarTarea(tareaFormateada.id)}
                              className="inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-colors text-sm sm:text-base w-full sm:w-auto"
                            >
                              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                              <span>Iniciar Trabajo</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Acciones para Tareas En Progreso - Optimizado para móvil */}
                      {tareaFormateada.estado === 'En Progreso' && (
                        <div className="border-t border-gray-100 pt-4 sm:pt-6">
                          <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200 mb-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-blue-800 mb-1 text-sm sm:text-base">Trabajo en Progreso</div>
                                <div className="text-sm text-blue-600">
                                  Este trabajo está actualmente en desarrollo.
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                            <div className="text-sm text-gray-600">
                              ¿Has completado este trabajo?
                            </div>
                            <button
                              onClick={() => abrirModalCompletar(tareaFormateada.id)}
                              className="inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-colors text-sm sm:text-base w-full sm:w-auto"
                            >
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                              <span className="hidden sm:inline">Marcar como Completado</span>
                              <span className="sm:hidden">Completar</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Información de Finalización - Optimizado para móvil */}
                      {tareaFormateada.estado === 'Completado' && (
                        <div className="border-t border-gray-100 pt-4 sm:pt-6">
                          <div className="bg-emerald-50 rounded-xl p-4 sm:p-6 border border-emerald-200">
                            <div className="flex items-start space-x-3">
                              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-emerald-800 mb-1 text-sm sm:text-base">Trabajo Completado</div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  {tareaFormateada.fechaCompletado && (
                                    <p>Finalizado el {new Date(tareaFormateada.fechaCompletado).toLocaleDateString('es-MX')}</p>
                                  )}
                                  {tareaFormateada.notas && (
                                    <div>
                                      <p className="font-medium text-gray-700 mt-2">Notas del trabajo:</p>
                                      <p className="text-gray-700 bg-white p-3 rounded-lg mt-1 border border-emerald-200 break-words">
                                        {tareaFormateada.notas}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                {filtro === 'pendientes' && <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />}
                {filtro === 'progreso' && <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />}
                {filtro === 'completadas' && <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />}
                {filtro === 'todas' && <Target className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />}
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                {filtro === 'pendientes' && 'No tienes tareas pendientes'}
                {filtro === 'progreso' && 'No tienes tareas en progreso'}
                {filtro === 'completadas' && 'No has completado tareas aún'}
                {filtro === 'todas' && 'No tienes tareas asignadas'}
              </h3>
              <p className="text-gray-500 text-sm sm:text-base">
                {filtro === 'pendientes' && '¡Excelente trabajo! Todas tus tareas están al día.'}
                {filtro === 'progreso' && 'Las tareas en desarrollo aparecerán aquí.'}
                {filtro === 'completadas' && 'Las tareas completadas aparecerán aquí.'}
                {filtro === 'todas' && 'El administrador aún no te ha asignado tareas de mantenimiento.'}
              </p>
            </div>
          )}
        </div>

        {/* Rendimiento Personal - Optimizado para móvil */}
        {tareasCompletadas.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Mi Rendimiento</h2>
                <p className="text-gray-500 text-sm">Estadísticas de trabajos completados</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center p-4 sm:p-6 bg-emerald-50 rounded-xl">
                <h4 className="font-semibold text-emerald-800 mb-2 text-sm sm:text-base">Tasa de Completado</h4>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{tasaCompletado.toFixed(0)}%</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">de tareas asignadas</p>
              </div>
              
              <div className="text-center p-4 sm:p-6 bg-orange-50 rounded-xl">
                <h4 className="font-semibold text-orange-800 mb-2 text-sm sm:text-base">Tareas Urgentes</h4>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600">{tareasUrgentesCompletadas}</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">completadas</p>
              </div>
              
              <div className="text-center p-4 sm:p-6 bg-blue-50 rounded-xl sm:col-span-3 lg:col-span-1">
                <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Total Completadas</h4>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{tareasCompletadas.length}</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">trabajos finalizados</p>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-slate-50 rounded-xl">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progreso general</span>
                <span>{tasaCompletado.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${tasaCompletado}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal para completar tarea */}
      <ModalNotas
        isOpen={modalNotasAbierto}
        onClose={cerrarModal}
        onConfirm={manejarConfirmacionModal}
        titulo="Completar Tarea"
      />
    </div>
  );
};

export default VistaTrabajador;