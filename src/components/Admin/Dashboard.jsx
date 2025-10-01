// Dashboard.jsx - Versión Responsiva
import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Bell, 
  Users, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  Eye, 
  CheckCircle, 
  Clock,
  Zap,
  Target,
  Calendar,
  Wrench,
  FileText,
  CreditCard,
  ShoppingCart,
  Warehouse,
  MessageSquare
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useUsers } from '@context/UsersContext';

const Dashboard = () => {
  // Usar el contexto de usuarios para detectar cambios
  const { updateTrigger, dashboardData: cachedDashboardData, updateDashboardData } = useUsers();
  
  // Estados para los datos
  const [dashboardData, setDashboardData] = useState({
    revendedores: [],
    entregas: [],
    trabajadores: [],
    reportesFichas: [],
    tareasMantenimiento: [],
    corteCaja: {},
    tiposFicha: [],
    loading: true,
    error: null
  });
  // Novedades en vivo (SSE)
  const [liveEvents, setLiveEvents] = useState([]); // {id, type, message, ts, raw}
  const [unreadEvents, setUnreadEvents] = useState(0);
  const [showEventsMenu, setShowEventsMenu] = useState(false);
  const esRef = useRef(null);

  // Cargar datos del dashboard con throttling agresivo
  useEffect(() => {
    let timeoutId;

    // Si ya hay datos en cache de UsersContext, usarlos inmediatamente y NO disparar fetch
    if (cachedDashboardData) {
    if (import.meta.env.DEV) console.log('⚡ Usando datos cacheados del dashboard (sin nueva llamada)');
      setDashboardData(prev => ({
        ...prev,
        ...cachedDashboardData,
        loading: false,
        error: null
      }));
      return; // Evita scheduling
    }

    const fetchDashboardData = async () => {
      try {
        setDashboardData(prev => ({ ...prev, loading: true, error: null }));
    if (import.meta.env.DEV) console.log('� (fresh) Cargando datos del dashboard...');
        const response = await apiClient.get('/dashboard/stats');
        if (response.data && response.data.success) {
          const data = response.data.data;
          setDashboardData({
            revendedores: data.revendedores || [],
            entregas: data.entregas || [],
            trabajadores: data.trabajadores || [],
            reportesFichas: data.reportesFichas || [],
            tareasMantenimiento: data.tareasMantenimiento || [],
            corteCaja: data.corteCaja || {},
            tiposFicha: data.tiposFicha || [],
            loading: false,
            error: null
          });
          updateDashboardData(data);
          console.log('✅ Dashboard datos frescos cargados');
        } else {
          throw new Error('Respuesta inválida del servidor');
        }
      } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        setDashboardData(prev => ({
          ...prev,
          loading: false,
          error: error.response?.data?.detail || error.message || 'Error al cargar datos del dashboard'
        }));
      }
    };

    timeoutId = setTimeout(fetchDashboardData, 1200); // Delay reducido (1.2s) porque hay grace en otros

    return () => clearTimeout(timeoutId);
  }, [cachedDashboardData, updateDashboardData]);

  // Conectar al stream SSE para novedades (tareas y notas)
  useEffect(() => {
    let retryTimeout;
    let retryCount = 0;
    const maxRetries = 3;
    
    const connectSSE = () => {
      try {
        // Evitar dobles conexiones en HMR
        if (esRef.current) {
          esRef.current.close?.();
          esRef.current = null;
        }
        
        const es = new EventSource('/api/stream');
        esRef.current = es;

        const pushEvent = (evtType, payload) => {
          const ts = new Date();
          // Construir mensaje legible
          let message = '';
          if (evtType === 'nota-creada') {
            const autor = payload?.username || 'Trabajador';
            const titulo = payload?.titulo || 'Nueva nota';
            const destino = payload?.revendedor_nombre ? ` • ${payload.revendedor_nombre}` : '';
            message = `${autor} publicó: "${titulo}"${destino}`;
          } else if (evtType === 'nota-actualizada') {
            message = `Nota actualizada (#${payload?.id || ''})`;
          } else if (evtType === 'tarea-creada') {
            const prio = payload?.prioridad ? ` · ${payload.prioridad}` : '';
            message = `Nueva tarea: ${payload?.titulo || ''}${prio}`;
          } else if (evtType === 'tarea-completada') {
            message = `Tarea #${payload?.id || ''} completada`;
          } else if (evtType === 'tarea-actualizada') {
            message = `Tarea #${payload?.id || ''} marcada como ${payload?.estado || ''}`;
          } else if (evtType === 'entrega-creada') {
            const quien = payload?.usuario_entrega || 'Sistema';
            const rev = payload?.revendedor_nombre || 'revendedor';
            const cant = payload?.cantidad || 0;
            const tipo = payload?.tipo_ficha_nombre || 'fichas';
            message = `${quien} entregó ${cant} × ${tipo} a ${rev}`;
          } else {
            message = evtType.replace(/-/g,' ');
          }
          setLiveEvents(prev => {
            const next = [{ id: `${evtType}-${Date.now()}`, type: evtType, message, ts, raw: payload }, ...prev];
            return next.slice(0, 20);
          });
          setUnreadEvents(u => u + 1);
        };

        const makeHandler = (type) => (e) => {
          try {
            const data = e?.data ? JSON.parse(e.data) : null;
            pushEvent(type, data);
          } catch {
            pushEvent(type, null);
          }
        };

        ['nota-creada', 'nota-actualizada', 'nota-eliminada', 'tarea-creada', 'tarea-actualizada', 'tarea-completada', 'entrega-creada'].forEach(t => {
          es.addEventListener(t, makeHandler(t));
        });
        
        es.onopen = () => { 
          retryCount = 0; // Reset counter on successful connection
          if (import.meta.env.DEV) console.log('🔌 Conectado a /api/stream'); 
        };
        
        es.onerror = () => { 
          if (retryCount < maxRetries) {
            retryCount++;
            if (import.meta.env.DEV) console.warn(`⚠️ Error en SSE (intento ${retryCount}/${maxRetries})`);
          } else {
            if (import.meta.env.DEV) console.warn('⚠️ SSE deshabilitado tras múltiples errores');
            es.close();
            esRef.current = null;
          }
        };

        return es;
      } catch (error) {
        if (import.meta.env.DEV) console.warn('⚠️ No se pudo conectar a SSE:', error.message);
        return null;
      }
    };

    const es = connectSSE();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      try { 
        if (es) es.close(); 
      } catch {}
      esRef.current = null;
    };
  }, []);

  // Acceso rápido: cambiar pestaña en AdminWrapper
  const goToTab = (tabId) => {
    window.dispatchEvent(new CustomEvent('changeAdminTab', { detail: { tabId } }));
  };

  // Función para recargar datos manualmente
  const recargarDatos = async () => {
  if (import.meta.env.DEV) console.log('🔄 Recargando datos del dashboard manualmente...');
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await apiClient.get('/dashboard/stats');
      
      if (response.data && response.data.success) {
        const data = response.data.data;
        
        setDashboardData({
          revendedores: data.revendedores || [],
          entregas: data.entregas || [],
          trabajadores: data.trabajadores || [],
          reportesFichas: data.reportesFichas || [],
          tareasMantenimiento: data.tareasMantenimiento || [],
          corteCaja: data.corteCaja || {},
          tiposFicha: data.tiposFicha || [],
          loading: false,
          error: null
        });
        
        updateDashboardData(data);
  if (import.meta.env.DEV) console.log('✅ Datos del dashboard recargados exitosamente');
      }
    } catch (error) {
      console.error('❌ Error recargando datos:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.detail || error.message || 'Error al recargar datos'
      }));
    }
  };

  // Si está cargando, mostrar loading
  if (dashboardData.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Si hay error, mostrar error
  if (dashboardData.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error al cargar el dashboard</h3>
            <p className="mt-1 text-sm text-red-700">{dashboardData.error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Usar datos del estado con defaults seguros y verificación de formato
  const {
    revendedores: rawRevendedores = [],
    entregas: rawEntregas = [],
    trabajadores: rawTrabajadores = [],
    reportesFichas: rawReportesFichas = [],
    tareasMantenimiento: rawTareasMantenimiento = [],
    corteCaja: safeCorteCaja = {},
    tiposFicha: rawTiposFicha = []
  } = dashboardData;

  // Asegurar que todos los datos sean arrays
  const safeRevendedores = Array.isArray(rawRevendedores) ? rawRevendedores : [];
  const safeEntregas = Array.isArray(rawEntregas) ? rawEntregas : [];
  const safeTrabajadores = Array.isArray(rawTrabajadores) ? rawTrabajadores : [];
  const safeReportesFichas = Array.isArray(rawReportesFichas) ? rawReportesFichas : [];
  const safeTareasMantenimiento = Array.isArray(rawTareasMantenimiento) ? rawTareasMantenimiento : [];
  const safeTiposFicha = Array.isArray(rawTiposFicha) ? rawTiposFicha : [];

  // Calcular métricas del dashboard
  const totalRevendedores = safeRevendedores.length;
  const revendedoresActivos = safeRevendedores.filter(r => 
    r.activo === 1 || r.activo === true
  ).length;

  const totalFichasEntregadas = safeEntregas.reduce((sum, e) => sum + (e.cantidad || 0), 0);
  
  const tareasPendientes = safeTareasMantenimiento.filter(t => t.estado === 'Pendiente').length;
  const tareasUrgentes = safeTareasMantenimiento.filter(t => 
    t.estado === 'Pendiente' && (t.prioridad === 'Urgente' || t.prioridad === 'Alta')
  ).length;

  const reportesPendientes = safeReportesFichas.filter(r => 
    !r.estado?.includes('Verificado')
  ).length;

  const ventasEstimadas = (safeCorteCaja && safeCorteCaja.totalGeneralVendido) || 0;
  const gananciasEstimadas = (safeCorteCaja && safeCorteCaja.totalGeneralGanancias) || 0;

  // Calcular datos de rendimiento por revendedor
  const rendimientoPorRevendedor = safeRevendedores.map(revendedor => {
    const totalInventario = revendedor.total_fichas || 0;
    const entregasRevendedor = safeEntregas.filter(e => e.revendedorId === revendedor.id);
    const totalEntregado = entregasRevendedor.reduce((sum, e) => sum + (e.cantidad || 0), 0);
    const ultimaEntrega = entregasRevendedor.length > 0 ? 
      Math.max(...entregasRevendedor.map(e => {
        const fecha = new Date(e.fecha_completa || e.fecha || Date.now());
        return isNaN(fecha.getTime()) ? 0 : fecha.getTime();
      }).filter(time => time > 0)) : null;
    const fechaUltimaEntrega = ultimaEntrega ? new Date(ultimaEntrega).toISOString().split('T')[0] : 'Nunca';
    
    return {
      ...revendedor,
      totalInventario,
      totalEntregado,
      fechaUltimaEntrega,
      estaActivo: totalInventario > 0
    };
  });

  // Calcular datos para el inventario
  const inventarioPorTipo = (safeTiposFicha || []).map(tipo => {
    const tipoNombre = typeof tipo === 'object' ? tipo.nombre : tipo;
    const totalEnInventario = safeRevendedores.reduce((sum, r) => {
      // Mapear nombres de tipos de ficha a campos de inventario
      if (tipoNombre.includes('1 hora') || tipoNombre.includes('1h')) return sum + (r.fichas1h || 0);
      if (tipoNombre.includes('2 horas') || tipoNombre.includes('2h')) return sum + (r.fichas2h || 0);
      if (tipoNombre.includes('3 horas') || tipoNombre.includes('3h')) return sum + (r.fichas3h || 0);
      if (tipoNombre.includes('5 horas') || tipoNombre.includes('5h')) return sum + (r.fichas5h || 0);
      return sum;
    }, 0);
    
    const totalEntregado = safeEntregas
      .filter(e => e.tipoFicha === tipoNombre)
      .reduce((sum, e) => sum + (e.cantidad || 0), 0);
    
    // Calcular porcentaje vendido como la proporción de entregadas vs total (inventario + entregadas)
    const total = totalEnInventario + totalEntregado;
    const porcentajeVendido = total > 0 ? Math.round((totalEntregado / total) * 100) : 0;
    
    return {
      tipo: tipoNombre,
      totalEnInventario,
      totalEntregado,
      porcentajeVendido,
      porcentaje: totalEntregado > 0 ? Math.round((totalEnInventario / totalEntregado) * 100) : 0
    };
  });

  // Alertas y notificaciones
  const alertas = [];
  if (tareasUrgentes > 0) {
    alertas.push({
      tipo: 'urgente',
      mensaje: `${tareasUrgentes} tarea(s) de mantenimiento urgente(s) pendiente(s)`,
      icono: AlertTriangle,
      color: 'red'
    });
  }
  if (reportesPendientes > 0) {
    alertas.push({
      tipo: 'info',
      mensaje: `${reportesPendientes} reporte(s) de fichas pendiente(s) de verificación`,
      icono: Eye,
      color: 'amber'
    });
  }
  if (revendedoresActivos < totalRevendedores) {
    alertas.push({
      tipo: 'warning',
      mensaje: `${totalRevendedores - revendedoresActivos} revendedor(es) sin fichas en inventario`,
      icono: Package,
      color: 'slate'
    });
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="w-full px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8">
        
        {/* Header con botón de recarga */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm">Resumen general del sistema</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={recargarDatos}
              disabled={dashboardData.loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              <Activity className={`w-4 h-4 ${dashboardData.loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {dashboardData.loading ? 'Cargando...' : 'Recargar Datos'}
              </span>
            </button>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Accesos rápidos</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {[{
              id:'tareas', label:'Tareas', icon: Wrench, color:'bg-amber-50 text-amber-700'
            },{
              id:'notas', label:'Notas', icon: MessageSquare, color:'bg-indigo-50 text-indigo-700'
            },{
              id:'entregas', label:'Entregas', icon: Package, color:'bg-green-50 text-green-700'
            },{
              id:'clientes', label:'Clientes', icon: Users, color:'bg-slate-50 text-slate-700'
            },{
              id:'pagos-servicio', label:'Pagos', icon: CreditCard, color:'bg-teal-50 text-teal-700'
            }].map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => goToTab(item.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Alertas y Notificaciones - Responsivas */}
        {alertas.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Alertas Activas</h3>
                <p className="text-gray-500 text-xs sm:text-sm">Elementos que requieren tu atención</p>
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {alertas.map((alerta, index) => {
                const IconoAlerta = alerta.icono;
                const colorClasses = {
                  red: 'bg-red-50 border-red-100 text-red-800',
                  amber: 'bg-amber-50 border-amber-100 text-amber-800',
                  slate: 'bg-slate-50 border-slate-100 text-slate-800'
                };
                const iconColorClasses = {
                  red: 'text-red-500',
                  amber: 'text-amber-500',
                  slate: 'text-slate-500'
                };
                
                // Generar una clave estable combinando tipo + color + hash del mensaje para evitar duplicados
                const key = `${alerta.tipo}-${alerta.color}-${Math.abs((alerta.mensaje||'').split('').reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0),0))}`;
                return (
                  <div key={key} className={`flex items-center p-3 sm:p-4 rounded-lg sm:rounded-xl border ${colorClasses[alerta.color]}`}>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-white flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <IconoAlerta className={`w-3 h-3 sm:w-4 sm:h-4 ${iconColorClasses[alerta.color]}`} />
                    </div>
                    <span className="font-medium text-sm sm:text-base">{alerta.mensaje}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Métricas Principales - Grid Responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Métrica: Revendedores */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 flex-shrink-0" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Revendedores</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{totalRevendedores}</p>
                <div className="flex items-center mt-2 sm:mt-3 text-xs sm:text-sm">
                  <div className="flex items-center text-emerald-600">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 flex-shrink-0"></div>
                    <span className="font-medium">{revendedoresActivos} activos</span>
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
              </div>
            </div>
          </div>

          {/* Métrica: Fichas Entregadas */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 flex-shrink-0" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Fichas</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{(totalFichasEntregadas || 0).toLocaleString()}</p>
                <div className="flex items-center mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600">
                  <span>Total histórico</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Métrica: Ventas Estimadas */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 flex-shrink-0" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Ventas</p>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  ${(ventasEstimadas || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </p>
                <div className="flex items-center mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600">
                  <span>Último corte</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Métrica: Ganancias */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 flex-shrink-0" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Ganancias</p>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  ${(gananciasEstimadas || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </p>
                <div className="flex items-center mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600">
                  <span>Último corte</span>
                </div>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

  {/* Sección de Análisis - Grid Responsivo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Estado de Mantenimiento */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Estado de Mantenimiento</h3>
                <p className="text-gray-500 text-xs sm:text-sm">Resumen de tareas técnicas</p>
              </div>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
                  <span className="font-medium text-gray-700 text-sm sm:text-base">Pendientes</span>
                </div>
                <span className="bg-amber-100 text-amber-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0">
                  {tareasPendientes}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
                  <span className="font-medium text-gray-700 text-sm sm:text-base">Completadas</span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0">
                  {safeTareasMantenimiento.filter(t => t.estado === 'Completado').length}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                  <span className="font-medium text-gray-700 text-sm sm:text-base">Urgentes</span>
                </div>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${
                  tareasUrgentes > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {tareasUrgentes}
                </span>
              </div>
              
              <div className="pt-3 sm:pt-4">
                <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
                  <span>Progreso general</span>
                  <span>
                    {safeTareasMantenimiento.length > 0 ? 
                      Math.round((safeTareasMantenimiento.filter(t => t.estado === 'Completado').length / safeTareasMantenimiento.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${safeTareasMantenimiento.length > 0 ? 
                        (safeTareasMantenimiento.filter(t => t.estado === 'Completado').length / safeTareasMantenimiento.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de Inventario */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Inventario por Tipo</h3>
                <p className="text-gray-500 text-xs sm:text-sm">Distribución de fichas</p>
              </div>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {inventarioPorTipo.map(item => (
                <div key={`${item.tipo}-${item.totalEnInventario}-${item.totalEntregado}`} className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-slate-600">
                          {item.tipo.split(' ')[0]}
                        </span>
                      </div>
                      <span className="font-medium text-gray-700 text-sm sm:text-base truncate">{item.tipo}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">{item.totalEnInventario} rest.</div>
                      <div className="text-xs text-gray-500">{item.totalEntregado} entregadas</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((item.porcentajeVendido || 0), 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actividad Reciente y Novedades - Grid Responsivo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Novedades en vivo */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Novedades del equipo</h3>
                <p className="text-gray-500 text-xs sm:text-sm">Notas y cambios de tareas en tiempo real</p>
              </div>
              <div className="ml-auto">
                <button onClick={() => { setUnreadEvents(0); }} className="text-xs sm:text-sm text-blue-600 hover:underline">Marcar como visto</button>
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
              {liveEvents.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Bell className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" />
                  <p className="text-xs sm:text-sm">Sin novedades por ahora</p>
                </div>
              )}
              {liveEvents.map((evt) => (
                <div key={evt.id} className="flex items-start p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    {evt.type?.includes('nota') ? (
                      <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                    ) : evt.type === 'entrega-creada' ? (
                      <Package className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    ) : (
                      <Wrench className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base text-gray-900">{evt.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(evt.ts).toLocaleString()}</p>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    {evt.type?.includes('nota') ? (
                      <button onClick={() => goToTab('notas')} className="text-xs sm:text-sm text-indigo-700 hover:underline">Ver notas</button>
                    ) : evt.type === 'entrega-creada' ? (
                      <button onClick={() => goToTab('entregas')} className="text-xs sm:text-sm text-green-700 hover:underline">Ver entregas</button>
                    ) : (
                      <button onClick={() => goToTab('tareas')} className="text-xs sm:text-sm text-amber-700 hover:underline">Ver tareas</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Entregas Recientes */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Entregas Recientes</h3>
                <p className="text-gray-500 text-xs sm:text-sm">Últimas 5 entregas realizadas</p>
              </div>
            </div>
            
            <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
        {safeEntregas.slice(-5).reverse().map((entrega, idx) => {
                const key = entrega?.id
                  ? `e-${entrega.id}`
                  : `e-${entrega.revendedorId || 'r'}-${entrega.tipo_ficha_id || 't'}-${new Date(entrega.fecha_completa || entrega.fecha || Date.now()).getTime()}-${idx}`;
                const revendedor = safeRevendedores.find(r => r.id === entrega.revendedorId);
                return (
          <div key={key} className="flex justify-between items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{revendedor?.nombre}</p>
                      <p className="text-xs text-gray-600">
                        {entrega.cantidad} × {entrega.tipoFicha}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-semibold text-gray-900">
                        ${((entrega.cantidad || 0) * (entrega.precio || 0)).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{entrega.fecha}</p>
                    </div>
                  </div>
                );
              })}
              
              {safeEntregas.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Package className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" />
                  <p className="text-xs sm:text-sm">No hay entregas registradas</p>
                </div>
              )}
            </div>
          </div>

          {/* Rendimiento por Revendedor */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Top Revendedores</h3>
                <p className="text-gray-500 text-xs sm:text-sm">Por fichas en inventario</p>
              </div>
            </div>
            
            <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
              {rendimientoPorRevendedor
                .sort((a, b) => b.totalInventario - a.totalInventario)
                .slice(0, 5)
                .map((revendedor, index) => (
                <div key={`${revendedor.id}-${revendedor.totalInventario}`} className="flex justify-between items-center p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-slate-600">{index + 1}</span>
                    </div>
                    <div className="min-w-0">
                      {(() => {
                        const persona = revendedor.responsable || revendedor.nombre || revendedor.nombre_negocio || '—';
                        const tienda = revendedor.nombre_negocio && revendedor.nombre_negocio !== persona ? revendedor.nombre_negocio : '';
                        return (
                          <>
                            <p className="font-medium text-gray-900 text-sm truncate">{persona}</p>
                            {tienda && (
                              <p className="text-xs text-gray-600 truncate">{tienda}</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      revendedor.estaActivo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {revendedor.totalInventario} fichas
                    </span>
                  </div>
                </div>
              ))}
              
              {safeRevendedores.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Users className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" />
                  <p className="text-xs sm:text-sm">No hay revendedores registrados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;