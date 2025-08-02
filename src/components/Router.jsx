import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Componentes de páginas
import LoginForm from '../components/LoginForm';
import AdminWrapper from '../components/Admin/AdminWrapper';
import Dashboard from '../components/Admin/Dashboard';
import Entregas from '../components/Admin/Entregas';
import Reportes from '../components/Admin/Reportes';
import Tareas from '../components/Admin/Tareas';
import CorteCaja from '../components/Admin/CorteCaja';
import RevendedorWrapper from '../components/Revendedor/RevendedorWrapper';
import VistaRevendedor from '../components/Revendedor/VistaRevendedor';
import TrabajadorWrapper from '../components/Trabajador/TrabajadorWrapper';
import VistaTrabajador from '../components/Trabajador/VistaTrabajador';

// Componente para rutas protegidas
function ProtectedRoute({ children, requiredRoles = [], redirectTo = "/login" }) {
  const { isAuthenticated, user, canAccessRoute } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user?.tipo_usuario)) {
    // Redirigir al dashboard apropiado según el rol
    const redirectMap = {
      admin: '/admin',
      revendedor: '/revendedor',
      trabajador: '/trabajador'
    };
    return <Navigate to={redirectMap[user.tipo_usuario] || '/'} replace />;
  }

  return children;
}

// Componente para rutas públicas (solo accesibles si NO está autenticado)
function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    // Redirigir al dashboard apropiado según el rol
    const redirectMap = {
      admin: '/admin',
      revendedor: '/revendedor',
      trabajador: '/trabajador'
    };
    return <Navigate to={redirectMap[user.tipo_usuario] || '/'} replace />;
  }

  return children;
}

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}

// Componente principal del router
export function AppRouter() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        {/* Ruta raíz - redirige según autenticación */}
        <Route path="/" element={<RootRedirect />} />

        {/* Rutas públicas */}
        <Route path="/login" element={
          <PublicRoute>
            <LoginForm />
          </PublicRoute>
        } />

        {/* Rutas de Admin */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRoles={['admin']}>
            <AdminWrapper />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="entregas" element={<Entregas />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="tareas" element={<Tareas />} />
          <Route path="corte-caja" element={<CorteCaja />} />
        </Route>

        {/* Rutas de Revendedor */}
        <Route path="/revendedor" element={
          <ProtectedRoute requiredRoles={['admin', 'revendedor']}>
            <RevendedorWrapper />
          </ProtectedRoute>
        }>
          <Route index element={<VistaRevendedor />} />
          <Route path="vista" element={<VistaRevendedor />} />
        </Route>

        {/* Rutas de Trabajador */}
        <Route path="/trabajador" element={
          <ProtectedRoute requiredRoles={['admin', 'trabajador']}>
            <TrabajadorWrapper />
          </ProtectedRoute>
        }>
          <Route index element={<VistaTrabajador />} />
          <Route path="vista" element={<VistaTrabajador />} />
        </Route>

        {/* Ruta 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

// Componente para redirigir desde la raíz
function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirigir según el rol del usuario
  const redirectMap = {
    admin: '/admin',
    revendedor: '/revendedor',
    trabajador: '/trabajador'
  };

  return <Navigate to={redirectMap[user.tipo_usuario] || '/login'} replace />;
}

// Página 404
function NotFound() {
  const { isAuthenticated, user } = useAuth();

  const getHomeLink = () => {
    if (!isAuthenticated) return '/login';
    
    const redirectMap = {
      admin: '/admin',
      revendedor: '/revendedor',
      trabajador: '/trabajador'
    };
    
    return redirectMap[user.tipo_usuario] || '/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="mt-4 text-xl text-gray-600">Página no encontrada</p>
        <p className="mt-2 text-gray-500">La página que buscas no existe.</p>
        <div className="mt-6">
          <a
            href={getHomeLink()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
