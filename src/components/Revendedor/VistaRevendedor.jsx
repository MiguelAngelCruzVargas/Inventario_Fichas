// VistaRevendedor.jsx
import React from 'react';
import { 
  Package, 
  DollarSign, 
  Calendar, 
  Eye, 
  TrendingUp, 
  Building2, 
  User, 
  Phone, 
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  LogOut
} from 'lucide-react';

const VistaRevendedor = ({ 
  revendedores, 
  currentUser, 
  corteCaja, 
  historialCortes,
  tareasMantenimiento,
  onLogout
}) => {
  // Añadir verificaciones de seguridad para evitar errores
  // Buscar por revendedor_id, no por user id
  const misDatos = (revendedores || []).find(r => r.id === currentUser?.revendedor_id);
  const miCorte = corteCaja?.resumenPorRevendedor?.find(r => r.revendedor === misDatos?.nombre);
  
  // Los inventarios vienen incluidos en misDatos.inventarios
  const misInventarios = misDatos?.inventarios || [];
  
  // Obtener mis cortes de caja del historial
  const misCortesHistorial = historialCortes || [];
  const ultimoCorte = misCortesHistorial.length > 0 ? misCortesHistorial[0] : null; // Ordenados por fecha desc
  
  // Obtener información de porcentajes del último corte o usar valores por defecto
  const porcentajeRevendedor = ultimoCorte?.porcentaje_revendedor || 80;
  const porcentajeAdmin = ultimoCorte?.porcentaje_admin || 20;
  
  // Calcular totales acumulados de TODOS los cortes
  const totalesAcumulados = misCortesHistorial.reduce((totales, corte) => {
    return {
      totalVendidoAcumulado: totales.totalVendidoAcumulado + (corte.total_vendido || 0),
      totalComisionAcumulada: totales.totalComisionAcumulada + (corte.total_comision_revendedor || 0),
      totalTiposVendidos: totales.totalTiposVendidos + (corte.tipos_vendidos?.length || 0)
    };
  }, {
    totalVendidoAcumulado: 0,
    totalComisionAcumulada: 0,
    totalTiposVendidos: 0
  });
  
  // Filtrar mis tareas de mantenimiento - usar la estructura correcta
  const todasLasTareas = tareasMantenimiento || [];
  
  // Filtrar SOLO las tareas que pertenecen a este revendedor
  const misTareas = todasLasTareas.filter(tarea => {
    // Diferentes formas de relacionar tareas con revendedores:
    return (
      tarea.revendedor_id === misDatos?.id ||           // Si tiene revendedor_id directo
      tarea.revendedor_id === currentUser?.revendedor_id ||  // Si usa el revendedor_id del usuario
      tarea.ubicacion === misDatos?.nombre ||           // Si se relaciona por ubicación/nombre
      tarea.ubicacion === misDatos?.nombre_negocio ||   // Si se relaciona por nombre del negocio
      (tarea.trabajador_id && tarea.ubicacion && 
       (tarea.ubicacion.includes(misDatos?.nombre) || 
        tarea.ubicacion.includes(misDatos?.nombre_negocio))) // Si es por ubicación parcial
    );
  });
  
  // Las tareas se están cargando correctamente, quitar debug
  // console.log('✅ Tareas funcionando correctamente');
  
  // DEBUG temporal para cortes de caja - SOLO SI HAY PROBLEMAS
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Debug Cortes de Caja:', {
      'historialCortes length': historialCortes?.length || 0,
      'totalesAcumulados': totalesAcumulados,
      'ultimoCorte existe': !!ultimoCorte,
      'porcentajes': { porcentajeRevendedor, porcentajeAdmin }
    });

    // DEBUG: Si no hay cortes, mostrar información básica
    if (!historialCortes || historialCortes.length === 0) {
      console.log('⚠️ NO HAY CORTES para revendedor:', {
        'currentUser': currentUser?.username,
        'revendedor': misDatos?.nombre_negocio
      });
    }
  }
  
  const tareasPendientes = misTareas.filter(t => t.estado === 'Pendiente' || t.estado === 'pendiente');
  const tareasCompletadas = misTareas.filter(t => t.estado === 'Completado' || t.estado === 'completada' || t.estado === 'Completada');

  // Si no hay datos del usuario actual, mostrar loading o error
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

  // Si no hay datos del revendedor específico, mostrar error de permisos
  if (!misDatos) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error de Configuración
          </h2>
          <p className="text-gray-600 mb-4">
            No se pudieron cargar tus datos como revendedor. Esto puede ser debido a:
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-medium text-yellow-800 mb-2">⚠️ Posibles causas:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Error 403 en el servidor (verificar middleware de autenticación)</li>
              <li>• Tu cuenta no está vinculada correctamente a un revendedor</li>
              <li>• Problema de permisos en el backend</li>
              <li>• El servidor está experimentando problemas temporales</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-medium text-gray-900 mb-2">Información de debugging:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Usuario:</strong> {currentUser?.username || 'No definido'}</p>
              <p><strong>ID de usuario:</strong> {currentUser?.id || 'No definido'}</p>
              <p><strong>Rol:</strong> {currentUser?.role || currentUser?.tipo_usuario || 'No definido'}</p>
              <p><strong>ID de revendedor:</strong> {currentUser?.revendedor_id || 'No definido'}</p>
              <p><strong>Revendedores disponibles:</strong> {revendedores?.length || 0}</p>
              <p><strong>Estado autenticación:</strong> {currentUser ? 'Autenticado' : 'No autenticado'}</p>
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>🔄 Recargar Página</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full inline-flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Optimizado para móvil */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">
                  {misDatos?.nombre_negocio || misDatos?.nombre || 'Negocio'}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 truncate">
                  {currentUser?.nombre_completo || currentUser?.username}
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
        
        {/* Información Personal - Optimizada para móvil */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center space-x-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Mi Información</h2>
              <p className="text-gray-500 text-xs sm:text-sm">Datos de contacto y ubicación</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex items-center space-x-3 p-3 sm:p-4 bg-gray-50 rounded-xl">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-500">Negocio</p>
                <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                  {misDatos?.nombre_negocio || misDatos?.nombre}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 sm:p-4 bg-gray-50 rounded-xl">
              <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-500">Teléfono</p>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">{misDatos?.telefono}</p>
              </div>
            </div>
            
            {misDatos?.direccion && (
              <div className="flex items-center space-x-3 p-3 sm:p-4 bg-gray-50 rounded-xl sm:col-span-2 lg:col-span-1">
                <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Dirección</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                    {misDatos.direccion}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inventario Actual - Optimizado para móvil */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center space-x-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Mi Inventario Actual</h2>
              <p className="text-gray-500 text-xs sm:text-sm">Fichas disponibles para venta</p>
            </div>
          </div>
          
          {misInventarios && misInventarios.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Resumen de inventario - Cards responsivas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-emerald-50 p-3 sm:p-4 rounded-xl text-center">
                  <h4 className="font-semibold text-emerald-800 text-sm sm:text-base">Tipos de Fichas</h4>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600">{misInventarios.length}</p>
                </div>
                <div className="bg-blue-50 p-3 sm:p-4 rounded-xl text-center">
                  <h4 className="font-semibold text-blue-800 text-sm sm:text-base">Total Disponible</h4>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {misInventarios.reduce((total, inv) => total + (inv.stock_actual || 0), 0)}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 sm:p-4 rounded-xl text-center sm:col-span-1 col-span-1">
                  <h4 className="font-semibold text-purple-800 text-sm sm:text-base">Total Entregado</h4>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">
                    {misInventarios.reduce((total, inv) => total + (inv.fichas_entregadas || 0), 0)}
                  </p>
                </div>
              </div>

              {/* Lista de inventarios - Formato responsivo */}
              <div className="space-y-3 sm:hidden">
                {/* Vista móvil: Cards apiladas */}
                {misInventarios.map((inventario, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-semibold text-slate-600">
                            {inventario.tipo_ficha_nombre?.split(' ')[0] || 'F'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 text-sm">{inventario.tipo_ficha_nombre}</span>
                          <p className="text-xs text-gray-500">
                            {inventario.duracion_horas ? `${inventario.duracion_horas}h` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        (inventario.stock_actual || 0) > 0 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : (inventario.fichas_entregadas || 0) > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {(inventario.stock_actual || 0) > 0 
                          ? 'Disponible' 
                          : (inventario.fichas_entregadas || 0) > 0
                            ? 'Agotado'
                            : 'Sin Stock'
                        }
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Disponibles:</span>
                        <p className="font-semibold text-gray-900">{inventario.stock_actual || 0}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Entregadas:</span>
                        <p className="font-semibold text-gray-900">{inventario.fichas_entregadas || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista desktop: Tabla tradicional */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 rounded-xl">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-l-xl">Tipo de Ficha</th>
                      <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Duración</th>
                      <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Disponibles</th>
                      <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Entregado</th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-r-xl">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {misInventarios.map((inventario, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-xs font-semibold text-slate-600">
                                {inventario.tipo_ficha_nombre?.split(' ')[0] || 'F'}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">{inventario.tipo_ficha_nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center text-gray-600">
                          {inventario.duracion_horas ? `${inventario.duracion_horas}h` : 'N/A'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (inventario.stock_actual || 0) > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {inventario.stock_actual || 0}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center font-semibold text-gray-900">
                          {inventario.fichas_entregadas || 0}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (inventario.stock_actual || 0) > 0 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : (inventario.fichas_entregadas || 0) > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {(inventario.stock_actual || 0) > 0 
                              ? 'Disponible' 
                              : (inventario.fichas_entregadas || 0) > 0
                                ? 'Agotado'
                                : 'Sin Stock'
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <Package className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Sin inventario asignado</h3>
              <p className="text-gray-500 max-w-md mx-auto text-sm sm:text-base px-4">
                Aún no tienes fichas asignadas a tu inventario. 
                Contacta al administrador para recibir tus primeras entregas.
              </p>
            </div>
          )}
        </div>

        {/* Mis Tareas de Mantenimiento - Optimizada para móvil */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center space-x-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Mis Tareas de Mantenimiento</h2>
              <p className="text-gray-500 text-xs sm:text-sm">Trabajos técnicos programados para mi ubicación</p>
            </div>
          </div>

          {/* Resumen de Tareas - Cards responsivas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl text-center">
              <h4 className="font-semibold text-slate-800 text-sm sm:text-base">Total de Tareas</h4>
              <p className="text-xl sm:text-2xl font-bold text-slate-600">{misTareas.length}</p>
            </div>
            <div className="bg-amber-50 p-3 sm:p-4 rounded-xl text-center">
              <h4 className="font-semibold text-amber-800 text-sm sm:text-base">Pendientes</h4>
              <p className="text-xl sm:text-2xl font-bold text-amber-600">{tareasPendientes.length}</p>
            </div>
            <div className="bg-emerald-50 p-3 sm:p-4 rounded-xl text-center">
              <h4 className="font-semibold text-emerald-800 text-sm sm:text-base">Completadas</h4>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">{tareasCompletadas.length}</p>
            </div>
          </div>

          {/* Lista de Tareas - Optimizada para móvil */}
          <div className="space-y-3 sm:space-y-4">
            {misTareas.length > 0 ? (
              misTareas
                .sort((a, b) => {
                  // Pendientes primero, luego por prioridad
                  const aPendiente = a.estado === 'Pendiente' || a.estado === 'pendiente';
                  const bPendiente = b.estado === 'Pendiente' || b.estado === 'pendiente';
                  
                  if (aPendiente !== bPendiente) {
                    return aPendiente ? -1 : 1;
                  }
                  const prioridades = { 'Urgente': 4, 'Alta': 3, 'Media': 2, 'Baja': 1 };
                  return (prioridades[b.prioridad] || 0) - (prioridades[a.prioridad] || 0);
                })
                .map(tarea => (
                  <div key={tarea.id} className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-sm transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 gap-3">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{tarea.titulo}</h3>
                        <p className="text-gray-600 mb-3 text-sm sm:text-base">{tarea.descripcion}</p>
                        
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Asignada: {new Date(tarea.fecha_asignacion).toLocaleDateString('es-MX')}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Vencimiento: {new Date(tarea.fecha_vencimiento).toLocaleDateString('es-MX')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-row sm:flex-col items-start sm:items-end space-x-2 sm:space-x-0 sm:space-y-2">
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                          tarea.prioridad === 'Urgente' ? 'bg-red-100 text-red-800' :
                          tarea.prioridad === 'Alta' ? 'bg-orange-100 text-orange-800' :
                          tarea.prioridad === 'Media' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {tarea.prioridad}
                        </span>
                        
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                          tarea.estado === 'Completado' || tarea.estado === 'completada' || tarea.estado === 'Completada'
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {(tarea.estado === 'Completado' || tarea.estado === 'completada' || tarea.estado === 'Completada') && 
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
                          {(tarea.estado === 'Pendiente' || tarea.estado === 'pendiente') && 
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
                          {tarea.estado}
                        </span>
                      </div>
                    </div>
                    
                    {tarea.notas && (tarea.estado === 'Completado' || tarea.estado === 'completada' || tarea.estado === 'Completada') && (
                      <div className="mt-4 p-3 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-emerald-800 text-sm sm:text-base">Trabajo completado</div>
                            <div className="text-xs sm:text-sm text-gray-600 mt-1">
                              {tarea.fecha_completado && (
                                <span className="block">Finalizado el {new Date(tarea.fecha_completado).toLocaleDateString('es-MX')}</span>
                              )}
                              {tarea.notas && (
                                <div className="mt-1">
                                  <strong>Notas del técnico:</strong> {tarea.notas}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <AlertTriangle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" />
                <p className="text-sm sm:text-base">No tienes tareas de mantenimiento asignadas</p>
              </div>
            )}
          </div>
        </div>

        {/* Mis Cortes de Caja - Optimizada para móvil */}
        {misCortesHistorial.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Mis Cortes de Caja</h2>
                <p className="text-gray-500 text-xs sm:text-sm">Historial de mis cortes y comisiones</p>
              </div>
            </div>

            {/* Mostrar el último corte */}
            {ultimoCorte && (
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-100">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                  Resumen Total - Todos mis Cortes
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-white p-3 sm:p-4 rounded-xl text-center shadow-sm">
                    <h4 className="font-semibold text-emerald-800 mb-2 text-sm sm:text-base">Mi Ganancia Total</h4>
                    <p className="text-lg sm:text-2xl font-bold text-emerald-600">
                      ${totalesAcumulados.totalComisionAcumulada?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-xs text-emerald-700">{porcentajeRevendedor}% de las ventas</p>
                  </div>
                  
                  <div className="bg-white p-3 sm:p-4 rounded-xl text-center shadow-sm">
                    <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Total Vendido</h4>
                    <p className="text-lg sm:text-2xl font-bold text-blue-600">
                      ${totalesAcumulados.totalVendidoAcumulado?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-xs text-blue-700">Ventas totales</p>
                  </div>

                  <div className="bg-white p-3 sm:p-4 rounded-xl text-center shadow-sm">
                    <h4 className="font-semibold text-purple-800 mb-2 text-sm sm:text-base">Cortes Realizados</h4>
                    <p className="text-lg sm:text-2xl font-bold text-purple-600">
                      {misCortesHistorial.length}
                    </p>
                    <p className="text-xs text-purple-700">Histórico completo</p>
                  </div>
                </div>


              </div>
            )}

            {/* Mostrar todos los cortes si hay más de uno */}
            {misCortesHistorial.length > 1 && (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Historial Completo</h3>
                <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                  {misCortesHistorial.map((corte, index) => (
                    <div key={corte.id} className="p-3 sm:p-4 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                            Corte #{corte.id} - {new Date(corte.fecha).toLocaleDateString('es-MX')}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {corte.tipos_vendidos?.length || 0} tipos de fichas vendidas
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-semibold text-emerald-600 text-sm sm:text-base">
                            ${corte.total_comision_revendedor?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">Mi ganancia ({corte.porcentaje_revendedor || porcentajeRevendedor}%)</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <span className="text-gray-600">Total vendido:</span>
                          <p className="font-medium">${corte.total_vendido?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Mi ganancia ({corte.porcentaje_revendedor || porcentajeRevendedor}%):</span>
                          <p className="font-medium text-emerald-600">${corte.total_comision_revendedor?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Para admin ({corte.porcentaje_admin || porcentajeAdmin}%):</span>
                          <p className="font-medium text-purple-600">${corte.total_ganancia_admin?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center">
            <Calendar className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No hay cortes de caja disponibles</h3>
            <p className="text-gray-500 text-sm sm:text-base px-4">El administrador aún no ha realizado ningún corte de caja para tu negocio.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VistaRevendedor;