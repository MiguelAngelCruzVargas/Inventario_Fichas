// AdminWrapper.jsx - Versión Responsiva
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  Key
} from 'lucide-react';
import Dashboard from './Dashboard';
import Entregas from './Entregas';
import Stock from './Stock';
import CorteCaja from './CorteCaja';
import Tareas from './Tareas';
import Reportes from './Reportes';
import GestionUsuarios from './GestionUsuarios';
import CambiarPassword from '../common/CambiarPassword';
import MiPerfil from '../common/MiPerfil';

const AdminWrapper = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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

  // Manejar logout
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  
  const tabs = [
    { 
      id: 'dashboard', 
      name: 'Dashboard', 
      shortName: 'Inicio',
      icon: BarChart3,
      description: 'Resumen general'
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
      id: 'usuarios', 
      name: 'Gestión de Usuarios', 
      shortName: 'Usuarios',
      icon: Users,
      description: 'Administrar usuarios'
    }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false); // Cerrar menú móvil al seleccionar
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
          <div className="flex justify-between items-center py-3 sm:py-4">
            
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
              </div>
            </div>

            {/* Información de pestaña actual en móvil */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="sm:hidden text-right min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{getCurrentTabName()}</p>
                <p className="text-xs text-gray-500">Sección actual</p>
              </div>
              
              {/* Botones de usuario */}
              <div className="flex items-center space-x-2">
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
          </div>
          
          {/* Navegación Desktop - Solo visible en pantallas grandes */}
          <div className="hidden lg:flex space-x-1 pb-4">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 ${isActive ? 'text-slate-700' : 'text-gray-500'}`} />
                  <div className="text-left">
                    <div className="font-medium">{tab.name}</div>
                    <div className="text-xs text-gray-500">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navegación Tablet - Solo iconos con nombres */}
          <div className="hidden md:flex lg:hidden space-x-1 pb-4 overflow-x-auto">
            {tabs.map((tab) => {
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

      {/* Navegación móvil - Bottom navigation bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-6 h-16">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 ${
                  isActive
                    ? 'text-slate-700 bg-slate-50'
                    : 'text-gray-500 hover:text-gray-700 active:bg-gray-50'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-slate-700' : 'text-gray-500'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-slate-700' : 'text-gray-500'}`}>
                  {tab.shortName}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-slate-700 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido principal - Con padding bottom en móvil para el navbar */}
      <div className="flex-1 pb-16 md:pb-0">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'entregas' && <Entregas />}
        {activeTab === 'stock' && <Stock />}
        {activeTab === 'corte' && <CorteCaja />}
        {activeTab === 'tareas' && <Tareas />}
        {activeTab === 'reportes' && <Reportes />}
        {activeTab === 'usuarios' && <GestionUsuarios />}
      </div>

      {/* Overlay para el menú móvil (si fuera necesario en el futuro) */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
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
    </div>
  );
};

export default AdminWrapper;