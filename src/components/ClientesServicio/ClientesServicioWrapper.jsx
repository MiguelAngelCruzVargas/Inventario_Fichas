// ClientesServicioWrapper.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import VistaClientesServicio from './VistaClientesServicio';

const ClientesServicioWrapper = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <VistaClientesServicio currentUser={user} onLogout={handleLogout} />
  );
};

export default ClientesServicioWrapper;
