import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FichasProvider } from '../context/FichasContext';
import { UsersProvider } from '../context/UsersContext';

// Componentes
import LoginForm from '../components/LoginForm';
import AdminWrapper from '../components/Admin/AdminWrapper';
import RevendedorWrapper from '../components/Revendedor/RevendedorWrapper';
import TrabajadorWrapper from '../components/Trabajador/TrabajadorWrapper';
import LoadingScreen from '../components/common/LoadingScreen';
import SessionChangeNotification from '../components/common/SessionChangeNotification';
import SessionExpirationWarning from '../components/common/SessionExpirationWarning';

// Wrapper para manejar notificación de cambio de sesión
const AppWrapper = ({ children }) => {
  // Verificar que el contexto esté disponible
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.error('AppWrapper: AuthContext no está disponible:', error);
    // Fallback sin funcionalidades de auth
    return <div className="relative">{children}</div>;
  }

  const { 
    sessionChanged, 
    sessionExpiring, 
    user, 
    isAuthenticated, 
    dismissSessionChangeNotification, 
    renewSession, 
    logout 
  } = authContext;
  
  const navigate = useNavigate();

  // Auto-redireccionar cuando hay un cambio de sesión válido
  useEffect(() => {
    if (sessionChanged && isAuthenticated && user) {
      // Pequeño delay para mostrar la notificación antes de redirigir
      const timer = setTimeout(() => {
        let redirectPath = '/login';
        
        switch (user.tipo_usuario) {
          case 'admin':
            redirectPath = '/admin';
            break;
          case 'revendedor':
            redirectPath = '/revendedor';
            break;
          case 'trabajador':
            redirectPath = '/trabajador';
            break;
        }
        
  if (import.meta.env.DEV) console.log(`🔄 Auto-redirigiendo a ${redirectPath} para ${user.tipo_usuario}`);
        navigate(redirectPath, { replace: true });
        dismissSessionChangeNotification(); // Limpiar la notificación después de redirigir
      }, 1500); // 1.5 segundos para que el usuario vea la notificación
      
      return () => clearTimeout(timer);
    }
  }, [sessionChanged, isAuthenticated, user, navigate, dismissSessionChangeNotification]);

  const handleRefreshPage = () => {
    window.location.reload();
  };

  const handleDismissNotification = () => {
    dismissSessionChangeNotification();
  };

  const handleRenewSession = async () => {
    try {
      await renewSession();
    } catch (error) {
      console.error('Error al renovar sesión:', error);
      // Si falla la renovación, hacer logout
      await logout();
      navigate('/login', { replace: true });
    }
  };

  const handleLogoutFromWarning = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleDismissSessionWarning = () => {
    // Permitir cerrar la advertencia, pero la sesión seguirá expirando
    // El usuario puede seguir trabajando hasta que expire automáticamente
  };

  return (
    <div className="relative">
      {sessionChanged && (
        <SessionChangeNotification
          user={user}
          onRefresh={handleRefreshPage}
          onDismiss={handleDismissNotification}
        />
      )}
      
      <SessionExpirationWarning
        isVisible={sessionExpiring}
        onRenew={handleRenewSession}
        onDismiss={handleDismissSessionWarning}
        onLogout={handleLogoutFromWarning}
      />
      
      {children}
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar permisos si se especifican roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.tipo_usuario)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Componente para redireccionar según el tipo de usuario
const DashboardRedirect = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (import.meta.env.DEV) console.log('🔀 DashboardRedirect - Estado actual:', {
    loading,
    isAuthenticated,
    user: user ? {
      id: user.id,
      username: user.username,
      tipo_usuario: user.tipo_usuario,
      nombre_completo: user.nombre_completo
    } : null
  });

  if (loading) {
  if (import.meta.env.DEV) console.log('⏳ DashboardRedirect - Cargando...');
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
  if (import.meta.env.DEV) console.log('🚫 DashboardRedirect - No autenticado, redirigiendo a login');
    return <Navigate to="/login" replace />;
  }

  const userType = user?.tipo_usuario;
  if (import.meta.env.DEV) console.log(`🎯 DashboardRedirect - Redirigiendo usuario tipo "${userType}"`);

  switch (userType) {
    case 'admin':
  if (import.meta.env.DEV) console.log('👑 Redirigiendo a /admin');
      return <Navigate to="/admin" replace />;
    case 'revendedor':
  if (import.meta.env.DEV) console.log('🏢 Redirigiendo a /revendedor');
      return <Navigate to="/revendedor" replace />;
    case 'trabajador':
  if (import.meta.env.DEV) console.log('🔧 Redirigiendo a /trabajador');
      return <Navigate to="/trabajador" replace />;
    default:
  if (import.meta.env.DEV) console.log(`❓ Tipo de usuario desconocido: "${userType}", redirigiendo a login`);
      return <Navigate to="/login" replace />;
  }
};

// Página de no autorizado
const UnauthorizedPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso No Autorizado</h2>
        <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
      </div>
      <button
        onClick={() => window.history.back()}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        Volver
      </button>
    </div>
  </div>
);

// Componente para manejar login y redirección
const LoginHandler = ({ onLogin }) => {
  const { login } = useAuth();

  const handleLogin = async (userData) => {
    const result = await login(userData);
    if (result.success && onLogin) {
      onLogin(result.user);
    }
    return result;
  };

  return <LoginForm onLogin={handleLogin} />;
};

// Componente interno que usa los contextos
const AppContent = () => {
  return (
    <AppWrapper>
      <Routes>
        {/* Ruta pública de login */}
        <Route path="/login" element={<LoginHandler />} />
        
        {/* Ruta de redirección inicial */}
        <Route path="/" element={<DashboardRedirect />} />
        
        {/* Rutas protegidas por tipo de usuario */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminWrapper />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/revendedor/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'revendedor']}>
              <RevendedorWrapper />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/trabajador/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'trabajador']}>
              <TrabajadorWrapper />
            </ProtectedRoute>
          }
        />
        
        {/* Página de no autorizado */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* Ruta de fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppWrapper>
  );
};

// Componente principal del Router
const AppRouter = () => {
  return (
    <Router>
      <AuthProvider>
        <UsersProvider>
          <FichasProvider>
            <AppContent />
          </FichasProvider>
        </UsersProvider>
      </AuthProvider>
    </Router>
  );
};

export default AppRouter;
