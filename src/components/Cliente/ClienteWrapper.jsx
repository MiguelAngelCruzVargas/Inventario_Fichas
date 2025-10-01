import React from 'react';
import { Link, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import MiServicio from './MiServicio';
import MisTareas from './MisTareas';

const NavTab = ({ to, label }) => {
  const location = useLocation();
  const active = location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border'}`}
    >
      {label}
    </Link>
  );
};

const ClienteWrapper = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Portal del Cliente</h1>
            <div className="text-sm text-gray-600">
              {user?.nombre_completo || user?.username || ''}
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <NavTab to="/cliente/servicio" label="Mi Servicio" />
            <NavTab to="/cliente/tareas" label="Mis Tareas" />
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
            >
              Cerrar sesión
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <Routes>
          <Route path="servicio" element={<MiServicio />} />
          <Route path="tareas" element={<MisTareas />} />
          <Route path="*" element={<Navigate to="/cliente/servicio" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default ClienteWrapper;
