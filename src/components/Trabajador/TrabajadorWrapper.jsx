// TrabajadorWrapper.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFichas } from '../../context/FichasContext';
import VistaTrabajador from './VistaTrabajador';

const TrabajadorWrapper = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fichasContext = useFichas();

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Prepare props for VistaTrabajador - solo necesitamos datos básicos
  const props = {
    revendedores: fichasContext.revendedores || [],
    currentUser: user,
    onLogout: handleLogout
  };

  return <VistaTrabajador {...props} />;
};

export default TrabajadorWrapper;
