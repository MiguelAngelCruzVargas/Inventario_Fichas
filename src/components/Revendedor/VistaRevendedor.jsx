// VistaRevendedor.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { tareasService } from '../../services/tareasService';
import { 
  Package, 
  DollarSign, 
  Calendar, 
  Eye, 
  TrendingUp, 
  Building2, 
  User, 
  Phone, 
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
  loading, // nuevo: estado de carga del contexto
  onLogout
}) => {
  // Estado UI
  const [activeTab, setActiveTab] = useState('resumen');
  const location = useLocation?.() || { search: '' };
  const navigate = useNavigate?.();
  const [expandedCortes, setExpandedCortes] = useState({}); // { [corteId]: boolean }
  const [graceExpired, setGraceExpired] = useState(false);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    const graceTimer = setTimeout(() => setGraceExpired(true), 1200); // 1.2s
    return () => clearTimeout(graceTimer);
  }, []);
  // Restaurar pestaña activa desde URL (?tab) o localStorage al montar/cambiar URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const tabFromQuery = params.get('tab');
      const allowed = ['resumen','inventario','tareas','cortes'];
      if (tabFromQuery && allowed.includes(tabFromQuery)) {
        setActiveTab(tabFromQuery);
        localStorage.setItem('revendedor.activeTab', tabFromQuery);
      } else {
        const stored = localStorage.getItem('revendedor.activeTab');
        if (stored && allowed.includes(stored)) setActiveTab(stored);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Persistir cambios de pestaña
  useEffect(() => {
    try { localStorage.setItem('revendedor.activeTab', activeTab); } catch {}
  }, [activeTab]);

  const initialPendingWindow = Date.now() - mountTimeRef.current < 4000; // El contexto espera 3s antes de cargar

  // Toggle detalle de un corte
  const toggleCorteDetalle = (corteId) => {
    if (corteId == null) return;
    setExpandedCortes(prev => ({ ...prev, [corteId]: !prev[corteId] }));
  };

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

  // Refetch pro-activo al entrar a la pestaña de tareas si está vacía (cubre caso sin SSE previo)
  useEffect(() => {
    let abort = false;
    const intentarRefetch = async () => {
      if (activeTab === 'tareas' && misDatos?.id) {
        // Si no hay tareas cargadas aún, intentar obtenerlas del backend
        if (misTareas.length === 0) {
          try {
            const resp = await tareasService.obtenerMisTareasRevendedor();
            if (!abort && resp.success && resp.tareas?.length) {
              console.log('🛰️ Refetch tareas al abrir pestaña (catch-up):', resp.tareas.length);
              // No tenemos setter directo aquí; confiamos en SSE / context? -> fallback: disparar evento global
              window.dispatchEvent(new CustomEvent('revendedor-tareas-refetch', { detail: resp.tareas }));
            }
          } catch (e) {
            console.warn('⚠️ Error refetch tareas pestaña revendedor:', e);
          }
        }
      }
    };
    intentarRefetch();
    return () => { abort = true; };
  }, [activeTab, misTareas.length, misDatos?.id]);

  // Listener para inyectar tareas recibidas del refetch directo (sin duplicar lógica en contexto)
  useEffect(() => {
    const handler = (e) => {
      try {
        const nuevas = e.detail || [];
        if (Array.isArray(nuevas) && nuevas.length) {
          // Merge superficial evitando duplicados por id
          const mapa = new Map();
            [...todasLasTareas, ...nuevas].forEach(t => mapa.set(t.id, t));
          // No tenemos setTareasMantenimiento aquí; idealmente deberíamos levantar un callback vía props
          // Como fallback temporal: almacenar en window para que contexto pueda optar por leer (si se implementa)
          window.__ultimaListaTareasRevendedor = Array.from(mapa.values());
        }
      } catch {}
    };
    window.addEventListener('revendedor-tareas-refetch', handler);
    return () => window.removeEventListener('revendedor-tareas-refetch', handler);
  }, [todasLasTareas]);

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
  // Evitar mostrar error de configuración mientras todavía estamos cargando
  if (!misDatos && (loading || !graceExpired || initialPendingWindow)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Cargando datos del revendedor...</p>
          <p className="text-gray-400 text-sm mt-2">Preparando tu panel</p>
        </div>
      </div>
    );
  }

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
        <div className="w-full px-3 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-2xl font-semibold text-gray-900 truncate">
                  {misDatos?.nombre_negocio || misDatos?.nombre || 'Negocio'}
                </h1>
                <p className="text-xs sm:text-base text-gray-600 truncate">
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
          {/* Tabs (Desktop/Tablet) */}
          <div className="hidden sm:flex flex-wrap gap-2 pb-4">
            {[
              { key: 'resumen', label: 'Resumen' },
              { key: 'inventario', label: 'Inventario' },
              { key: 'tareas', label: 'Tareas' },
              { key: 'cortes', label: 'Cortes de Caja' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  try {
                    const params = new URLSearchParams(location.search || '');
                    params.set('tab', tab.key);
                    navigate && navigate({ search: params.toString() }, { replace: false });
                  } catch {}
                }}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

  <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-8 space-y-4 sm:space-y-8 pb-[4.5rem] sm:pb-8" style={{ paddingBottom: 'max(4.5rem, env(safe-area-inset-bottom))' }}>
        
  {/* Información Personal (Resumen) */}
  {activeTab === 'resumen' && (
  <div id="section-info" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6 lg:p-8">
          <div className="flex items-center space-x-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Mi Información</h2>
              <p className="text-gray-500 text-xs sm:text-sm">Datos de contacto</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Nombre (siempre primero) */}
            <div className="flex items-center space-x-3 p-3 sm:p-4 bg-gray-50 rounded-xl">
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-500">Nombre</p>
                <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                  {currentUser?.nombre_completo || misDatos?.responsable || misDatos?.nombre || currentUser?.username}
                </p>
              </div>
            </div>

            {/* Negocio (si tiene) */}
            {misDatos?.nombre_negocio && (
              <div className="flex items-center space-x-3 p-3 sm:p-4 bg-gray-50 rounded-xl">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Negocio</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{misDatos.nombre_negocio}</p>
                </div>
              </div>
            )}

            {/* Teléfono (si tiene) */}
            {misDatos?.telefono && (
              <div className="flex items-center space-x-3 p-3 sm:p-4 bg-gray-50 rounded-xl">
                <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Teléfono</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{misDatos.telefono}</p>
                </div>
              </div>
            )}

          </div>
    </div>
    )}

    {/* Inventario Actual */}
  {activeTab === 'inventario' && (
  <div id="section-inventario" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6 lg:p-8">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-6">
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
                {misInventarios.map((inventario, index) => {
                  const invKey = `${inventario.id || inventario.tipo_ficha_id || inventario.tipo_ficha_nombre || 'inv'}-${inventario.tipo_ficha_nombre || index}`;
                  return (
                  <div key={invKey} className="border border-gray-200 rounded-xl p-3 space-y-3">
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
                    <div className="grid grid-cols-2 gap-3 text-sm">
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
                  );
                })}
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
                    {misInventarios.map((inventario, index) => {
                      const invKey = `${inventario.id || inventario.tipo_ficha_id || inventario.tipo_ficha_nombre || 'inv'}-${inventario.tipo_ficha_nombre || index}`;
                      return (
                      <tr key={invKey} className="hover:bg-gray-50 transition-colors">
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
                      );
                    })}
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
  )}

    {/* Mis Tareas de Mantenimiento */}
  {activeTab === 'tareas' && (
  <div id="section-tareas" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6 lg:p-8">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-6">
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
                  <div key={tarea.id} className="border border-gray-200 rounded-xl p-3 sm:p-6 hover:shadow-sm transition-shadow">
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
  )}

    {/* Mis Cortes de Caja */}
    {activeTab === 'cortes' && (
      misCortesHistorial.length > 0 ? (
      <div id="section-cortes" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
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
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
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

            {/* Mostrar todos los cortes */}
            {misCortesHistorial.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Historial Completo</h3>
                <div className="space-y-3 sm:space-y-4">
                  {misCortesHistorial.map((corte, index) => {
                    // Normalizar porcentajes: si backend envió porcentaje_revendedor=0 pero porcentaje_admin > 0, recalcular.
                    let pctAdmin = Number(corte.porcentaje_admin);
                    let pctRev = Number(corte.porcentaje_revendedor);
                    if (!Number.isFinite(pctAdmin) || pctAdmin < 0) pctAdmin = porcentajeAdmin;
                    if (!Number.isFinite(pctRev) || pctRev <= 0) {
                      if (Number.isFinite(pctAdmin) && pctAdmin > 0 && pctAdmin < 100) {
                        pctRev = 100 - pctAdmin;
                      } else {
                        pctRev = porcentajeRevendedor; // fallback global
                      }
                    }
                    const tiposConVentas = Array.isArray(corte.tipos_vendidos)
                      ? corte.tipos_vendidos.filter(t => (t?.vendidas || 0) > 0 || (t?.total_vendido || 0) > 0)
                      : [];
                    return (
                    <div key={`${corte?.id ?? 'idx'}-${index}`} className="p-3 sm:p-5 border border-gray-200 rounded-2xl shadow-sm hover:shadow transition-shadow bg-white">
                      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                            {(() => {
                              const base = corte.fecha || corte.fecha_corte || corte.created_at;
                              const created = corte.created_at || base;
                              try {
                                const dBase = new Date(base);
                                const dCreated = new Date(created);
                                if (!isNaN(dBase) && !isNaN(dCreated)) {
                                  const fechaStr = dBase.toLocaleDateString('es-MX', { dateStyle: 'medium' });
                                  const horaStr = dCreated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                  return `Corte del ${fechaStr} • ${horaStr}`;
                                }
                              } catch {}
                              return `Corte del ${new Date(base).toLocaleDateString('es-MX')}`;
                            })()}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {tiposConVentas.length} tipos de fichas vendidas
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-semibold text-emerald-600 text-sm sm:text-base">
                            ${corte.total_comision_revendedor?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">Mi ganancia ({pctRev}%)</p>
                          {/* Estado del cobro */}
                          {(() => {
                            const estado = (corte.estado_cobro || '').toLowerCase();
                            const cls = estado === 'saldado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : estado === 'parcial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800';
                            const label = estado ? estado.toUpperCase() : 'PENDIENTE';
                            return (
                              <span className={`inline-flex mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
                                {label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      {/* Resumen compacto en tabla */}
                      <div className="mt-2 sm:mt-3 overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full text-xs sm:text-sm">
                          <tbody>
                            <tr className="odd:bg-white even:bg-gray-50">
                              <td className="px-3 py-2 text-gray-600">Total vendido</td>
                              <td className="px-3 py-2 text-right font-semibold text-blue-600">${corte.total_vendido?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</td>
                            </tr>
                            <tr className="odd:bg-white even:bg-gray-50">
                              <td className="px-3 py-2 text-gray-600">Mi ganancia ({pctRev}%)</td>
                              <td className="px-3 py-2 text-right font-semibold text-emerald-600">${corte.total_comision_revendedor?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</td>
                            </tr>
                            <tr className="odd:bg-white even:bg-gray-50">
                              <td className="px-3 py-2 text-gray-600">Para admin ({pctAdmin}%)</td>
                              <td className="px-3 py-2 text-right font-semibold text-purple-600">${corte.total_ganancia_admin?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</td>
                            </tr>
                            {/* Abonos y saldo (si existen datos) */}
                            <tr className="odd:bg-white even:bg-gray-50">
                              <td className="px-3 py-2 text-gray-600">Abonado por revendedor</td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900">${(corte.monto_pagado_revendedor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="odd:bg-white even:bg-gray-50">
                              <td className="px-3 py-2 text-gray-600">Saldo pendiente</td>
                              <td className="px-3 py-2 text-right font-semibold ${(corte.saldo_revendedor || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'}">${(corte.saldo_revendedor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Detalle por tipo (toggle) */}
                      {tiposConVentas.length > 0 && (
                        <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs sm:text-sm text-gray-600">Detalle por tipo</div>
                            <button
                              onClick={() => toggleCorteDetalle(corte.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm font-medium"
                            >
                              {expandedCortes[corte.id] ? 'Ocultar detalle' : 'Ver detalle'}
                            </button>
                          </div>
                          {expandedCortes[corte.id] && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs sm:text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">Tipo</th>
                                    <th className="px-3 py-2 text-center font-medium text-gray-700">Vendidas</th>
                                    <th className="px-3 py-2 text-center font-medium text-gray-700">Vendido</th>
                                    <th className="px-3 py-2 text-center font-medium text-gray-700">Mi ganancia ({pctRev}%)</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-700">Para admin ({pctAdmin}%)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {tiposConVentas.map((t, i) => {
                                    const rowKey = `${corte.id || 'c'}-tbl-${t.tipo_ficha || t.tipo || i}`;
                                    return (
                                      <tr key={rowKey} className="odd:bg-white even:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-900">{t.tipo_ficha}</td>
                                        <td className="px-3 py-2 text-center">{t.vendidas || 0}</td>
                                        <td className="px-3 py-2 text-center text-blue-600">${(t.total_vendido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-3 py-2 text-center text-emerald-600">${(t.comision_revendedor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-3 py-2 text-right text-purple-600">${(t.ganancia_admin || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>
          ) : (
          <div id="section-cortes" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center">
            <Calendar className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No hay cortes de caja disponibles</h3>
            <p className="text-gray-500 text-sm sm:text-base px-4">El administrador aún no ha realizado ningún corte de caja para tu negocio.</p>
          </div>
          )
        )}
      </div>

      {/* Navegación móvil fija */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-4 h-14" style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom))' }}>
          {[
            { key: 'resumen', label: 'Inicio', icon: User },
            { key: 'inventario', label: 'Inventario', icon: Package },
            { key: 'tareas', label: 'Tareas', icon: AlertTriangle },
            { key: 'cortes', label: 'Cortes', icon: DollarSign }
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  try {
                    const params = new URLSearchParams(location.search || '');
                    params.set('tab', item.key);
                    navigate && navigate({ search: params.toString() }, { replace: false });
                  } catch {}
                }}
                className={`flex flex-col items-center justify-center space-y-1 ${activeTab === item.key ? 'text-blue-700' : 'text-gray-700'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VistaRevendedor;