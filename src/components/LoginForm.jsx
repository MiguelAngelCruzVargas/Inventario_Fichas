import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wifi, 
  Eye, 
  EyeOff, 
  User, 
  Lock,
  ArrowRight,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { conditionalLog } from '../utils/errorHandler';
import CreateInitialAdmin from './common/CreateInitialAdmin';
import brandingService from '@services/brandingService';

const LoginForm = ({ onLogin }) => {
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [mostrarPassword, setMostrarPassword] = useState(false);
  // Eliminado: detección de rol previa al login para evitar enumeración de usuarios/roles
  const [error, setError] = useState('');
  const [adminExists, setAdminExists] = useState(true);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [branding, setBranding] = useState({ name: 'Plaza Wifi', tagline: 'Sistema de Gestión v2.0', logoDataUrl: null });

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const b = await brandingService.getBranding();
        if (b) setBranding({
          name: b.name || 'Plaza Wifi',
          tagline: b.tagline || 'Sistema de Gestión v2.0',
          logoDataUrl: b.logoDataUrl || null
        });
      } catch (_) { /* defaults */ }
    };
    loadBranding();
    const onChanged = (e) => setBranding(prev => ({ ...prev, ...(e.detail || {}) }));
    window.addEventListener('brandingChanged', onChanged);
    return () => window.removeEventListener('brandingChanged', onChanged);
  }, []);

  // Verificar si existe un administrador al cargar el componente
  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const response = await fetch('/api/auth/admin-exists');
      if (!response.ok) {
        // Si el backend responde con error, asumir que existe para no bloquear el flujo
        setAdminExists(true);
        return;
      }
      const data = await response.json();
      setAdminExists(!!data?.adminExists);
    } catch (error) {
      console.error('Error verificando admin:', error);
      setAdminExists(true); // Asumir que existe si hay error
    } finally {
      setCheckingAdmin(false);
    }
  };

  const handleAdminCreated = (adminData) => {
    console.log('Administrador creado:', adminData);
    setAdminExists(true);
    setShowCreateAdmin(false);
    // Opcional: auto-login o mostrar mensaje de éxito
  };

  // Detección de rol deshabilitada por seguridad (evitar filtraciones pre-login)

  const handleInputChange = (field, value) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleLogin = async () => {
    setError('');
    
    try {
      if (!credentials.username || !credentials.password) {
        throw new Error('Por favor ingresa usuario y contraseña');
      }

      // Iniciar proceso de login
      
      // Usar el servicio real de autenticación
      const result = await login(credentials);
      

      
      if (result.success === false) {
        throw new Error(result.error || 'Error de autenticación');
      }


      
      // Redirigir a la página principal para que DashboardRedirect haga su trabajo
      navigate('/', { replace: true });

    } catch (error) {
      // No saturar la consola: el servicio ya genera logs cuando corresponde
      setError(error.message || 'Error al iniciar sesión');
    }
  };

  const IconComponent = Wifi;



  return (
    <div className="fixed inset-0 w-full h-full overflow-auto">
      
      {/* Fondo con patrón geométrico */}
      <div 
        className="fixed inset-0 w-full h-full bg-slate-900"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(148, 163, 184, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(148, 163, 184, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, rgba(148, 163, 184, 0.05) 0%, transparent 50%),
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 60px,
              rgba(148, 163, 184, 0.03) 60px,
              rgba(148, 163, 184, 0.03) 62px
            )
          `
        }}
      />
      
      {/* Grid pattern overlay */}
      <div 
        className="fixed inset-0 w-full h-full opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Header corporativo */}
      <div className="relative z-10 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-600 rounded-lg flex items-center justify-center overflow-hidden">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              )}
            </div>
            <span className="text-white font-semibold text-base sm:text-lg">{branding.name}</span>
          </div>
          <div className="text-slate-300 text-xs sm:text-sm">{branding.tagline}</div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] py-4 sm:py-8 px-4">
        <div className="w-full max-w-sm sm:max-w-md">
          
          {/* Formulario principal */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200/50">
            
            {/* Header del formulario */}
            <div className="px-6 sm:px-8 py-6 sm:py-8 text-center border-b border-slate-200">
              <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-slate-100 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600" />
              </div>
              
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
                Iniciar sesión
              </h1>
              <p className="text-slate-600 text-sm">
                Accede a tu cuenta para continuar
              </p>
            </div>

            {/* Formulario */}
            <div className="p-6 sm:p-8">
              <div className="space-y-5 sm:space-y-6">
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Usuario
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={credentials.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 bg-white text-sm sm:text-base"
                      placeholder="Ingresa tu usuario"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={mostrarPassword ? "text" : "password"}
                      value={credentials.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-12 sm:pr-14 py-3 sm:py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 bg-white text-sm sm:text-base"
                      placeholder="Ingresa tu contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {mostrarPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleLogin}
                  disabled={loading || !credentials.username || !credentials.password}
                  className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 sm:py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-3 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <span>Iniciar Sesión</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-6 sm:mt-8 text-center space-y-3">
            {/* Enlace para crear admin inicial (solo si no existe) */}
            {!adminExists && !checkingAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mr-2" />
                  <span className="text-sm font-medium text-amber-800">
                    No hay administrador en el sistema
                  </span>
                </div>
                <button
                  onClick={() => setShowCreateAdmin(true)}
                  className="flex items-center justify-center mx-auto px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Crear Administrador Inicial
                </button>
              </div>
            )}
            
            <p className="text-slate-400 text-xs sm:text-sm">
              © 2025 Plaza Wifi. Sistema de Gestión Empresarial
            </p>
          </div>
        </div>
      </div>

      {/* Modal para crear administrador inicial */}
      {showCreateAdmin && (
        <div className="fixed inset-0 z-50">
          <CreateInitialAdmin onAdminCreated={handleAdminCreated} />
          {/* Botón para cerrar */}
          <button
            onClick={() => setShowCreateAdmin(false)}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-lg transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loader mientras se verifica el administrador */}
      {checkingAdmin && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;