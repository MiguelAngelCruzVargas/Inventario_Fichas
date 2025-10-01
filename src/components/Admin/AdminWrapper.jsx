// AdminWrapper.jsx - Versión Responsiva
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { 
  BarChart3, 
  Package, 
  Calculator, 
  Wrench, 
  FileText, 
  LogOut,
  Shield,
  User,
  Menu,
  X,
  Warehouse,
  Users,
  Settings,
  DollarSign,
  CreditCard,
  ShoppingCart
} from 'lucide-react';
import Dashboard from '@components/Admin/Dashboard';
import Entregas from '@components/Admin/Entregas';
import Stock from '@components/Admin/Stock';
import CorteCaja from '@components/Admin/CorteCaja';
import Tareas from '@components/Admin/Tareas';
import Reportes from '@components/Admin/Reportes';
import HistorialEntregas from '@components/Admin/HistorialEntregas';
import HistorialGlobal from '@components/Admin/HistorialGlobal';
import NotasTrabajadores from '@components/Admin/NotasTrabajadores';
import GestionUsuarios from '@components/Admin/GestionUsuarios';
import Equipos from '@components/Admin/Equipos';
import CambiarPassword from '@components/common/CambiarPassword';
import MiPerfil from '@components/common/MiPerfil';
import Gastos from '@components/Admin/Gastos';
import Clientes from '@components/Admin/Clientes';
import VentasOcasionales from '@components/Admin/VentasOcasionales';
import PagosServicio from '@components/Admin/PagosServicio';
import BrandingModal from '@components/common/BrandingModal';

const AdminWrapper = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null); // para dropdowns de grupos
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  // Notificaciones en header
  const [headerEvents, setHeaderEvents] = useState([]); // {id,type,message,ts,raw}
  const [headerUnread, setHeaderUnread] = useState(0);
  const [showHeaderEvents, setShowHeaderEvents] = useState(false);
  const esRef = useRef(null);
  const desktopNavRef = useRef(null);

  // Escuchar eventos para cambiar de tab desde otros componentes
  useEffect(() => {
    const handleChangeTab = (event) => {
      const { tabId } = event.detail;
      if (tabId && tabs.some(tab => tab.id === tabId)) {
        setActiveTab(tabId);
      }
    };

    window.addEventListener('changeAdminTab', handleChangeTab);
    
    return () => {
      window.removeEventListener('changeAdminTab', handleChangeTab);
    };
  }, []);

  // SSE en Header para notificaciones globales
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    const connect = () => {
      try {
        if (esRef.current) {
          esRef.current.close?.();
          esRef.current = null;
        }
        const es = new EventSource('/api/stream');
        esRef.current = es;

        const pushEvent = (type, payload) => {
          const ts = new Date();
          let message = '';
          if (type === 'nota-creada') {
            const autor = payload?.username || 'Trabajador';
            const titulo = payload?.titulo || 'Nueva nota';
            const destino = payload?.revendedor_nombre ? ` • ${payload.revendedor_nombre}` : '';
            message = `${autor} publicó: "${titulo}"${destino}`;
          } else if (type === 'tarea-creada') {
            const prio = payload?.prioridad ? ` · ${payload.prioridad}` : '';
            message = `Nueva tarea: ${payload?.titulo || ''}${prio}`;
          } else if (type === 'tarea-completada') {
            message = `Tarea #${payload?.id || ''} completada`;
          } else if (type === 'tarea-actualizada') {
            message = `Tarea #${payload?.id || ''} marcada como ${payload?.estado || ''}`;
          } else if (type === 'entrega-creada') {
            const quien = payload?.usuario_entrega || 'Sistema';
            const rev = payload?.revendedor_nombre || 'revendedor';
            const cant = payload?.cantidad || 0;
            const tipo = payload?.tipo_ficha_nombre || 'fichas';
            message = `${quien} entregó ${cant} × ${tipo} a ${rev}`;
          } else {
            message = type.replace(/-/g, ' ');
          }
          setHeaderEvents(prev => [{ id: `${type}-${Date.now()}`, type, message, ts, raw: payload }, ...prev].slice(0, 20));
          setHeaderUnread(u => u + 1);
        };

        const makeHandler = (t) => (e) => {
          try { pushEvent(t, e?.data ? JSON.parse(e.data) : null); } catch { pushEvent(t, null); }
        };

        ['nota-creada','nota-actualizada','nota-eliminada','tarea-creada','tarea-actualizada','tarea-completada','entrega-creada']
          .forEach(t => es.addEventListener(t, makeHandler(t)));

        es.onopen = () => { retryCount = 0; };
        es.onerror = () => {
          if (retryCount++ >= maxRetries) { es.close(); esRef.current = null; }
        };
      } catch {}
    };
    connect();
    return () => { try { esRef.current?.close(); } catch {} esRef.current = null; };
  }, []);

  // Manejar logout
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Cerrar menús desplegables en desktop/móvil al interactuar fuera, ESC, scroll o resize
  useEffect(() => {
    const onClickOutside = (e) => {
      if (desktopNavRef.current && !desktopNavRef.current.contains(e.target)) {
        if (openGroup) setOpenGroup(null);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenGroup(null);
        setMobileMenuOpen(false);
      }
    };
    const onResize = () => setOpenGroup(null);
    const onScroll = () => setOpenGroup(null);

    document.addEventListener('click', onClickOutside, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);

    return () => {
      document.removeEventListener('click', onClickOutside, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [openGroup]);
  
  const tabs = [
    { 
      id: 'dashboard', 
      name: 'Dashboard', 
      shortName: 'Inicio',
      icon: BarChart3,
      description: 'Resumen general'
    },
    {
      id: 'clientes',
      name: 'Clientes',
      shortName: 'Clientes',
      icon: Users,
      description: 'Clientes de servicio y ocasionales'
    },
    {
      id: 'pagos-servicio',
      name: 'Pagos de Servicio',
      shortName: 'Pagos',
      icon: DollarSign,
      description: 'Próximos pagos y vencidos de clientes de servicio'
    },
    {
      id: 'ventas-ocasionales',
      name: 'Ventas Ocasionales',
      shortName: 'Ventas',
      icon: ShoppingCart,
      description: 'Registrar ventas a clientes ocasionales'
    },
    { 
      id: 'entregas', 
      name: 'Entregas', 
      shortName: 'Entregas',
      icon: Package,
      description: 'Gestión de entregas'
    },
    { 
      id: 'stock', 
      name: 'Gestión de Stock', 
      shortName: 'Stock',
      icon: Warehouse,
      description: 'Inventario global'
    },
    {
      id: 'equipos',
      name: 'Equipos',
      shortName: 'Equipos',
      icon: Package,
      description: 'Inventario de equipos asignados'
    },
    { 
      id: 'corte', 
      name: 'Corte de Caja', 
      shortName: 'Corte',
      icon: Calculator,
      description: 'Análisis financiero'
    },
    { 
      id: 'tareas', 
      name: 'Tareas', 
      shortName: 'Tareas',
      icon: Wrench,
      description: 'Mantenimiento técnico'
    },
    { 
      id: 'reportes', 
      name: 'Reportes', 
      shortName: 'Reportes',
      icon: FileText,
      description: 'Reportes y análisis'
    },
    {
      id: 'historial-global',
      name: 'Historial Global',
      shortName: 'Global',
      icon: FileText,
      description: 'Entregas, ventas y pagos'
    },
    {
      id: 'historial',
      name: 'Historial de Entregas',
      shortName: 'Historial',
      icon: FileText,
      description: 'Detalle de todas las entregas'
    },
    {
      id: 'notas',
      name: 'Notas de Trabajadores',
      shortName: 'Notas',
      icon: FileText,
      description: 'Notas registradas por el equipo'
    },
    { 
      id: 'usuarios', 
      name: 'Gestión de Usuarios', 
      shortName: 'Usuarios',
      icon: Users,
      description: 'Administrar usuarios'
    }
  ];

  // Grupos de menú (submenús)
  const menuGroups = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: BarChart3,
      items: ['dashboard']
    },
    {
      id: 'operaciones',
      label: 'Operaciones',
      icon: Package,
  items: ['entregas', 'stock', 'equipos', 'ventas-ocasionales']
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: Users,
      items: ['clientes', 'pagos-servicio']
    },
    {
      id: 'tecnico',
      label: 'Técnico',
      icon: Wrench,
      items: ['tareas', 'notas']
    },
    {
      id: 'finanzas',
      label: 'Finanzas',
      icon: Calculator,
      items: ['corte', 'reportes']
    },
    {
      id: 'historial',
      label: 'Historial',
      icon: FileText,
      items: ['historial-global', 'historial']
    },
    {
      id: 'admin',
      label: 'Administración',
      icon: Shield,
      items: ['usuarios']
    }
  ];

  const findTab = (id) => tabs.find(t => t.id === id);
  const groupHasActive = (groupId) => {
    const group = menuGroups.find(g => g.id === groupId);
    return group?.items.includes(activeTab);
  };

  // Sincronizar pestaña activa con la URL (?tab=) y localStorage para persistir tras refresh
  useEffect(() => {
    // 1) Prioridad: query param ?tab
    const params = new URLSearchParams(location.search);
    const tabFromQuery = params.get('tab');
    const isValid = tabFromQuery && tabs.some(t => t.id === tabFromQuery);
    if (isValid) {
      setActiveTab(tabFromQuery);
      // Guardar también en localStorage
      try { localStorage.setItem('admin.activeTab', tabFromQuery); } catch {}
      return; // No continuar con fallback si viene en la URL
    }

    // 2) Fallback: localStorage
    try {
      const stored = localStorage.getItem('admin.activeTab');
      if (stored && tabs.some(t => t.id === stored)) {
        setActiveTab(stored);
      }
    } catch {}
  // Ejecutar cuando cambia la location (p.ej., navegación interna o refresh)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Persistir cambios de pestaña en localStorage
  useEffect(() => {
    try { localStorage.setItem('admin.activeTab', activeTab); } catch {}
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false); // Cerrar menú móvil al seleccionar

    // Actualizar query param ?tab para permitir deep-link y persistencia en refresh
    const params = new URLSearchParams(location.search);
    params.set('tab', tabId);
    navigate({ search: params.toString() }, { replace: false });
  };

  const getCurrentTabName = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    return currentTab ? currentTab.name : 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50">
    {/* Header principal - Responsivo */}
    <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          
          {/* Header superior */}
      <div className="flex flex-wrap justify-between items-center gap-2 py-3 sm:py-4">
            
            {/* Logo y título - Adaptable */}
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  <span className="hidden sm:inline">Panel de Administrador</span>
                  <span className="sm:hidden">Admin Panel</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  <span className="hidden sm:inline">Bienvenido, </span>
                  {user?.username || user?.nombre_completo || 'Usuario'}
                </p>
                {/* Sección actual (solo móvil) */}
                <div className="sm:hidden mt-1 text-xs text-gray-500 truncate">
                  <span className="text-gray-900 font-medium">{getCurrentTabName()}</span>
                  <span className="mx-1">•</span>
                  <span>Sección actual</span>
                </div>
              </div>
            </div>

            {/* Acciones de usuario */}
            <div className="flex items-center flex-wrap gap-1 sm:gap-2">
                {/* Campana de notificaciones */}
                <div className="relative">
                  <button
                    onClick={() => { setShowHeaderEvents(v => !v); setHeaderUnread(0); }}
                    className="relative inline-flex items-center justify-center px-2.5 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                    title="Novedades"
                  >
                    {/* Simple bell icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.916V4a1 1 0 10-2 0v1.084A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    {headerUnread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">{headerUnread}</span>
                    )}
                  </button>
                  {showHeaderEvents && (
                    <div className="absolute right-0 mt-2 w-[320px] max-h-[60vh] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                      <div className="flex items-center justify-between px-3 py-2 border-b">
                        <span className="text-sm font-semibold text-gray-800">Novedades</span>
                        <button onClick={() => setShowHeaderEvents(false)} className="text-xs text-gray-500 hover:text-gray-700">Cerrar</button>
                      </div>
                      <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-100">
                        {headerEvents.length === 0 ? (
                          <div className="p-4 text-sm text-gray-500">Sin novedades</div>
                        ) : (
                          headerEvents.slice(0, 12).map(evt => (
                            <div key={evt.id} className="p-3 text-sm flex items-start gap-2 hover:bg-gray-50">
                              <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                                {evt.type?.includes('nota') ? (
                                  <span className="text-indigo-600">✉</span>
                                ) : evt.type === 'entrega-creada' ? (
                                  <span className="text-green-600">▣</span>
                                ) : (
                                  <span className="text-amber-600">🛠</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-gray-900 truncate">{evt.message}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{new Date(evt.ts).toLocaleString()}</div>
                              </div>
                              <div className="flex-shrink-0">
                                {evt.type?.includes('nota') ? (
                                  <button onClick={() => { setActiveTab('notas'); setShowHeaderEvents(false); }} className="text-xs text-indigo-700 hover:underline">Ver</button>
                                ) : evt.type === 'entrega-creada' ? (
                                  <button onClick={() => { setActiveTab('entregas'); setShowHeaderEvents(false); }} className="text-xs text-green-700 hover:underline">Ver</button>
                                ) : (
                                  <button onClick={() => { setActiveTab('tareas'); setShowHeaderEvents(false); }} className="text-xs text-amber-700 hover:underline">Ver</button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* /Campana */}
                {/* Branding (discreto) */}
                <button
                  onClick={() => setShowBrandingModal(true)}
                  className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-700 px-2 py-2 rounded-lg hover:bg-slate-100"
                  title="Personalizar marca (logo y nombre)"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden md:inline text-sm">Marca</span>
                </button>
                {/* Botón discreto a Gastos */}
                <button
                  onClick={() => setActiveTab('gastos')}
                  className="inline-flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-medium transition-colors px-2 py-2 rounded-lg hover:bg-emerald-50"
                  title="Gastos"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden md:inline">Gastos</span>
                </button>
                {/* Acceso rápido a Pagos de Servicio */}
                <button
                  onClick={() => setActiveTab('pagos-servicio')}
                  className="inline-flex items-center space-x-1 text-indigo-700 hover:text-indigo-800 font-medium transition-colors px-2 py-2 rounded-lg hover:bg-indigo-50"
                  title="Pagos de Servicio"
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="hidden md:inline">Pagos</span>
                </button>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="inline-flex items-center space-x-1 sm:space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors px-2 sm:px-4 py-2 rounded-xl hover:bg-blue-50"
                  title="Mi perfil"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Mi Perfil</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center space-x-1 sm:space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors px-2 sm:px-4 py-2 rounded-xl hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
            </div>
          </div>
          
          {/* Navegación Desktop/Tablet con submenús */}
          <div ref={desktopNavRef} className="hidden md:flex flex-wrap gap-2 pb-4 relative">
            {menuGroups.map(group => {
              const GroupIcon = group.icon;
              const isOpen = openGroup === group.id;
              const isSomeActive = groupHasActive(group.id);
              const count = group.items.length;
              const gridCols = count <= 3 ? 'grid-cols-1' : count <= 6 ? 'grid-cols-2' : 'grid-cols-3';
              const panelWidth = count <= 3 ? 'w-[280px]' : count <= 6 ? 'w-[520px]' : 'w-[680px]';
              return (
                <div key={group.id} className="relative">
                  <button
                    onClick={() => setOpenGroup(isOpen ? null : group.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 border ${
                      isSomeActive ? 'bg-slate-100 text-slate-900 border-slate-200' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <GroupIcon className={`w-4 h-4 ${isSomeActive ? 'text-slate-700' : 'text-gray-500'}`} />
                    <span>{group.label}</span>
                    <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.178l3.71-3.947a.75.75 0 111.08 1.04l-4.24 4.51a.75.75 0 01-1.08 0l-4.24-4.51a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className={`absolute left-0 mt-2 ${panelWidth} max-w-[92vw] bg-white border border-gray-200 shadow-lg rounded-xl p-2.5 z-50`}>
                      <div className={`grid ${gridCols} gap-2 sm:gap-3`}>
                        {group.items.map(itemId => {
                          const item = findTab(itemId);
                          if (!item) return null;
                          const ItemIcon = item.icon;
                          const active = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => { handleTabChange(item.id); setOpenGroup(null); }}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${active ? 'bg-slate-100' : 'hover:bg-gray-50'}`}
                            >
                              <ItemIcon className={`w-5 h-5 ${active ? 'text-slate-700' : 'text-gray-500'}`} />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                <div className="text-[11px] text-gray-500">{item.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Navegación Tablet - Solo iconos con nombres (oculta Gastos) */}
          <div className="hidden md:flex lg:hidden space-x-1 pb-4 overflow-x-auto">
            {tabs.filter(t => t.id !== 'gastos').map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex flex-col items-center space-y-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 min-w-0 flex-shrink-0 ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 ${isActive ? 'text-slate-700' : 'text-gray-500'}`} />
                  <span className="text-xs font-medium truncate w-full text-center">{tab.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navegación móvil - Barra de grupos + menú completo */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-4 h-14">
          {menuGroups.slice(0,3).map(group => {
            const GroupIcon = group.icon;
            const active = group.items.includes(activeTab);
            return (
              <button
                key={group.id}
                onClick={() => setOpenGroup(openGroup === group.id ? null : group.id)}
                className={`flex flex-col items-center justify-center space-y-1 ${active ? 'text-slate-700' : 'text-gray-500'}`}
              >
                <GroupIcon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{group.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center space-y-1 text-gray-700"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] font-medium">Menú</span>
          </button>
        </div>
      </div>

      {/* Contenido principal - Con padding bottom en móvil para el navbar */}
      <div className="flex-1 pb-16 md:pb-0">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'entregas' && <Entregas />}
    {activeTab === 'stock' && <Stock />}
  {activeTab === 'equipos' && <Equipos />}
  {activeTab === 'gastos' && <Gastos />}
  {activeTab === 'clientes' && <Clientes />}
  {activeTab === 'pagos-servicio' && <PagosServicio />}
  {activeTab === 'ventas-ocasionales' && <VentasOcasionales />}
        {activeTab === 'corte' && <CorteCaja />}
        {activeTab === 'tareas' && <Tareas />}
        {activeTab === 'reportes' && <Reportes />}
  {activeTab === 'historial-global' && <HistorialGlobal />}
  {activeTab === 'historial' && <HistorialEntregas />}
  {activeTab === 'notas' && <NotasTrabajadores />}
        {activeTab === 'usuarios' && <GestionUsuarios />}
      </div>

      {/* Menú completo móvil (overlay) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative mt-auto w-full bg-white rounded-t-2xl p-4 max-h-[75vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Menú</h3>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {menuGroups.map(group => (
                <div key={group.id}>
                  <div className="text-xs font-semibold text-gray-500 px-1 mb-2">{group.label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map(itemId => {
                      const item = findTab(itemId);
                      if (!item) return null;
                      const ItemIcon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { handleTabChange(item.id); setMobileMenuOpen(false); }}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${active ? 'bg-slate-50 border-slate-200' : 'border-gray-200'}`}
                        >
                          <ItemIcon className="w-5 h-5 text-gray-600" />
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-[11px] text-gray-500">{item.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambiar Contraseña */}
      <CambiarPassword 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      {/* Modal Mi Perfil */}
      <MiPerfil 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Modal Branding */}
      <BrandingModal
        isOpen={showBrandingModal}
        onClose={() => setShowBrandingModal(false)}
      />
    </div>
  );
};

export default AdminWrapper;