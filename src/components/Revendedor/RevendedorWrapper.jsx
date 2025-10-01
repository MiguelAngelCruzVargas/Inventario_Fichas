// RevendedorWrapper.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useFichas } from '@context/FichasContext';
import VistaRevendedor from './VistaRevendedor';

const RevendedorWrapper = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fichasContext = useFichas();

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Prepare props for VistaRevendedor
  const props = {
    revendedores: fichasContext.revendedores || [],
    currentUser: user,
    corteCaja: fichasContext.corteCaja || { resumenPorRevendedor: [] },
    historialCortes: fichasContext.historialCortes || [], // Agregar historial de cortes
    tareasMantenimiento: fichasContext.tareasMantenimiento || [],
    loading: fichasContext.loading, // Pasar el estado de loading
    onLogout: handleLogout
  };

  return <VistaRevendedor {...props} />;
};

export default RevendedorWrapper;
